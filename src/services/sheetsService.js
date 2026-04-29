const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const Sheets = require('../models/Sheets');
const Batch = require('../models/Batch');
const Section = require('../models/Section');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const User = require('../models/User'); // Added for student user creation
const { parseTabularData } = require('../utils/excelHandler');

// Load service account credentials
const keysPath = path.join(__dirname, '../utils/keys.json');
const keys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));

// Initialize Google Auth
const auth = new google.auth.GoogleAuth({
  credentials: keys,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
const sheetsAPI = google.sheets({ version: 'v4', auth });
const serviceAccountEmail = keys.client_email || 'service account';

function handleSheetsApiError(error, action) {
  const message = error?.response?.data?.error?.message || error.message;
  if (error?.response?.status === 403 || /permission/i.test(message)) {
    throw new Error(
      `Google Sheets permission denied while ${action}. Share the spreadsheet with the service account: ${serviceAccountEmail}`
    );
  }
  throw error;
}

/**
 * Extract spreadsheet ID from URL
 */
function extractSheetId(url) {
  const patterns = [
    /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
    /sheetId=([a-zA-Z0-9-_]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return url;
}

/**
 * Parse Google Sheet values (2D array) the same way as parseExcelFile
 * Expects same layout as the uploaded Excel attendance sheet
 */
/**
 * Link a new Google Sheet (single-sheet format, same as Excel upload)
 */
exports.linkSheet = async (sheetUrl, batchId, sectionId) => {
  const sheetId = extractSheetId(sheetUrl);

  // Verify batch and section exist
  const batch = await Batch.findByPk(batchId);
  const section = await Section.findByPk(sectionId);
  if (!batch) throw new Error('Batch not found');
  if (!section) throw new Error('Section not found');

  // Fetch spreadsheet metadata to verify it exists and is accessible
  let sheetInfo;
  try {
    sheetInfo = await sheetsAPI.spreadsheets.get({ spreadsheetId: sheetId });
  } catch (error) {
    handleSheetsApiError(error, 'verifying spreadsheet access');
  }
  const sheetName = sheetInfo.data.properties.title;

  // No multi-tab validation; treat as single-sheet attendance format

  // Create or update sheet record
  const [sheet, created] = await Sheets.findOrCreate({
    where: { sheetId },
    defaults: {
      sheetName,
      sheetId,
      batchId,
      sectionId,
      status: 'inactive',
    },
  });

  if (!created) {
    await sheet.update({ batchId, sectionId, sheetName });
  }

  return sheet;
};

/**
 * Get sheets with optional filters
 */
exports.getSheets = async ({ batchId, sectionId, status } = {}) => {
  const where = {};
  if (batchId) where.batchId = batchId;
  if (sectionId) where.sectionId = sectionId;
  if (status) where.status = status;

  return await Sheets.findAll({
    where,
    include: [Batch, Section],
    order: [['createdAt', 'DESC']],
  });
};

/**
 * Toggle sheet active/inactive status
 */
exports.toggleSheetStatus = async (sheetId) => {
  const sheet = await Sheets.findByPk(sheetId);
  if (!sheet) throw new Error('Sheet not found');

  const newStatus = sheet.status === 'active' ? 'inactive' : 'active';
  await sheet.update({ status: newStatus });
  return sheet;
};

/**
 * Sync a sheet: fetch data from Google Sheets and process like Excel upload
 */
exports.syncSheet = async (sheetId) => {
  const sheet = await Sheets.findByPk(sheetId);
  if (!sheet) throw new Error('Sheet not found');

  try {
    console.log('SYNC STARTED');
    // Update last attempted sync time
    await sheet.update({ lastAttemptedSyncTime: new Date() });

    // Fetch the first worksheet name and safe range quoting
    let sheetInfo;
    try {
      sheetInfo = await sheetsAPI.spreadsheets.get({ spreadsheetId: sheet.sheetId });
    } catch (error) {
      handleSheetsApiError(error, 'fetching spreadsheet metadata');
    }
    const firstSheetTitle = sheetInfo.data.sheets[0].properties.title;
    const quotedSheetTitle = `'${firstSheetTitle.replace(/'/g, "''")}'`;

    console.log('SYNC STARTED: Fetching Google Sheets data for sheetId:', sheet.sheetId);
    console.log('SYNC STARTED: Using sheet title:', firstSheetTitle);
    const range = `${quotedSheetTitle}!A:Z`;
    console.log('SYNC STARTED: Using range:', range);

    let res;
    try {
      res = await sheetsAPI.spreadsheets.values.get({
        spreadsheetId: sheet.sheetId,
        range,
      });
    } catch (error) {
      handleSheetsApiError(error, 'reading spreadsheet values');
    }

    console.log('SYNC STARTED: Raw Sheets API response keys:', Object.keys(res.data));
    console.log('Fetching Google Sheets data');
    const values = res.data.values || [];
    console.log('Rows fetched:', values.length);
    if (values.length === 0) throw new Error('No data in sheet');

    console.log('Parsing started');
    const records = parseTabularData(values);
    console.log('Parsing complete, records extracted:', records.length);
    if (records.length > 0) {
      console.log('Parsing first record:', records[0]);
    }

    console.log('DB write started');
    const result = { success: 0, failed: 0, errors: [] };

    for (const record of records) {
      try {
        // Create or find student, linking to the section defined on the sheet
        const [student, studentCreated] = await Student.findOrCreate({
          where: { email: record.email },
          defaults: {
            name: record.studentName,
            sectionId: sheet.sectionId,
          },
        });

        if (studentCreated) {
          console.log('Creating student:', record.email, record.studentName);
        } else {
          console.log('Skipping duplicate student, existing email:', record.email);
        }

        if (student.sectionId !== sheet.sectionId) {
          console.log('Linking student to section:', sheet.sectionId, 'for', record.email);
          await student.update({ sectionId: sheet.sectionId });
        }

        const [subject, subjectCreated] = await Subject.findOrCreate({
          where: { subjectCode: record.subjectCode },
          defaults: { subjectName: record.subjectCode },
        });

        if (subjectCreated) {
          console.log('Creating subject:', record.subjectCode);
        } else {
          console.log('Subject already exists:', record.subjectCode);
        }

        const existingUser = await User.findOne({ where: { email: record.email } });
        if (!existingUser) {
          console.log('Creating user account for student:', record.email);
          await User.create({
            email: record.email,
            password: 'student@123', // will be hashed by model hook
            role: 'STUDENT',
            isActive: true,
          });
        }

        console.log('Updating attendance for', record.email, record.subjectCode, record.date.toISOString().split('T')[0], record.status);
        await Attendance.upsert({
          studentId: student.id,
          subjectId: subject.id,
          date: record.date,
          status: record.status,
        });

        result.success++;
      } catch (err) {
        console.error('Attendance record failed:', record, err.message);
        result.failed++;
        result.errors.push({ studentName: record.studentName, error: err.message });
      }
    }

    console.log('Students processed:', result.success + result.failed);
    console.log('SYNC COMPLETED for sheetId:', sheet.id, 'success:', result.success, 'failed:', result.failed);

    // Update last successful sync time
    await sheet.update({ lastSuccessfulSyncTime: new Date() });
    return { success: true, sheetId: sheet.id, processed: result };
  } catch (error) {
    // Log error and keep attempted sync time
    await sheet.update({ lastAttemptedSyncTime: new Date() });
    throw error;
  }
};

/**
 * Get sheet by ID
 */
exports.getSheetById = async (sheetId) => {
  return await Sheets.findByPk(sheetId);
};

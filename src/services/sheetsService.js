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

// Load service account credentials
const keysPath = path.join(__dirname, '../utils/keys.json');
const keys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));

// Initialize Google Auth
const auth = new google.auth.GoogleAuth({
  credentials: keys,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
const sheetsAPI = google.sheets({ version: 'v4', auth });

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
function parseGoogleSheetValues(values) {
  const result = [];
  // Extract subject code from row 2 (index 2)
  let subjectCode = 'UNKNOWN';
  if (values[2] && values[2][0]) {
    const match = values[2][0].toString().match(/Subject Code\s*:\s*(\S+)/i);
    if (match) subjectCode = match[1];
  }

  // Date row (row 6, index 6)
  const dateRow = values[6] || [];

  // Process student rows starting at row 7 (index 7)
  for (let i = 7; i < values.length; i++) {
    const row = values[i];
    if (!row || !row[2] || !row[3]) continue;
    const studentName = row[2];
    const email = row[3];
    for (let j = 4; j < row.length; j++) {
      const status = row[j];
      const dateValue = dateRow[j];
      if (!status || !dateValue) continue;
      // Normalize status
      let normalizedStatus = 'Unknown';
      const statusStr = status.toString().toLowerCase();
      if (statusStr.includes('present')) normalizedStatus = 'Present';
      else if (statusStr.includes('absent')) normalizedStatus = 'Absent';
      else if (statusStr.includes('late')) normalizedStatus = 'Late';
      // Convert date
      let date;
      if (typeof dateValue === 'number') {
        date = new Date((dateValue - 25569) * 86400 * 1000);
      } else {
        date = new Date(dateValue);
      }
      result.push({ studentName, email, subjectCode, date, status: normalizedStatus });
    }
  }
  return result;
}

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
  const sheetInfo = await sheetsAPI.spreadsheets.get({ spreadsheetId: sheetId });
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
    // Update last attempted sync time
    await sheet.update({ lastAttemptedSyncTime: new Date() });

    // Fetch the first worksheet name
    const sheetInfo = await sheetsAPI.spreadsheets.get({ spreadsheetId: sheet.sheetId });
    const firstSheetTitle = sheetInfo.data.sheets[0].properties.title;

    // Pull all values from that sheet
    const res = await sheetsAPI.spreadsheets.values.get({
      spreadsheetId: sheet.sheetId,
      range: `${firstSheetTitle}!A:Z`,
    });
    const values = res.data.values || [];
    if (values.length === 0) throw new Error('No data in sheet');

    // Parse values using same logic as Excel handler
    const records = parseGoogleSheetValues(values);

    const result = { success: 0, failed: 0, errors: [] };

    for (const record of records) {
      try {
        // Create or find student, linking to the section defined on the sheet
        const [student] = await Student.findOrCreate({
          where: { email: record.email },
          defaults: {
            name: record.studentName,
            sectionId: sheet.sectionId,
          },
        });
        // Ensure the student is attached to the correct section (idempotent)
        if (student.sectionId !== sheet.sectionId) {
          await student.update({ sectionId: sheet.sectionId });
        }

        // Create a corresponding user account if it doesn't exist
        const existingUser = await User.findOne({ where: { email: record.email } });
        if (!existingUser) {
          await User.create({
            email: record.email,
            password: 'student@123', // will be hashed by model hook
            role: 'STUDENT',
            isActive: true,
          });
        }

        // Subject handling (subjectCode from sheet)
        const [subject] = await Subject.findOrCreate({
          where: { subjectCode: record.subjectCode },
          defaults: { subjectName: record.subjectCode },
        });

        // Attendance upsert
        await Attendance.upsert({
          studentId: student.id,
          subjectId: subject.id,
          date: record.date,
          status: record.status,
        });

        result.success++;
      } catch (err) {
        result.failed++;
        result.errors.push({ studentName: record.studentName, error: err.message });
      }
    }

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

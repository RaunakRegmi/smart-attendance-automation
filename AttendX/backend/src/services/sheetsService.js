const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const sequelize = require('../config/database');
const Sheets = require('../models/Sheets');
const Batch = require('../models/Batch');
const Section = require('../models/Section');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Lecturer = require('../models/Lecturer');
const { parseTabularData } = require('../utils/excelHandler');
const SyncJob = require('../models/SyncJob');
const NotificationService = require('./notificationService');
const crypto = require('crypto');
const sheetSyncQueue = require('../queues/sheetSyncQueue');

// No dedicated Log model; logging will be done via console and SyncJob entries

// Load service account credentials
const keysPath = path.join(__dirname, '../utils/keys.json');
const keys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));

const auth = new google.auth.GoogleAuth({
  credentials: keys,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheetsAPI = google.sheets({ version: 'v4', auth });
const serviceAccountEmail = keys.client_email || 'service account';

// Global reference for sync service (to be initialized)
let syncService = null;

/**
 * Initialize the sync service and start scheduling
 * @param {object} schedulerServiceInstance Instance of SchedulerService
 */
async function init(schedulerInstance) {
  syncService = schedulerInstance;
  return new Promise((resolve) => {
    syncService.start();
    resolve();
  });
}

/**
 * Helper function to generate a unique job ID
 */
function generateJobId() {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Sheet sync handler with enhanced capabilities
 * @param {string} sheetId - Sheet ID to sync
 * @param {string} syncType - 'AUTO' or 'MANUAL'
 * @param {string} syncJobId - Existing job ID for continuation
 * @param {Date} lastSyncedDate - Last synced date for incremental sync
 * @param {number} retryCount - Number of retries attempted
 * @param {Date} syncScheduleTime - When this job was scheduled (for AUTO)
 */
async function syncSheet(sheetId, syncType = 'AUTO', syncJobId = null, lastSyncedDate = null, retryCount = 0, syncScheduleTime = new Date()) {
  const jobId = syncJobId || generateJobId();
  let sheet;
  try {
    // Fetch sheet
    sheet = await Sheets.findByPk(sheetId);
    if (!sheet) throw new Error('Sheet not found');
    // Skip inactive sheets
    if (sheet.status !== 'active') {
      console.log(`Sheet ${sheetId} is ${sheet.status}, skipping sync`);
      if (syncJobId) {
        await SyncJob.update({
          status: 'SKIPPED',
          endTime: new Date(),
          failureDetails: `Sheet status is ${sheet.status}`,
          jobId
        }, { where: { id: syncJobId } });
      }
      throw new Error(`Sheet ${sheetId} is not active`);
    }

    // Ensure a sync job record exists
    let syncJob;
    if (syncJobId) {
      syncJob = await SyncJob.findByPk(syncJobId);
    }
    if (!syncJob) {
      syncJob = await SyncJob.create({
        sheetId: sheet.id,
        syncType,
        scheduledTime: syncScheduleTime,
        jobId,
        startTime: new Date(),
        status: 'RUNNING',
        retryCount,
        jobData: { sheetId, syncType }
      });
    } else {
      await syncJob.update({ status: 'RUNNING', startTime: new Date(), lastAttemptTime: new Date(), retryCount });
    }

    // Fetch sheet metadata and values
    const sheetInfo = await sheetsAPI.spreadsheets.get({ spreadsheetId: sheet.sheetId });
    const firstSheetTitle = sheetInfo.data.sheets[0].properties.title;
    const quotedSheetTitle = `'${firstSheetTitle.replace(/'/g, "''")}'`;
    console.log('SYNC STARTED: Fetching Google Sheets data for sheetId:', sheetId);
    const res = await sheetsAPI.spreadsheets.values.get({
      spreadsheetId: sheet.sheetId,
      range: `${quotedSheetTitle}!A:AL`,
    });
    const values = res.data.values || [];
    if (values.length === 0) throw new Error('No data in sheet');

    // Parse records
    const allRecords = parseTabularData(values);

    // Incremental sync
    let records = allRecords;
    if (lastSyncedDate) {
      const lastSync = new Date(lastSyncedDate);
      records = allRecords.filter(r => r.date && new Date(r.date) > lastSync);
    }
    if (records.length === 0) {
      const isFirstSync = !lastSyncedDate;
      const msg = isFirstSync
        ? 'This sheet does not match the expected attendance format. Ensure the sheet has columns: Student Name, Email (Gmail), Subject Code, Date, and Attendance status (flat layout) OR the Subject Code / Lecturer / Date structure (legacy layout).'
        : `No new attendance records since last sync (${lastSyncedDate}).`;
      console.log(msg);
      await syncJob.update({ status: 'SKIPPED', endTime: new Date(), failureDetails: msg });
      throw new Error(msg);
    }

    // Process each record individually (no outer transaction)
    const result = { success: 0, failed: 0, errors: [] };
    for (const record of records) {
      try {
        // Step 1: Create or find student
        const [student] = await Student.findOrCreate({
          where: { email: record.email },
          defaults: { name: record.studentName, sectionId: sheet.sectionId, batchId: sheet.batchId }
        });
        if (student.sectionId !== sheet.sectionId) {
          await student.update({ sectionId: sheet.sectionId });
        }
        if (student.batchId !== sheet.batchId) {
          await student.update({ batchId: sheet.batchId });
        }

        // Step 2: Ensure subject exists (with subject title and lecturer)
        const subjectName = record.subjectTitle || record.subjectCode;
        const [subject] = await Subject.findOrCreate({
          where: { subjectCode: record.subjectCode },
          defaults: { subjectName }
        });
        if (subject.subjectName !== subjectName) {
          await subject.update({ subjectName });
        }

        // Step 2b: Ensure lecturer exists and link to subject
        if (record.lecturer) {
          const [lecturer] = await Lecturer.findOrCreate({
            where: { name: record.lecturer },
            defaults: { name: record.lecturer }
          });
          if (subject.lecturerId !== lecturer.id) {
            await subject.update({ lecturerId: lecturer.id });
          }
        }

        // Step 3: Create or find user account for student
        let user = await User.findOne({ where: { email: record.email } });
        if (!user) {
          try {
            user = await User.create({
              email: record.email,
              password: 'student@123',  // Will be hashed by bcrypt hook
              role: 'STUDENT',
              isActive: true
            });
            console.log(`Created User account for student ${record.email} (userId: ${user.id})`);
          } catch (userCreateErr) {
            // Handle potential duplicate key error if user was created by another process
            if (userCreateErr.name === 'SequelizeUniqueConstraintError') {
              user = await User.findOne({ where: { email: record.email } });
              console.log(`User already exists for email ${record.email} (userId: ${user?.id})`);
            } else {
              throw new Error(`Failed to create user for ${record.email}: ${userCreateErr.message}`);
            }
          }
        }

        // Step 4: Link student to user if not already linked
        if (user && user.id) {
          if (!student.userId) {
            await student.update({ userId: user.id });
            console.log(`Linked student ${student.id} to user ${user.id}`);
          }
        } else {
          throw new Error(`Failed to create/find user account for student ${record.email}. Student is not associated to User!`);
        }

        // Step 5: Record attendance
        await Attendance.upsert({
          studentId: student.id,
          subjectId: subject.id,
          date: record.date,
          status: record.status,
          sheetId: sheet.id,
        });
        result.success++;
      } catch (recErr) {
        console.error('Attendance record failed:', record, recErr.message);
        result.failed++;
        result.errors.push({ studentName: record.studentName, email: record.email, error: recErr.message });
      }
    }

    // Determine final status
    const finalStatus = result.failed === 0 ? 'SUCCESS' : 'FAILED';
    const endTime = new Date();
    const failureDetails = result.failed ? JSON.stringify(result.errors) : null;
    await syncJob.update({
      status: finalStatus,
      endTime,
      successCount: result.success,
      errorCount: result.failed,
      failureDetails
    });
    if (finalStatus === 'SUCCESS') {
      await sheet.update({ lastSuccessfulSyncTime: new Date() });
    }
    console.log(`Sync job ${syncJob.id} completed: ${finalStatus}`);
    return { success: true, sheetId: sheet.id, processed: result, syncJobId: syncJob.id, jobId };
  } catch (error) {
    console.error(`Error in syncSheet for sheetId ${sheetId}:`, error);
    // Update SyncJob as FAILED
    if (syncJobId) {
      await SyncJob.update({
        status: 'FAILED',
        endTime: new Date(),
        retryCount: retryCount + 1,
        errorDetails: error.message,
        failureDetails: error.stack
      }, { where: { id: syncJobId } });
    }
    // Re-queue if retries left
    if (syncJobId && retryCount < 2) {
      console.log(`Re-queueing job ${syncJobId} for retry ${retryCount + 1}`);
      await sheetSyncQueue.add('sheet-sync', {
        sheetId,
        syncJobId,
        syncType,
        retryCount: retryCount + 1
      });
    }
    throw error;
  }
}

/**
 * Handle Google Sheets API errors
 */
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
 * Link a new Google Sheet by URL
 */
async function linkSheet(url, batchId, sectionId) {
  try {
    const googleSheetId = extractSheetId(url);

    // Verify we can access the sheet and fetch its title
    let sheetTitle = url;
    try {
      const sheetInfo = await sheetsAPI.spreadsheets.get({ spreadsheetId: googleSheetId });
      sheetTitle = sheetInfo.data.properties?.title || url;
    } catch (error) {
      handleSheetsApiError(error, 'accessing the spreadsheet');
    }

    // CHECK FOR DUPLICATE: Verify sheet doesn't already exist in system
    const existingSheet = await Sheets.findOne({
      where: { sheetId: googleSheetId }
    });

    if (existingSheet) {
      throw new Error(`Sheet already exists in system. Google Sheets ID: ${googleSheetId} is already linked to Batch: ${existingSheet.batchId}, Section: ${existingSheet.sectionId}`);
    }

    // Create the sheet record
    const sheet = await Sheets.create({
      sheetId: googleSheetId,
      sheetName: sheetTitle,
      batchId,
      sectionId,
      status: 'active'
    });

    console.log(`Sheet created successfully: ${sheet.id} for Google Sheets ID: ${googleSheetId}`);

    // FIRST-TIME SYNC: For new sheets, fetch and sync data immediately (real-time)
    // No background job is created - sync happens synchronously
    try {
      console.log('SYNC STARTED: Performing first-time sync for new sheet:', sheet.id);
      const syncResult = await syncSheet(sheet.id, 'AUTO');
      console.log('SYNC COMPLETE: First-time sync successful for sheet:', sheet.id, 'Result:', syncResult);

      return {
        success: true,
        id: sheet.id,
        sheetId: sheet.sheetId,
        sheetName: sheet.sheetName,
        batchId: sheet.batchId,
        sectionId: sheet.sectionId,
        status: sheet.status,
        message: 'Sheet added and initial data synced successfully',
        syncStatus: 'COMPLETED',
        syncResult: syncResult
      };
    } catch (syncError) {
      console.error('First-time sync failed for sheet:', sheet.id, 'Error:', syncError.message);
      await sheet.destroy();
      throw new Error(`Format validation failed: ${syncError.message}`);
    }
  } catch (error) {
    throw new Error(`Failed to link sheet: ${error.message}`);
  }
}

/**
 * Get sheets with optional filtering
 */
async function getSheets(filters = {}) {
  try {
    const where = {};
    if (filters.batchId) where.batchId = filters.batchId;
    if (filters.sectionId) where.sectionId = filters.sectionId;
    if (filters.status) where.status = filters.status;

    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.min(120, Math.max(1, parseInt(filters.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const { rows, count } = await Sheets.findAndCountAll({
      where,
      include: [
        { model: Batch, attributes: ['id', 'name'] },
        { model: Section, attributes: ['id', 'name'] }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    return {
      success: true,
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  } catch (error) {
    throw new Error(`Failed to fetch sheets: ${error.message}`);
  }
}

/**
 * Toggle sheet status (active/inactive)
 */
async function toggleSheetStatus(sheetId) {
  try {
    const sheet = await Sheets.findByPk(sheetId);
    if (!sheet) {
      throw new Error('Sheet not found');
    }

    const newStatus = sheet.status === 'active' ? 'inactive' : 'active';
    await sheet.update({ status: newStatus });

    return {
      success: true,
      id: sheet.id,
      status: newStatus,
      message: `Sheet status changed to ${newStatus}`
    };
  } catch (error) {
    throw new Error(`Failed to toggle sheet status: ${error.message}`);
  }
}

async function appendStudentToSheets(student) {
  const { name, email, batchId, sectionId } = student;
  if (!batchId || !sectionId) return { success: true, skipped: true, reason: 'Student has no batch/section' };

  const sheets = await Sheets.findAll({
    where: { batchId, sectionId, status: 'active' }
  });

  if (sheets.length === 0) return { success: true, skipped: true, reason: 'No active sheets for this batch/section' };

  let appended = 0;
  let skipped = 0;

  for (const sheet of sheets) {
    try {
      const sheetInfo = await sheetsAPI.spreadsheets.get({ spreadsheetId: sheet.sheetId });
      const firstSheetTitle = sheetInfo.data.sheets[0].properties.title;
      const sheetInternalId = sheetInfo.data.sheets[0].properties.sheetId;
      const quotedSheetTitle = `'${firstSheetTitle.replace(/'/g, "''")}'`;

      const res = await sheetsAPI.spreadsheets.values.get({
        spreadsheetId: sheet.sheetId,
        range: `${quotedSheetTitle}!A:AL`,
      });

      const values = res.data.values || [];
      if (values.length === 0) continue;

      const firstRow = values[0].map((c) => (c == null ? '' : c.toString().trim().toLowerCase()));
      const hasFlatHeader = firstRow.includes('student name') && firstRow.includes('email (gmail)');

      if (hasFlatHeader) {
        const nameColIndex = firstRow.indexOf('student name');
        const emailColIndex = firstRow.indexOf('email (gmail)');
        if (nameColIndex === -1 || emailColIndex === -1) { skipped++; continue; }

        // Data rows start at index 1 (after header). Find last data row.
        let lastDataIdx = values.length - 1;
        for (let i = 1; i < values.length; i++) {
          const r = values[i];
          const nm = r && r[nameColIndex] ? r[nameColIndex].toString().trim() : '';
          const em = r && r[emailColIndex] ? r[emailColIndex].toString().trim() : '';
          if (!nm && !em) { lastDataIdx = i - 1; break; }
        }
        if (lastDataIdx < 1) { skipped++; continue; }

        // Duplicate check within data rows only
        const emailExists = values.slice(1, lastDataIdx + 1).some((row) => {
          const cell = row[emailColIndex];
          return cell && cell.toString().trim().toLowerCase() === email.toLowerCase();
        });
        if (emailExists) { skipped++; continue; }

        const newRow = new Array(firstRow.length).fill('');
        newRow[nameColIndex] = name;
        newRow[emailColIndex] = email;

        // Insert row before any summary/counter rows (position lastDataIdx + 1, 0-indexed)
        const insertAt = lastDataIdx + 1;
        await sheetsAPI.spreadsheets.batchUpdate({
          spreadsheetId: sheet.sheetId,
          requestBody: {
            requests: [{
              insertDimension: {
                range: { sheetId: sheetInternalId, startIndex: insertAt, endIndex: insertAt + 1, dimension: 'ROWS' },
                inheritFromBefore: true,
              }
            }]
          }
        });
        await sheetsAPI.spreadsheets.values.update({
          spreadsheetId: sheet.sheetId,
          range: `${quotedSheetTitle}!A${insertAt + 1}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [newRow] },
        });
        appended++;
      } else {
        // Legacy layout: metadata in rows 1-7, data starts at row 8 (index 7)
        // S.NO = col 0, Batch = col 1, Name = col 2, Email = col 3
        if (values.length < 8) { skipped++; continue; }

        const dataStartIndex = 7;
        const nameCol = 2;
        const emailCol = 3;

        // Find last data row (first row where S.NO or Name is empty)
        let lastDataIdx = values.length - 1;
        for (let i = dataStartIndex; i < values.length; i++) {
          const r = values[i];
          const sno = r && r[0] ? r[0].toString().trim() : '';
          const nm = r && r[nameCol] ? r[nameCol].toString().trim() : '';
          if (!sno || !nm) { lastDataIdx = i - 1; break; }
        }
        if (lastDataIdx < dataStartIndex) { skipped++; continue; }

        // Duplicate check within data rows only
        const emailExists = values.slice(dataStartIndex, lastDataIdx + 1).some((row) => {
          const cell = row[emailCol];
          return cell && cell.toString().trim().toLowerCase() === email.toLowerCase();
        });
        if (emailExists) { skipped++; continue; }

        // Auto-increment S.NO
        let maxSno = 0;
        values.slice(dataStartIndex, lastDataIdx + 1).forEach((row) => {
          if (row[0]) { const sno = parseInt(row[0], 10); if (!isNaN(sno) && sno > maxSno) maxSno = sno; }
        });

        const maxCols = values.slice(dataStartIndex, lastDataIdx + 1).reduce((max, row) => Math.max(max, row.length), 8);
        const batchName = (values[lastDataIdx] && values[lastDataIdx][1]) || '';

        const newRow = new Array(maxCols).fill('');
        newRow[0] = maxSno + 1;
        newRow[1] = batchName;
        newRow[nameCol] = name;
        newRow[emailCol] = email;

        // Insert row before any summary/counter rows (position lastDataIdx + 1, 0-indexed)
        const insertAt = lastDataIdx + 1;
        await sheetsAPI.spreadsheets.batchUpdate({
          spreadsheetId: sheet.sheetId,
          requestBody: {
            requests: [{
              insertDimension: {
                range: { sheetId: sheetInternalId, startIndex: insertAt, endIndex: insertAt + 1, dimension: 'ROWS' },
                inheritFromBefore: true,
              }
            }]
          }
        });
        await sheetsAPI.spreadsheets.values.update({
          spreadsheetId: sheet.sheetId,
          range: `${quotedSheetTitle}!A${insertAt + 1}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [newRow] },
        });
        appended++;
      }
    } catch (err) {
      console.error(`Failed to append student to sheet ${sheet.id}: ${err.message}`);
      skipped++;
    }
  }

  return { success: true, appended, skipped, total: sheets.length };
}

async function deleteSheet(sheetId) {
  const sheet = await Sheets.findByPk(sheetId);
  if (!sheet) throw new Error('Sheet not found');

  // Check blocking condition: attendance records reference this sheet
  const attendanceCount = await Attendance.count({ where: { sheetId: sheet.id } });
  if (attendanceCount > 0) {
    throw new Error(`Cannot delete sheet "${sheet.sheetName}" — ${attendanceCount} attendance record(s) reference it.` +
      ' Set the sheet to inactive instead, or remove the attendance records first.');
  }

  // Soft-delete: set status to inactive
  await sheet.update({ status: 'inactive' });
  return { success: true, message: 'Sheet deactivated successfully' };
}

module.exports = {
  init,
  syncSheet,
  extractSheetId,
  linkSheet,
  getSheets,
  toggleSheetStatus,
  deleteSheet,
  appendStudentToSheets,
  SyncJob // expose for worker updates
};
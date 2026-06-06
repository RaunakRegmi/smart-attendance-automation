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
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
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
      const msg = `Attendance already synced up to ${lastSyncedDate || 'never'}`;
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
          status: record.status
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
      // If first-time sync fails, still return the sheet but with error details
      console.error('WARNING: First-time sync failed for sheet:', sheet.id, 'Error:', syncError.message);
      return {
        success: true,
        id: sheet.id,
        sheetId: sheet.sheetId,
        sheetName: sheet.sheetName,
        batchId: sheet.batchId,
        sectionId: sheet.sectionId,
        status: sheet.status,
        message: 'Sheet added but initial sync failed',
        syncStatus: 'FAILED',
        syncError: syncError.message
      };
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

    const sheets = await Sheets.findAll({
      where,
      include: [
        { model: Batch, attributes: ['id', 'name'] },
        { model: Section, attributes: ['id', 'name'] }
      ]
    });

    return {
      success: true,
      data: sheets,
      count: sheets.length
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

async function deleteSheet(sheetId) {
  const sheet = await Sheets.findByPk(sheetId);
  if (!sheet) throw new Error('Sheet not found');
  await sheet.destroy();
  return { success: true, message: 'Sheet deleted successfully' };
}

module.exports = {
  init,
  syncSheet,
  extractSheetId,
  linkSheet,
  getSheets,
  toggleSheetStatus,
  deleteSheet,
  SyncJob // expose for worker updates
};
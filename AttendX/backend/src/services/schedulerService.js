const cron = require('node-cron');
const Sheets = require('../models/Sheets');
const SyncJob = require('../models/SyncJob');
const Setting = require('../models/Setting');
const sheetSyncQueue = require('../queues/sheetSyncQueue');
const { Op } = require('sequelize');
const moment = require('moment-timezone');
const weeklyReportService = require('./weeklyReportService');
const sequelize = require('../config/database');

const SYNC_TIME_KEY = 'scheduler_sync_time';

class SchedulerService {
  constructor() {
    this.job = null;
    this.weeklyReportJob = null;
    this.timezone = 'Asia/Kathmandu';
    this.syncTime = process.env.SYNC_TIME || '06:00'; // Default 06:00 Nepal Time
    // Friday 17:00 Nepal Time — end of class week.
    this.weeklyReportTime = process.env.WEEKLY_REPORT_TIME || '17:00';
    this.weeklyReportDay = parseInt(process.env.WEEKLY_REPORT_DAY ?? '5', 10); // 0=Sun..6=Sat
  }

  async loadSyncTime() {
    try {
      await sequelize.query(
        `CREATE TABLE IF NOT EXISTS "Settings" (
          "key" VARCHAR(255) NOT NULL PRIMARY KEY,
          "value" VARCHAR(255) NOT NULL,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )`
      );
      const setting = await Setting.findByPk(SYNC_TIME_KEY);
      if (setting) {
        this.syncTime = setting.value;
        console.log(`Loaded sync time from DB: ${this.syncTime}`);
      }
    } catch (err) {
      console.warn('Could not load sync time from DB, using default:', err.message);
    }
  }

  /**
   * Start the scheduler service
   */
  async start() {
    await this.loadSyncTime();
    // Parse the sync time (HH:MM format in Nepal Time)
    const [hours, minutes] = this.syncTime.split(':');

    // Convert Nepal Time to UTC for cron expression
    // Nepal Time is UTC+5:45
    const nepalTime = moment.tz(`${hours}:${minutes}`, 'HH:mm', this.timezone);
    const utcTime = nepalTime.utc();

    const cronExpression = `${utcTime.minute()} ${utcTime.hour()} * * *`;

    console.log(`Scheduler configured to run at ${this.syncTime} ${this.timezone} (${utcTime.format('HH:mm')} UTC)`);
    console.log(`Cron expression: ${cronExpression}`);

    // Schedule the job
    this.job = cron.schedule(cronExpression, async () => {
      try {
        await this.runScheduledSync();
      } catch (error) {
        console.error('Scheduler error:', error);
      }
    }, {
      timezone: 'UTC', // Cron uses UTC internally
      scheduled: true
    });

    this.job.start();
    console.log('Attendance sync scheduler started');

    // ── Weekly report job ────────────────────────────────────────
    const [whours, wminutes] = this.weeklyReportTime.split(':');
    const wNepal = moment.tz(`${whours}:${wminutes}`, 'HH:mm', this.timezone);
    const wUtc = wNepal.utc();
    const weeklyCron = `${wUtc.minute()} ${wUtc.hour()} * * ${this.weeklyReportDay}`;
    console.log(`Weekly report scheduled for ${this.weeklyReportTime} ${this.timezone} every day-of-week ${this.weeklyReportDay} (cron: ${weeklyCron})`);
    this.weeklyReportJob = cron.schedule(weeklyCron, async () => {
      try {
        console.log('Running weekly report generation…');
        const result = await weeklyReportService.generateAllWeeklyReports();
        console.log(`Weekly reports generated: ${result.generated} students (${result.weekStart} → ${result.weekEnd})`);
      } catch (err) {
        console.error('Weekly report generation failed:', err);
      }
    }, { timezone: 'UTC', scheduled: true });
    this.weeklyReportJob.start();
    console.log('Weekly report scheduler started');
  }

  /**
   * Stop the scheduler service
   */
  stop() {
    if (this.job) {
      this.job.stop();
      console.log('Attendance sync scheduler stopped');
    }
    if (this.weeklyReportJob) {
      this.weeklyReportJob.stop();
      console.log('Weekly report scheduler stopped');
    }
  }

  /**
   * Run scheduled sync for all active sheets
   */
  async runScheduledSync() {
    console.log('Running scheduled attendance sync...');

    try {
      // Find all active sheets
      const activeSheets = await Sheets.findAll({
        where: {
          status: 'active'
        }
      });

      if (activeSheets.length === 0) {
        console.log('No active sheets found for scheduled sync');
        return;
      }

      console.log(`Found ${activeSheets.length} active sheets for sync`);

      // Create sync job for each active sheet
      for (const sheet of activeSheets) {
        try {
          // Check if there's already a pending/running job for this sheet
          const existingJob = await SyncJob.findOne({
            where: {
              sheetId: sheet.id,
              status: {
                [Op.in]: ['PENDING', 'RUNNING']
              }
            }
          });

          if (existingJob) {
            console.log(`Skipping sheet ${sheet.id} - sync already in progress`);
            continue;
          }

          // Create new sync job
          const syncJob = await SyncJob.create({
            sheetId: sheet.id,
            syncType: 'AUTO',
            scheduledTime: new Date(),
            status: 'PENDING'
          });

          // Add to queue
          await sheetSyncQueue.add('sheet-sync', {
            sheetId: sheet.id,
            syncJobId: syncJob.id,
            syncType: 'AUTO'
          });

          console.log(`Created sync job ${syncJob.id} for sheet ${sheet.id}`);
        } catch (sheetError) {
          console.error(`Error creating sync job for sheet ${sheet.id}:`, sheetError);
        }
      }
    } catch (error) {
      console.error('Error in scheduled sync:', error);
    }
  }

  /**
   * Manually trigger sync for a specific sheet
   * @param {number} sheetId - Sheet ID to sync
   * @returns {Promise<Object>} Sync job details
   */
  async manualSync(sheetId) {
    console.log(`Triggering manual sync for sheet ${sheetId}`);

    // Verify sheet exists
    const sheet = await Sheets.findByPk(sheetId);
    if (!sheet) {
      throw new Error('Sheet not found');
    }

    try {
      // Check if there's already a pending/running job for this sheet
      const existingJob = await SyncJob.findOne({
        where: {
          sheetId,
          status: {
            [Op.in]: ['PENDING', 'RUNNING']
          }
        }
      });

      if (existingJob) {
        throw new Error('Sync already in progress for this sheet');
      }

      // Create new sync job
      const syncJob = await SyncJob.create({
        sheetId,
        syncType: 'MANUAL',
        scheduledTime: new Date(),
        status: 'PENDING'
      });

      // Add to queue
      await sheetSyncQueue.add('sheet-sync', {
        sheetId,
        syncJobId: syncJob.id,
        syncType: 'MANUAL'
      });

      console.log(`Created manual sync job ${syncJob.id} for sheet ${sheetId}`);
      return syncJob;
    } catch (error) {
      console.error(`Error creating manual sync job for sheet ${sheetId}:`, error);
      throw error;
    }
  }

  /**
   * Get scheduler status
   * @returns {Object} Scheduler status information
   */
  getStatus() {
    // node-cron v3 ScheduledTask has no nextDates() or .running — compute status safely
    let running = false;
    if (this.job && this.job._scheduler) {
      running = this.job._scheduler.timeout != null;
    }

    let nextRun = null;
    try {
      const [hours, minutes] = this.syncTime.split(':').map((part) => parseInt(part, 10));
      const now = moment.tz(this.timezone);
      let next = now.clone().hour(hours).minute(minutes).second(0).millisecond(0);
      if (next.isSameOrBefore(now)) {
        next.add(1, 'day');
      }
      nextRun = next.toISOString();
    } catch (_) {
      nextRun = null;
    }

    return {
      running,
      timezone: this.timezone,
      syncTime: this.syncTime,
      nextRun,
    };
  }

  /**
   * Set new sync time and restart the scheduler
   * @param {string} newSyncTime - New sync time in HH:MM format
   */
  async setSyncTime(newSyncTime) {
    try {
      // Validate time format
      if (!this.validateTimeFormat(newSyncTime)) {
        throw new Error('Invalid time format. Use HH:MM (24-hour format)');
      }

      await sequelize.query(
        `CREATE TABLE IF NOT EXISTS "Settings" (
          "key" VARCHAR(255) NOT NULL PRIMARY KEY,
          "value" VARCHAR(255) NOT NULL,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )`
      );
      await Setting.upsert({ key: SYNC_TIME_KEY, value: newSyncTime });

      // Store new configuration
      this.syncTime = newSyncTime;

      // Restart scheduler with new time
      this.stop();
      await this.start();

      console.log(`Sync time updated to ${newSyncTime}`);
      return { success: true, message: 'Sync time updated' };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate time format (HH:MM in 24-hour format)
   * @param {string} timeStr - Time string to validate
   * @returns {boolean} - True if valid format
   */
  validateTimeFormat(timeStr) {
    const pattern = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    return pattern.test(timeStr);
  }
}

module.exports = new SchedulerService();
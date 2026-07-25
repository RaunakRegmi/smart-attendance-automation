const schedule = require('node-schedule');
const { CronCreate } = require('./cronUtils');

class SyncScheduler {
  constructor() {
    this.jobs = new Map();
    this.initDailySync();
  }

  initDailySync() {
    // Schedule daily sync at 9:00 AM Nepal Time (UTC+5:45)
    const cronExp = '45 9 * * *'; // 9 AM Nepal Time = 3:15 PM UTC
    const job = schedule.scheduleJob(cronExp, () => this.runDailySync());
    this.jobs.set('daily', job);
  }

  async runDailySync() {
    console.log('Daily sync started at', new Date().toISOString());
    const sheets = this.getActiveSheets();

    for (const sheet of sheets) {
      try {
        await this.syncSheet(sheet);
      } catch (error) {
        this.logSyncError(sheet, error);
      }
    }

    console.log('Daily sync completed at', new Date().toISOString());
  }

  async syncSheet(sheet) {
    // Placeholder for actual sync logic
    console.log(`Syncing sheet: ${sheet.sheetName}`);
    // Implementation here
  }

  getActiveSheets() {
    const repository = require('./sheetRepository').default;
    return repository.filterSheets({ status: 'active' });
  }

  logSyncError(sheet, error) {
    const logger = require('./jobLogger');
    logger.logError({
      jobId: `sync-${sheet.sheetId}`,
      sheetId: sheet.sheetId,
      error: error.message,
      timestamp: new Date()
    });
  }
}

module.exports = new SyncScheduler();
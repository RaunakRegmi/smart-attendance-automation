const schedulerService = require('../services/schedulerService');
const SyncJob = require('../models/SyncJob');

/**
 * Trigger a manual sync for a given sheet.
 * Expects JSON body: { "sheetId": "<uuid>" }
 */
async function manualSync(req, res) {
  try {
    const { sheetId } = req.body;
    if (!sheetId) {
      return res.status(400).json({ success: false, message: 'Missing sheetId in request body' });
    }
    const syncJob = await schedulerService.manualSync(sheetId);
    return res.json({ success: true, message: `Manual sync job ${syncJob.id} created`, syncJobId: syncJob.id });
  } catch (err) {
    console.error('Manual sync error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Get a list of sync jobs.
 * Optional query params: sheetId, status (PENDING|RUNNING|SUCCESS|FAILED|SKIPPED)
 */
async function getStatus(req, res) {
  try {
    const { sheetId, status } = req.query;
    const where = {};
    if (sheetId) where.sheetId = sheetId;
    if (status) where.status = status;
    const jobs = await SyncJob.findAll({ where, order: [['createdAt', 'DESC']] });
    return res.json({ success: true, jobs });
  } catch (err) {
    console.error('Get sync status error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Get details for a specific sync job.
 * Accepts either a numeric sync job ID or a sheet UUID.
 */
async function getJob(req, res) {
  try {
    const { id } = req.params;
    let job;

    if (/^\d+$/.test(id)) {
      job = await SyncJob.findByPk(Number(id));
    } else {
      job = await SyncJob.findOne({
        where: { sheetId: id },
        order: [['createdAt', 'DESC']],
      });
    }

    if (!job) {
      return res.status(404).json({ success: false, message: 'Sync job not found' });
    }
    return res.json({ success: true, job });
  } catch (err) {
    console.error('Get sync job error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// Start the scheduler service
async function startScheduler(req, res) {
  try {
    await schedulerService.start();
    return res.json({ success: true, message: 'Scheduler started' });
  } catch (err) {
    console.error('Scheduler start error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// Stop the scheduler service
async function stopScheduler(req, res) {
  try {
    await schedulerService.stop();
    return res.json({ success: true, message: 'Scheduler stopped' });
  } catch (err) {
    console.error('Scheduler stop error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// Modify scheduler settings
async function modifyScheduler(req, res) {
  const { newSyncTime } = req.body;
  if (!newSyncTime) {
    return res.status(400).json({ success: false, message: 'Missing newSyncTime in request body' });
  }

  try {
    await schedulerService.setSyncTime(newSyncTime);
    return res.json({ success: true, message: 'Schedule modified successfully' });
  } catch (error) {
    console.error('Schedule modification error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  manualSync,
  getStatus,
  getJob,
  startScheduler,
  stopScheduler,
  modifyScheduler,
};
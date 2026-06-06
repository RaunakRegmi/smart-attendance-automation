const sheetsService = require('../services/sheetsService');

const sheetSyncQueue = require('../queues/sheetSyncQueue');

module.exports = {
  linkSheet: async (req, res) => {
    try {
      const { url, batchId, sectionId } = req.body;
      const result = await sheetsService.linkSheet(url, batchId, sectionId);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getSheets: async (req, res) => {
    try {
      const { batchId, sectionId, status } = req.query;
      const sheets = await sheetsService.getSheets({ batchId, sectionId, status });
      res.json(sheets);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  toggleSheetStatus: async (req, res) => {
    try {
      const sheetId = req.params.id || req.params.sheetId;
      const result = await sheetsService.toggleSheetStatus(sheetId);
      res.json(result);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  },

  deleteSheet: async (req, res) => {
    try {
      const result = await sheetsService.deleteSheet(req.params.id);
      res.json(result);
    } catch (error) {
      const status = error.message === 'Sheet not found' ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  },

  // Trigger background sync jobs (single or bulk)
  syncSheet: async (req, res) => {
    try {
      const { sheetId } = req.body; // optional single sheet ID

      // If a specific sheetId (DB PK) is provided, create a manual sync job and enqueue it
      if (sheetId) {
        // Create a SyncJob entry
        const syncJob = await sheetsService.SyncJob.create({
          sheetId,
          syncType: 'MANUAL',
          scheduledTime: new Date(),
          status: 'PENDING'
        });
        // Enqueue the job with the syncJobId
        const job = await sheetSyncQueue.add('sheet-sync', {
          sheetId,
          syncJobId: syncJob.id,
          syncType: 'MANUAL',
          retryCount: 0
        });
        return res.json({ message: 'Manual sync job enqueued', jobId: job.id, syncJobId: syncJob.id });
      }

      // Otherwise, create and enqueue manual sync jobs for all active sheets
      const activeSheets = await sheetsService.getSheets({ status: 'active' });
      const jobs = [];
      for (const sheet of activeSheets) {
        const syncJob = await sheetsService.SyncJob.create({
          sheetId: sheet.id,
          syncType: 'MANUAL',
          scheduledTime: new Date(),
          status: 'PENDING'
        });
        const job = await sheetSyncQueue.add('sheet-sync', {
          sheetId: sheet.id,
          syncJobId: syncJob.id,
          syncType: 'MANUAL',
          retryCount: 0
        });
        jobs.push({ sheetId: sheet.id, jobId: job.id, syncJobId: syncJob.id });
      }

      res.json({ message: 'Bulk manual sync jobs enqueued', jobs });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};
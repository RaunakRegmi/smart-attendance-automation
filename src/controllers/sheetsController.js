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
      const { sheetId } = req.params;
      const result = await sheetsService.toggleSheetStatus(sheetId);
      res.json(result);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  },

  // Trigger background sync jobs (single or bulk)
  syncSheet: async (req, res) => {
    try {
      const { sheetId } = req.body; // optional single sheet ID

      // If a specific sheetId is provided, enqueue a single job
      if (sheetId) {
        const job = await sheetSyncQueue.add('sync', { sheetId });
        return res.json({ message: 'Sync job enqueued', jobId: job.id });
      }

      // Otherwise, enqueue sync for all active sheets
      const activeSheets = await sheetsService.getSheets({ status: 'active' });
      const jobs = [];
      for (const sheet of activeSheets) {
        const job = await sheetSyncQueue.add('sync', { sheetId: sheet.id });
        jobs.push({ sheetId: sheet.id, jobId: job.id });
      }

      res.json({ message: 'Bulk sync jobs enqueued', jobs });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};
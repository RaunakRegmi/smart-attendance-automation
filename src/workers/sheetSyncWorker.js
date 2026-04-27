const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const sheetsService = require('../services/sheetsService');

// Redis connection (same as queue)
const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
});

// Worker to process sheet sync jobs
const defineWorker = new Worker(
  'sheet-sync',
  async job => {
    const { sheetId } = job.data;
    try {
      // Pull sheet metadata from DB via service
      const sheet = await sheetsService.getSheetById(sheetId);
      if (!sheet) throw new Error('Sheet not found');
      // Perform the actual sync (fetch, parse, store attendance)
      await sheetsService.syncSheet(sheet.id);
      // Optionally log success
      console.log(`✅ Sheet ${sheetId} sync completed`);
      return { status: 'completed', sheetId };
    } catch (err) {
      console.error(`❌ Sheet ${sheetId} sync failed: ${err.message}`);
      throw err; // Re‑throw so BullMQ marks the job as failed
    }
  },
  { connection }
);

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  await defineWorker.close();
  process.exit(0);
});

module.exports = defineWorker;
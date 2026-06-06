const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const sheetsService = require('../services/sheetsService');
const chatbotController = require('../controllers/chatbotController');

// Redis connection (same as queue)
const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
  maxRetriesPerRequest: null,
});

// Worker to process sheet sync jobs
const defineWorker = new Worker(
  'sheet-sync',
  async job => {
    const { sheetId, syncJobId, syncType, retryCount = 0 } = job.data;
    console.log(`🛠️ Starting sync job ${syncJobId} for sheet ${sheetId} (type: ${syncType}, retry: ${retryCount})`);
    try {
      // Update SyncJob status to RUNNING
      if (syncJobId) {
        await sheetsService.SyncJob.update({
          status: 'RUNNING',
          startTime: new Date(),
          lastAttemptTime: new Date(),
          retryCount
        }, { where: { id: syncJobId } });
      }

      // Perform the actual sync with service, passing job parameters
      const result = await sheetsService.syncSheet(sheetId, syncType, syncJobId, null, retryCount);

      // On success, update SyncJob
      if (syncJobId) {
        await sheetsService.SyncJob.update({
          status: 'SUCCESS',
          endTime: new Date(),
          successCount: result.processed.success,
          errorCount: result.processed.failed,
          failureDetails: JSON.stringify(result.processed.errors || [])
        }, { where: { id: syncJobId } });
      }

      console.log(`✅ Sheet ${sheetId} sync completed (job ${syncJobId})`);

      // Fire-and-forget: refresh the chatbot knowledge base. Never blocks the
      // sync job, never fails it — chatbot being down isn't a sync failure.
      chatbotController.refreshInternal()
        .then((r) => console.log(`🧠 Chatbot refresh: ${r.success ? `OK (${r.students} students)` : `skipped (${r.reason || 'unknown'})`}`))
        .catch((e) => console.warn(`🧠 Chatbot refresh threw: ${e.message}`));

      return { status: 'completed', sheetId, jobId: syncJobId };
    } catch (err) {
      console.error(`❌ Sheet ${sheetId} sync failed (job ${syncJobId}): ${err.message}`);
      // Update SyncJob status to FAILED with retry increment
      if (syncJobId) {
        await sheetsService.SyncJob.update({
          status: 'FAILED',
          endTime: new Date(),
          retryCount: retryCount + 1,
          failureDetails: err.message
        }, { where: { id: syncJobId } });
      }
      // Re‑throw to let BullMQ handle retries (configured below)
      throw err;
    }
  },
  {
    connection,
    // BullMQ retry configuration: max 3 attempts (initial + 2 retries) with exponential backoff
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }
  }
);

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  await defineWorker.close();
  process.exit(0);
});

module.exports = defineWorker;
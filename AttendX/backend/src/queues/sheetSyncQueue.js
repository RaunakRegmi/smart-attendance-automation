const { Queue } = require('bullmq');
const IORedis = require('ioredis');

// Configure Redis connection (default localhost:6379)
const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
  maxRetriesPerRequest: null,
});

// Export a singleton queue instance for sheet sync jobs
const sheetSyncQueue = new Queue('sheet-sync', { connection });

module.exports = sheetSyncQueue;
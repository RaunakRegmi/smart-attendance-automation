const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const sheetsService = require('../services/sheetsService');

const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
  maxRetriesPerRequest: null,
});

const appendWorker = new Worker(
  'sheet-append',
  async (job) => {
    const { student } = job.data;
    console.log(`Appending student ${student.email} to linked sheets...`);
    const result = await sheetsService.appendStudentToSheets(student);
    console.log(`Append result for ${student.email}:`, result);
    return result;
  },
  {
    connection,
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  }
);

process.on('SIGTERM', async () => {
  await appendWorker.close();
  process.exit(0);
});

module.exports = appendWorker;

/**
 * Stand-in for src/queues/sheetSyncQueue and src/queues/sheetAppendQueue.
 *
 * Both real modules construct an IORedis client at *import* time, so DISABLE_BACKGROUND_JOBS
 * does not stop them — merely requiring anything that transitively pulls them in opens a
 * socket to :6379 and keeps the event loop alive forever. They are reached through five
 * different modules (sheetsController, studentController, syncRoutes, sheetsService,
 * schedulerService), which is why this is wired via moduleNameMapper rather than jest.mock.
 *
 * Enqueued jobs are recorded so tests can assert on them, and __reset() clears the log.
 */
const jobs = [];

const queue = {
  __jobs: jobs,
  __reset: () => {
    jobs.length = 0;
  },
  add: jest.fn(async (name, data, opts) => {
    const job = { id: String(jobs.length + 1), name, data, opts };
    jobs.push(job);
    return job;
  }),
  addBulk: jest.fn(async (entries) => entries.map((e) => queue.add(e.name, e.data, e.opts))),
  getJob: jest.fn(async (id) => jobs.find((j) => j.id === String(id)) || null),
  getJobs: jest.fn(async () => jobs.slice()),
  getJobCounts: jest.fn(async () => ({
    waiting: jobs.length,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
  })),
  remove: jest.fn(async () => 1),
  drain: jest.fn(async () => {
    jobs.length = 0;
  }),
  close: jest.fn(async () => {}),
  on: jest.fn(() => queue),
};

module.exports = queue;

/**
 * Replaces the inline "jest" block that used to live in package.json.
 *
 * Two things here are load-bearing:
 *
 * 1. moduleNameMapper for the queues. src/queues/sheetSyncQueue.js and sheetAppendQueue.js
 *    construct an IORedis client at *import* time, so DISABLE_BACKGROUND_JOBS cannot stop
 *    them — requiring the app opens sockets to :6379 and pins the event loop open. They are
 *    pulled in transitively through five different modules (sheetsController,
 *    studentController, syncRoutes, sheetsService, schedulerService), which is why this is a
 *    module mapping rather than a jest.mock() call in each suite.
 *
 * 2. forceExit stays false. It would paper over exactly the leaked handles and dangling timers
 *    this audit is meant to surface.
 */
const sharedProject = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/setupEnv.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setupAfterEnv.js'],
  moduleNameMapper: {
    '^.*/queues/sheetSyncQueue$': '<rootDir>/tests/mocks/bullQueue.js',
    '^.*/queues/sheetAppendQueue$': '<rootDir>/tests/mocks/bullQueue.js',
    '^googleapis$': '<rootDir>/tests/mocks/googleapis.js',
  },
};

module.exports = {
  rootDir: __dirname,
  globalSetup: '<rootDir>/tests/globalSetup.js',
  globalTeardown: '<rootDir>/tests/globalTeardown.js',
  testTimeout: 30000,
  clearMocks: true,
  restoreMocks: true,
  forceExit: false,
  // The e2e project is scaffolded but empty until Phase 8.
  passWithNoTests: true,

  coverageProvider: 'v8',
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text-summary', 'json-summary', 'lcov'],
  collectCoverageFrom: [
    'src/**/*.js',
    // Schema and seed scripts: exercised by db:migrate on every run, so a green suite is
    // already the test. Counting them would only dilute the numbers that matter.
    '!src/migrations/**',
    '!src/seeders/**',
    '!src/utils/seedData.js',
    '!src/config/swagger.js',
    // Long-running BullMQ processes; tested via the queue seam instead.
    '!src/workers/**',
    // Thin bootstrap, guarded by require.main — never loaded under test.
    '!src/index.js',
  ],

  // Ratchet, not a target. These are the numbers Phase 1 actually measured (54.02 / 51.23 /
  // 26.66 / 54.02), rounded down by ~1 point so the gate passes on day one and any regression
  // fails the build. Raise them as each later phase lands; never lower them.
  coverageThreshold: {
    global: {
      statements: 53,
      branches: 50,
      functions: 26,
      lines: 53,
    },
  },

  projects: [
    {
      ...sharedProject,
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
    },
    {
      ...sharedProject,
      displayName: 'int',
      testMatch: ['<rootDir>/tests/int/**/*.test.js'],
    },
    {
      ...sharedProject,
      displayName: 'e2e',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.js'],
    },
  ],
};

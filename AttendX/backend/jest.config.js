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

  // Ratchet, not a target: ~1 point under what the suite actually measures, so the gate passes
  // today and any regression fails the build.
  //
  // Phase 1 measured 54.02 / 51.23 / 26.66 / 54.02. Phase 2 measures 63.14 / 46.71 / 50.45 /
  // 63.14 — and the branch number went DOWN while the suite got strictly larger. That is a
  // denominator effect, not a regression, and it is worth understanding before anyone "fixes"
  // it: the v8 provider only reports branches inside modules that were actually loaded. The
  // authorization matrix is the first suite to require every router and controller, so it
  // exposed 382 branches the report previously could not see.
  //
  //            covered/total      pct
  //   Phase 1     248/485       51.13
  //   Phase 2     405/867       46.71     <- +63% branches covered, -4.4 points reported
  //
  // So branches is the one threshold that drops here, to 45. Percentages are only comparable
  // across phases once module loading has stopped growing; the absolute figures above are the
  // honest ratchet in the meantime and are recorded in qa-audit/artifacts/env-manifest.json.
  // The other three rise. Never lower a threshold without this kind of accounting.
  coverageThreshold: {
    global: {
      statements: 62,
      branches: 45,
      functions: 49,
      lines: 62,
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

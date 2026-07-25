/**
 * Per-worker guard rails.
 *
 * The MAIL_PROVIDER assertion is the important one: it is a tripwire, not a convenience. A
 * stray `.env` with live SMTP credentials once made the suite capable of sending real email to
 * real students. If the pinning in globalSetup ever regresses, the whole run fails here
 * instead of quietly delivering mail.
 */
const REQUIRED_ENV = {
  NODE_ENV: 'test',
  MAIL_PROVIDER: 'demo',
  SMS_PROVIDER: 'demo',
  AUTO_REFRESH_KNOWLEDGE: 'false',
  DISABLE_BACKGROUND_JOBS: 'true',
};

for (const [key, value] of Object.entries(REQUIRED_ENV)) {
  if (process.env[key] !== value) {
    throw new Error(
      `Refusing to run tests: ${key} is "${process.env[key]}", expected "${value}". ` +
      'tests/globalSetup.js must pin this — a real .env is bleeding through.'
    );
  }
}

if (process.env.DB_NAME !== (process.env.TEST_DB_NAME || 'attendance_db_test')) {
  throw new Error(
    `Refusing to run tests against database "${process.env.DB_NAME}" — the suite drops and ` +
    'recreates its database on every run.'
  );
}

// Node 22's global fetch is undici, which nock cannot intercept. Anything reaching for the
// network gets an explicit mock instead; a bare call fails loudly rather than escaping.
global.fetch = jest.fn(() => {
  throw new Error(
    'Unexpected outbound fetch() during a test. Mock it explicitly: global.fetch.mockResolvedValue(...)'
  );
});

afterAll(async () => {
  // loggingMiddleware fires an unawaited AuditLog.create on response 'finish'/'close'. Give
  // those writes a tick to land before the pool goes away, so the run does not end on a
  // "Connection terminated" log line that looks like a real failure.
  await new Promise((resolve) => setTimeout(resolve, 50));

  const sequelize = require('../src/config/database');
  await sequelize.close();
});

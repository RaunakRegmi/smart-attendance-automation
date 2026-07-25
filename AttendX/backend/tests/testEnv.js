/**
 * The single source of truth for the test environment.
 *
 * Every value here is *pinned*, not defaulted. The previous globalSetup spread `...process.env`
 * and left MAIL_PROVIDER alone, so the repo .env (MAIL_PROVIDER=smtp, live credentials) bled
 * through and a test run could send real email. AUTO_REFRESH_KNOWLEDGE was likewise unset, so
 * Sequelize hooks on six models fired debounced fetch() calls at the live chatbot on :8000.
 *
 * Consumed in two places, which is why it lives in its own module:
 *   - tests/globalSetup.js — to create/migrate the database once per run
 *   - tests/setupEnv.js    — a `setupFiles` entry, so every project and every worker gets it
 */
const DB = {
  // The Docker Postgres 15 on :5436 matches production. The native :5432 instance is a
  // different major version and is NOT the audit target, so neither host nor port falls back
  // to a Postgres default — an unset DB_HOST used to silently point tests at :5432.
  host: process.env.TEST_DB_HOST || '127.0.0.1',
  port: Number(process.env.TEST_DB_PORT || 5436),
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'admin',
  name: process.env.TEST_DB_NAME || 'attendance_db_test',
};

const env = {
  NODE_ENV: 'test',
  DB_HOST: DB.host,
  DB_PORT: String(DB.port),
  DB_USER: DB.user,
  DB_PASSWORD: DB.password,
  DB_NAME: DB.name,
  JWT_SECRET: process.env.JWT_SECRET || 'test_jwt_secret',
  DB_SYNC_ALTER: 'false',
  DISABLE_BACKGROUND_JOBS: 'true',
  // Outbound side effects: demo adapters only.
  MAIL_PROVIDER: 'demo',
  SMS_PROVIDER: 'demo',
  // Kill the model hooks that push knowledge refreshes at the chatbot.
  AUTO_REFRESH_KNOWLEDGE: 'false',
  // Discard port: anything that still tries to reach the chatbot fails fast instead of
  // mutating the developer's running instance.
  CHATBOT_URL: 'http://127.0.0.1:9',
};

const apply = () => {
  Object.assign(process.env, env);
};

module.exports = { DB, env, apply };

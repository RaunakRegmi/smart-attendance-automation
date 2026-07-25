const { execSync } = require('child_process');
const path = require('path');
const { Client } = require('pg');
const { DB, apply } = require('./testEnv');

module.exports = async () => {
  apply();

  // Fresh test database every run.
  const client = new Client({
    host: DB.host,
    port: DB.port,
    user: DB.user,
    password: DB.password,
    database: 'postgres',
  });
  await client.connect();
  await client.query(`DROP DATABASE IF EXISTS ${DB.name} WITH (FORCE);`);
  await client.query(`CREATE DATABASE ${DB.name};`);
  await client.end();

  const backendRoot = path.join(__dirname, '..');
  execSync('npx sequelize-cli db:migrate', { cwd: backendRoot, env: process.env, stdio: 'pipe' });

  // The server used to be spawned as a child process, which seeded the admin user as a side
  // effect of booting — and put every request across a process boundary where coverage could
  // not be collected. Tests now drive the app in-process via Supertest, so seed explicitly.
  const sequelize = require('../src/config/database');
  const ensureAdminUser = require('../src/bootstrap/ensureAdminUser');
  await ensureAdminUser();

  // Freshness tripwire. Suites build fixtures with fixed natural keys (batch abbreviation
  // 'TB', known emails), so a database that is not actually empty makes the *first* fixture
  // insert fail with a 400 and takes that suite's whole beforeAll down — which surfaces as
  // dozens of unrelated assertion failures and hides the real cause. This was observed once
  // during Phase 2 (all 32 teacher-portal cases failing while the other three suites passed)
  // and could not be reproduced; if it happens again, it fails here instead, with the reason.
  const [[{ count }]] = await sequelize.query('SELECT COUNT(*)::int AS count FROM users');
  if (count !== 1) {
    throw new Error(
      `Test database is not fresh: expected exactly the seeded admin in "users", found ${count} ` +
        'rows. The DROP/CREATE in this file did not take effect — most likely a previous Jest ' +
        'process was still finishing work (loggingMiddleware fires an unawaited AuditLog.create ' +
        'after each response; see finding B-001) when this run recreated the database.'
    );
  }

  await sequelize.close();
};

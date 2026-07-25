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
  await sequelize.close();
};

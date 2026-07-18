const { execSync, spawn } = require('child_process');
const path = require('path');
const { Client } = require('pg');

const TEST_PORT = process.env.TEST_PORT || '5998';
const DB = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
  name: process.env.TEST_DB_NAME || 'attendance_db_test',
};

const testEnv = {
  ...process.env,
  NODE_ENV: 'test',
  PORT: TEST_PORT,
  DB_HOST: DB.host,
  DB_PORT: String(DB.port),
  DB_USER: DB.user,
  DB_PASSWORD: DB.password,
  DB_NAME: DB.name,
  JWT_SECRET: process.env.JWT_SECRET || 'test_jwt_secret',
  DB_SYNC_ALTER: 'false',
  DISABLE_BACKGROUND_JOBS: 'true',
};

const waitForHealth = async (retries = 40) => {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/health`);
      if (res.ok) return;
    } catch (_) {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Test server did not become healthy in time');
};

module.exports = async () => {
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
  execSync('npx sequelize-cli db:migrate', { cwd: backendRoot, env: testEnv, stdio: 'pipe' });

  // Boot the real server (it seeds the admin user itself on startup).
  const server = spawn('node', ['src/index.js'], { cwd: backendRoot, env: testEnv, stdio: 'pipe' });
  server.stderr.on('data', (d) => process.stderr.write(`[test-server] ${d}`));
  global.__TEST_SERVER__ = server;
  // The spawned pid is also stashed for the teardown process (separate context).
  process.env.__TEST_SERVER_PID__ = String(server.pid);

  await waitForHealth();
};

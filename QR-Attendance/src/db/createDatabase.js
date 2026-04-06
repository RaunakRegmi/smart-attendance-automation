require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432;
  const user = process.env.DB_USER || 'postgres';
  const password = String(process.env.DB_PASSWORD ?? 'postgres');
  const databaseToCreate = process.env.DB_NAME || 'qr_attendance';

  // Connect to default maintenance DB to create target DB if needed
  const client = new Client({
    host,
    port,
    user,
    password,
    database: 'postgres',
  });

  await client.connect();
  try {
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseToCreate]);
    if (exists.rowCount === 0) {
      await client.query(`CREATE DATABASE "${databaseToCreate}"`);
      // eslint-disable-next-line no-console
      console.log(`Created database: ${databaseToCreate}`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`Database exists: ${databaseToCreate}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err.message || err);
  process.exit(1);
});


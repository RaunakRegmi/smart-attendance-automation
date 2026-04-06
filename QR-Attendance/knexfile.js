require('dotenv').config();

const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
} = process.env;

/** @type {import('knex').Knex.Config} */
module.exports = {
  client: 'pg',
  connection: {
    host: DB_HOST || 'localhost',
    port: DB_PORT ? Number(DB_PORT) : 5432,
    user: DB_USER || 'postgres',
    password: String(DB_PASSWORD ?? 'postgres'),
    database: DB_NAME || 'qr_attendance',
  },
  pool: { min: 2, max: 10 },
  migrations: {
    directory: './src/db/migrations',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: './src/db/seeds',
  },
};

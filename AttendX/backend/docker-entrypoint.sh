#!/bin/sh
set -e

echo "==> Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
until node -e "
const { Client } = require('pg');
const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
client.connect()
  .then(() => client.end())
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
" >/dev/null 2>&1; do
  sleep 2
done
echo "==> PostgreSQL is ready"

echo "==> Running database migrations..."
npm run migrate

echo "==> Seeding default data (idempotent)..."
npm run seed

mkdir -p uploads exports

# BullMQ worker is started from src/index.js; run "npm run worker" separately only if scaling workers
echo "==> Starting API with hot reload (nodemon)..."
exec npm run dev

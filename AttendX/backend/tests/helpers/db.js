const { Client } = require('pg');

/**
 * Raw SQL escape hatch, for the handful of fixtures that cannot be built through the public
 * API (planting an already-expired reset token, back-filling students.userId).
 *
 * Connection details come from the environment that tests/setupEnv.js pinned, with no
 * fallbacks — a fallback here is how a test run ends up writing to the wrong database.
 */
const withClient = async (fn) => {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
};

const query = (sql, params) => withClient((client) => client.query(sql, params));

module.exports = { withClient, query };

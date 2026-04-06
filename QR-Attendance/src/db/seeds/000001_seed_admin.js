const bcrypt = require('bcrypt');

/**
 * Seed admin user:
 * email: admin@example.com
 * password: admin123
 * @param {import('knex').Knex} knex
 */
exports.seed = async function seed(knex) {
  const email = 'admin@example.com';
  const password = 'admin123';

  const existing = await knex('users').select('id').where({ email }).first();
  if (existing) return;

  const passwordHash = await bcrypt.hash(password, 12);

  await knex('users').insert({
    name: 'System Admin',
    email,
    phone: '0000000000',
    password_hash: passwordHash,
    role: 'ADMIN',
  });
};


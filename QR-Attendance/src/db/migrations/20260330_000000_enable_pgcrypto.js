/**
 * Enables gen_random_uuid() for UUID defaults.
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.raw('DROP EXTENSION IF EXISTS pgcrypto;');
};


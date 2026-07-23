'use strict';

// The User model declares `tokenVersion` (used for JWT invalidation), but no migration
// ever added the column. Fresh databases (built only from migrations with DB_SYNC_ALTER=false)
// therefore lack it, breaking every login with: column "tokenVersion" does not exist.
// This adds it. Guarded with describeTable so it is safe on DBs that already have the column.
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('users');
    if (!table.tokenVersion) {
      await queryInterface.addColumn('users', 'tokenVersion', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('users');
    if (table.tokenVersion) {
      await queryInterface.removeColumn('users', 'tokenVersion');
    }
  },
};

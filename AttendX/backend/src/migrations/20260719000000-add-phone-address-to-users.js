'use strict';

// Contact details for credential delivery (teacher accounts). Both nullable —
// existing rows and student/admin accounts are untouched.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('users');
    if (!table.phone) {
      await queryInterface.addColumn('users', 'phone', {
        type: Sequelize.STRING,
        allowNull: true,
      });
      await queryInterface.addIndex('users', ['phone']);
    } else {
      console.log('users.phone already exists, skipping.');
    }
    if (!table.address) {
      await queryInterface.addColumn('users', 'address', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    } else {
      console.log('users.address already exists, skipping.');
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('users');
    if (table.address) {
      await queryInterface.removeColumn('users', 'address');
    }
    if (table.phone) {
      await queryInterface.removeColumn('users', 'phone');
    }
  },
};

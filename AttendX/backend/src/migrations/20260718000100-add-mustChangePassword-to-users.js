'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('users');
    if (!table.mustChangePassword) {
      await queryInterface.addColumn('users', 'mustChangePassword', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    } else {
      console.log('users.mustChangePassword already exists, skipping.');
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('users');
    if (table.mustChangePassword) {
      await queryInterface.removeColumn('users', 'mustChangePassword');
    }
  },
};

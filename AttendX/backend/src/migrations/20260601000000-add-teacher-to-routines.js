'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('routines', 'teacher', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    } catch (e) {
      if (!e.message.includes('already exists')) throw e;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('routines', 'teacher');
  },
};

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('subjects', 'lecturerId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'lecturers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    } catch (e) {
      if (!e.message.includes('already exists')) throw e;
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('subjects', 'lecturerId');
  },
};

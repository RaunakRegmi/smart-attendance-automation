'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
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
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('subjects', 'lecturerId');
  },
};

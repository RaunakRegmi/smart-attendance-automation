'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('subjects', 'batchId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'batches',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    } catch (e) {
      if (!e.message.includes('already exists')) throw e;
    }

    try {
      await queryInterface.addColumn('subjects', 'sectionId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'sections',
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
    await queryInterface.removeColumn('subjects', 'batchId');
    await queryInterface.removeColumn('subjects', 'sectionId');
  },
};

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Sheets', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      sheetName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      sheetId: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      batchId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Batches',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      sectionId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Sections',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive'),
        defaultValue: 'inactive',
        allowNull: false,
      },
      lastSuccessfulSyncTime: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      lastAttemptedSyncTime: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Sheets');
  },
};
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SyncJobs', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
      },
      sheetId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Sheets',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      syncType: {
        type: Sequelize.ENUM('AUTO', 'MANUAL'),
        allowNull: false,
      },
      scheduledTime: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      startTime: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      endTime: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED'),
        defaultValue: 'PENDING',
        allowNull: false,
      },
      retryCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      failureDetails: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      lastAttemptTime: {
        type: Sequelize.DATE,
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

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('SyncJobs');
  },
};
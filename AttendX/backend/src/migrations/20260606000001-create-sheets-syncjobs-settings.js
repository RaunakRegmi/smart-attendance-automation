'use strict';

/**
 * Sheets / SyncJobs / Settings were only ever created by `sequelize.sync({ alter: true })`,
 * so a fresh database was missing them entirely and every sheets/sync/settings endpoint 500'd.
 *
 * Table names are the quoted PascalCase defaults that `sequelize.define('Sheets' | 'SyncJob' |
 * 'Setting')` produces, and the Settings columns match the raw `CREATE TABLE IF NOT EXISTS`
 * in schedulerService.js exactly so that DDL stays a no-op.
 *
 * Dated 20260606000001 — i.e. *before* 20260607000000-add-soft-delete, which adds
 * attendance.sheetId REFERENCES "Sheets" and a partial unique index on Sheets and therefore
 * could never run on a genuinely fresh database. Because it is absent from SequelizeMeta, this
 * migration also runs against databases whose tables already exist courtesy of
 * `sync({ alter: true })`; Sequelize's Postgres createTable emits CREATE TABLE IF NOT EXISTS
 * and guards enum creation with a duplicate_object handler, so re-running is a no-op there.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Sheets', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
      },
      sheetName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      sheetId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      batchId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'batches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      sectionId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'sections', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive'),
        defaultValue: 'inactive',
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
        references: { model: 'Sheets', key: 'id' },
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
        allowNull: false,
        defaultValue: 'PENDING',
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

    await queryInterface.createTable('Settings', {
      key: {
        type: Sequelize.STRING(255),
        primaryKey: true,
        allowNull: false,
      },
      value: {
        type: Sequelize.STRING(255),
        allowNull: false,
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
    await queryInterface.dropTable('Settings');
    await queryInterface.dropTable('SyncJobs');
    await queryInterface.dropTable('Sheets');
    // createTable leaves the backing ENUM types behind on Postgres.
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_SyncJobs_syncType";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_SyncJobs_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Sheets_status";');
  },
};

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SyncJob = sequelize.define('SyncJob', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  sheetId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Sheets',
      key: 'id',
    },
  },
  syncType: {
    type: DataTypes.ENUM('AUTO', 'MANUAL'),
    allowNull: false,
  },
  scheduledTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED'),
    defaultValue: 'PENDING',
    allowNull: false,
  },
  retryCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  failureDetails: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  lastAttemptTime: {
    type: DataTypes.DATE,
    allowNull: true,
  }
});

module.exports = SyncJob;
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Sheets = sequelize.define('Sheets', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  sheetName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  sheetId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  batchId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  sectionId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'inactive',
  },
  lastSuccessfulSyncTime: {
    type: DataTypes.DATE,
  },
  lastAttemptedSyncTime: {
    type: DataTypes.DATE,
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
  }
});

// Associate with existing models
const Batch = require('./Batch');
const Section = require('./Section');

Sheets.belongsTo(Batch, { foreignKey: 'batchId' });
Sheets.belongsTo(Section, { foreignKey: 'sectionId' });

module.exports = Sheets;
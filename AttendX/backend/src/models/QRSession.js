const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QRSession = sequelize.define('QRSession', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  token: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
  },
  subjectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'subjects',
      key: 'id',
    },
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  scannedBy: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
}, {
  tableName: 'qr_sessions',
  timestamps: true,
});

module.exports = QRSession;

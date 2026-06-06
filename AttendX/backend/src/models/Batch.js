const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Batch = sequelize.define('Batch', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  abbreviation: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    validate: {
      isUppercase: true,
      isAlphanumeric: true,
    },
  },
}, {
  tableName: 'batches',
  timestamps: true,
});

module.exports = Batch;

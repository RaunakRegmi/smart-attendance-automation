const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const refresh = require('../services/knowledgeRefreshService');

const Batch = sequelize.define('Batch', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  abbreviation: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUppercase: true,
      isAlphanumeric: true,
    },
  },
}, {
  tableName: 'batches',
  timestamps: true,
  paranoid: true,
  hooks: {
    afterCreate: () => refresh.trigger(),
    afterUpdate: (record) => {
      if (record.changed('deletedAt')) refresh.trigger();
    },
    afterDestroy: () => refresh.trigger(),
  },
});

module.exports = Batch;

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const refresh = require('../services/knowledgeRefreshService');

const Section = sequelize.define('Section', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  batchId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'batches',
      key: 'id',
    },
  },
}, {
  tableName: 'sections',
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

module.exports = Section;

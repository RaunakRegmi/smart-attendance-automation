const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const refresh = require('../services/knowledgeRefreshService');

const Faculty = sequelize.define('Faculty', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'faculties',
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

module.exports = Faculty;

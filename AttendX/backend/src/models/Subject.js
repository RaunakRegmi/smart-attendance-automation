const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const refresh = require('../services/knowledgeRefreshService');

const Subject = sequelize.define('Subject', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  subjectCode: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  subjectName: {
    type: DataTypes.STRING,
  },
  lecturerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'subjects',
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

module.exports = Subject;

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const refresh = require('../services/knowledgeRefreshService');
const Batch = require('./Batch');
const Section = require('./Section');

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
  batchId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  sectionId: {
    type: DataTypes.UUID,
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

Subject.belongsTo(Batch, { foreignKey: 'batchId', as: 'batch' });
Subject.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });

module.exports = Subject;

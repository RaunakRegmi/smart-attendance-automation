const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Routine = sequelize.define('Routine', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  sectionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'sections',
      key: 'id',
    },
  },
  dayOfWeek: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  subjectCode: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  subjectName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  startTime: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  endTime: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  block: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  room: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  teacher: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'routines',
  timestamps: true,
  paranoid: true,
});

module.exports = Routine;

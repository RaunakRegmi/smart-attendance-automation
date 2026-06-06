const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Subject = sequelize.define('Subject', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  subjectCode: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
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
});

module.exports = Subject;

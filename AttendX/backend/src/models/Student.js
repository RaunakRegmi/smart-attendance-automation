const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const refresh = require('../services/knowledgeRefreshService');

const Student = sequelize.define('Student', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  gender: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  bloodGroup: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  regNum: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  univId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  admissionDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  dob: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  faculty: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  guardianName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  guardianContact: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  userId: {
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
  tableName: 'students',
  timestamps: true,
  hooks: {
    afterCreate: () => refresh.trigger(),
    afterUpdate: () => refresh.trigger(),
    afterDestroy: () => refresh.trigger(),
  },
});

module.exports = Student;

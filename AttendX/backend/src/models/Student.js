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
    validate: {
      isEmail: true,
    },
  },
  gender: {
    type: DataTypes.ENUM('Male', 'Female', 'Others'),
    allowNull: true,
  },
  bloodGroup: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  regNum: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  univId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  admissionDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  dob: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  facultyId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'faculties',
      key: 'id',
    },
  },
  guardianName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  guardianContact: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  avatarUrl: {
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
  paranoid: true,
  hooks: {
    afterCreate: () => refresh.trigger(),
    afterUpdate: (record) => {
      if (record.changed('deletedAt')) refresh.trigger();
    },
    afterDestroy: () => refresh.trigger(),
  },
});

module.exports = Student;

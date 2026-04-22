const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

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
  batchId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'batches',
      key: 'id',
    },
  },
  sectionId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'sections',
      key: 'id',
    },
  },
}, {
  tableName: 'students',
  timestamps: true,
});

module.exports = Student;

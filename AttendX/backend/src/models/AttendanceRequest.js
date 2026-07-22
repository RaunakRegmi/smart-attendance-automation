const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const QRSession = require('./QRSession');
const Student = require('./Student');
const User = require('./User');

const AttendanceRequest = sequelize.define('AttendanceRequest', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  qrSessionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: QRSession,
      key: 'id',
    },
  },
  studentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Student,
      key: 'id',
    },
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending',
  },
  decidedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: 'id',
    },
  },
  decidedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'attendance_requests',
  timestamps: true,
});

QRSession.hasMany(AttendanceRequest, { foreignKey: 'qrSessionId' });
AttendanceRequest.belongsTo(QRSession, { foreignKey: 'qrSessionId' });

Student.hasMany(AttendanceRequest, { foreignKey: 'studentId' });
AttendanceRequest.belongsTo(Student, { foreignKey: 'studentId' });

User.hasMany(AttendanceRequest, { foreignKey: 'decidedBy', as: 'decisions' });
AttendanceRequest.belongsTo(User, { foreignKey: 'decidedBy', as: 'decider' });

module.exports = AttendanceRequest;

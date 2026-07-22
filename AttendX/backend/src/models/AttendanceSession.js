const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const QRSession = require('./QRSession');
const Student = require('./Student');

const AttendanceSession = sequelize.define('AttendanceSession', {
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
  status: {
    type: DataTypes.ENUM('Present', 'Late', 'Absent'),
    allowNull: false,
    defaultValue: 'Present',
  },
  scannedAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  source: {
    type: DataTypes.ENUM('qr', 'late-request'),
    allowNull: false,
    defaultValue: 'qr',
  },
}, {
  tableName: 'attendance_sessions',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['qrSessionId', 'studentId'],
    },
  ],
});

QRSession.hasMany(AttendanceSession, { foreignKey: 'qrSessionId' });
AttendanceSession.belongsTo(QRSession, { foreignKey: 'qrSessionId' });

Student.hasMany(AttendanceSession, { foreignKey: 'studentId' });
AttendanceSession.belongsTo(Student, { foreignKey: 'studentId' });

module.exports = AttendanceSession;

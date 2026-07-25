const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Student = require('./Student');
const Subject = require('./Subject');
const refresh = require('../services/knowledgeRefreshService');

const Attendance = sequelize.define('Attendance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  studentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Student,
      key: 'id',
    },
  },
  subjectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Subject,
      key: 'id',
    },
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('Present', 'Absent', 'Late'),
    defaultValue: 'Absent',
  },
  sheetId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'attendance',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['studentId', 'subjectId', 'date'],
    },
  ],
  hooks: {
    afterCreate: () => refresh.trigger(),
    afterBulkCreate: () => refresh.trigger(),
    afterUpdate: () => refresh.trigger(),
    // upsert fires neither afterCreate nor afterUpdate in Sequelize 6 — without
    // this, the Excel upload, the Sheets sync and the QR roll-up (all of which
    // write via upsert) would never rebuild the chatbot's knowledge base.
    afterUpsert: () => refresh.trigger(),
    afterDestroy: () => refresh.trigger(),
    afterBulkDestroy: () => refresh.trigger(),
  },
});

Student.hasMany(Attendance, { foreignKey: 'studentId' });
Attendance.belongsTo(Student, { foreignKey: 'studentId' });

Subject.hasMany(Attendance, { foreignKey: 'subjectId' });
Attendance.belongsTo(Subject, { foreignKey: 'subjectId' });

module.exports = Attendance;

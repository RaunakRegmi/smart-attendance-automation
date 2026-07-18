const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Which (section, subject) pairs a login-teacher (users.role = TEACHER) owns.
// This is the backbone of teacher row-level scoping — distinct from
// subjects.lecturerId, which records the loginless lecturer reference data.
const TeacherAssignment = sequelize.define('TeacherAssignment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  teacherUserId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  sectionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'sections',
      key: 'id',
    },
  },
  subjectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'subjects',
      key: 'id',
    },
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'teacher_assignments',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['teacherUserId', 'sectionId', 'subjectId'],
    },
  ],
});

module.exports = TeacherAssignment;

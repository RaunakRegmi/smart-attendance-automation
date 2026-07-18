const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// An async person-to-person message thread (or a one-way admin notification).
// Named MessageThread/thread_messages because Conversation/conversations is
// already owned by the AI chatbot's memory.
//
// contextType → what contextId points to:
//   STUDENT_TEACHER_SUBJECT → subjects.id (the shared subject)
//   ADMIN_TEACHER           → null
//   ADMIN_BROADCAST         → null (participants = recipients; title holds the subject line)
const MessageThread = sequelize.define('MessageThread', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  contextType: {
    type: DataTypes.ENUM('STUDENT_TEACHER_SUBJECT', 'ADMIN_TEACHER', 'ADMIN_BROADCAST'),
    allowNull: false,
  },
  contextId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
}, {
  tableName: 'message_threads',
  // updatedAt = last message time; inbox lists sort by it.
  timestamps: true,
});

module.exports = MessageThread;

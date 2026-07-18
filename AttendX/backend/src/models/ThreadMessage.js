const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ThreadMessage = sequelize.define('ThreadMessage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  threadId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'message_threads',
      key: 'id',
    },
  },
  // null = system-generated (e.g. an admin notification body).
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  isSystem: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  // Simple 1:1 read marker; MessageThreadParticipant.lastReadAt is the primary
  // unread mechanism (works for broadcasts too).
  readAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'thread_messages',
  timestamps: true,
  indexes: [
    {
      fields: ['threadId', 'createdAt'],
    },
  ],
});

module.exports = ThreadMessage;

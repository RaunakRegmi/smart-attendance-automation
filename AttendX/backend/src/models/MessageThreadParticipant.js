const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MessageThreadParticipant = sequelize.define('MessageThreadParticipant', {
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
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  // Source of truth for unread counts: unread = messages newer than this
  // (excluding the user's own). Null = never read.
  lastReadAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  // Role snapshot at join time (string, not enum, so future roles don't need a migration).
  roleAtTime: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'message_thread_participants',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['threadId', 'userId'],
    },
  ],
});

module.exports = MessageThreadParticipant;

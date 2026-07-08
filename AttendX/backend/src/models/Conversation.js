const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// A durable chat conversation, keyed to a user. One active conversation per
// (userId, scope) by default; the schema allows many so multiple named
// conversations are a future add. The full transcript lives in chat_messages;
// runningSummary holds a compacted memory of turns that no longer fit the model
// context window so nothing is ever truly forgotten.
const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  scope: {
    type: DataTypes.ENUM('ADMIN', 'STUDENT'),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  runningSummary: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Highest chat_messages.id already folded into runningSummary (idempotent compaction).
  summarizedThroughId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'conversations',
  timestamps: true,
});

module.exports = Conversation;

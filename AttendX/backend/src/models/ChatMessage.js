const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// One message in a conversation. `role` follows the LLM convention:
//   user/assistant — the conversation; system — injected prompts (not usually stored);
//   tool — an agent tool call's result (toolName/toolArgs/toolResult populated).
// Token counts (when reported by Ollama) drive the context-window meter.
const ChatMessage = sequelize.define('ChatMessage', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  conversationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'conversations',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  role: {
    type: DataTypes.ENUM('system', 'user', 'assistant', 'tool'),
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  toolName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  toolArgs: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  toolResult: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  promptTokens: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  completionTokens: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'chat_messages',
  timestamps: true,
  indexes: [
    { fields: ['conversationId', 'createdAt'] },
  ],
});

module.exports = ChatMessage;

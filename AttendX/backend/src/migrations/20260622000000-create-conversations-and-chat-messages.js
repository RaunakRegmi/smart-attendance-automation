'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('conversations', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      scope: {
        type: Sequelize.ENUM('ADMIN', 'STUDENT'),
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      runningSummary: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      summarizedThroughId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
    await queryInterface.addIndex('conversations', ['userId', 'scope', 'isActive']);

    await queryInterface.createTable('chat_messages', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      conversationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'conversations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      role: {
        type: Sequelize.ENUM('system', 'user', 'assistant', 'tool'),
        allowNull: false,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      toolName: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      toolArgs: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      toolResult: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      promptTokens: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      completionTokens: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
    await queryInterface.addIndex('chat_messages', ['conversationId', 'createdAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('chat_messages');
    await queryInterface.dropTable('conversations');
  },
};

'use strict';

// Async person-to-person messaging + admin notifications.
// Named message_threads/thread_messages (NOT conversations/messages) because the
// chatbot already owns the conversations/chat_messages tables.
//
// contextType → what contextId points to:
//   STUDENT_TEACHER_SUBJECT → subjects.id (the shared subject the thread is about)
//   ADMIN_TEACHER           → null (direct admin↔teacher thread)
//   ADMIN_BROADCAST         → null (one-way notification; participants = recipients)
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('message_threads', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      contextType: {
        type: Sequelize.ENUM('STUDENT_TEACHER_SUBJECT', 'ADMIN_TEACHER', 'ADMIN_BROADCAST'),
        allowNull: false,
      },
      contextId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      // updatedAt = last message time; inbox lists sort by it.
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
    await queryInterface.addIndex('message_threads', ['contextType', 'contextId']);
    await queryInterface.addIndex('message_threads', ['createdBy']);
    await queryInterface.addIndex('message_threads', ['updatedAt']);

    await queryInterface.createTable('message_thread_participants', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      threadId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'message_threads', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      // Source of truth for unread counts: unread = messages newer than this.
      lastReadAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      // Role snapshot at join time (string, not enum, so future roles don't need a migration).
      roleAtTime: {
        type: Sequelize.STRING,
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
    await queryInterface.addIndex('message_thread_participants', ['threadId', 'userId'], {
      unique: true,
      name: 'message_thread_participants_unique_pair',
    });
    await queryInterface.addIndex('message_thread_participants', ['userId']);

    await queryInterface.createTable('thread_messages', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      threadId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'message_threads', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      // null = system-generated (e.g. an admin notification body).
      senderId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      isSystem: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      // Simple 1:1 read marker; message_thread_participants.lastReadAt is the
      // primary unread mechanism (works for broadcasts too).
      readAt: {
        type: Sequelize.DATE,
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
    await queryInterface.addIndex('thread_messages', ['threadId', 'createdAt']);
    await queryInterface.addIndex('thread_messages', ['senderId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('thread_messages');
    await queryInterface.dropTable('message_thread_participants');
    await queryInterface.dropTable('message_threads');
  },
};

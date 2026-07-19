'use strict';

// Single-use, time-limited set/reset-password tokens. Only the SHA-256 hash is
// stored — the raw token exists solely inside the delivered link.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('password_reset_tokens', {
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
      tokenHash: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      usedAt: {
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
    await queryInterface.addIndex('password_reset_tokens', ['tokenHash'], {
      unique: true,
      name: 'password_reset_tokens_token_hash_unique',
    });
    await queryInterface.addIndex('password_reset_tokens', ['userId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('password_reset_tokens');
  },
};

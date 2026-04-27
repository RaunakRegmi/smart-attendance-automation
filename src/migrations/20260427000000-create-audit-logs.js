'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.STRING(36),
        allowNull: true,
        comment: 'Reference to user who performed action (UUID string)'
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      endpoint: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      method: {
        type: Sequelize.STRING(10),
        allowNull: false
      },
      route: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      client_ip: {
        type: Sequelize.STRING(45),
        allowNull: false
      },
      request_headers: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      authorization_header: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      response_status: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      icp_hash: {
        type: Sequelize.STRING(64),
        allowNull: true
      },
      status: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      client_agent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      request_body: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      remote_user: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      audit_event_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'audit'
      }
    });

    // Add indexes
    await queryInterface.addIndex('audit_logs', ['user_id']);
    await queryInterface.addIndex('audit_logs', ['timestamp']);
    await queryInterface.addIndex('audit_logs', ['endpoint']);
    await queryInterface.addIndex('audit_logs', ['audit_event_type']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('audit_logs');
  }
};
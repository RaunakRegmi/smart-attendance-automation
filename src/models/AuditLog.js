const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.STRING(36),
    allowNull: true,
    comment: 'Reference to user who performed action (string)'
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  endpoint: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  method: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  route: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  client_ip: {
    type: DataTypes.STRING(45),
    allowNull: false
  },
  request_headers: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  authorization_header: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  response_status: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  icp_hash: {
    type: DataTypes.STRING(64),
    allowNull: true
  },
  status: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  client_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  request_body: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  remote_user: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  audit_event_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'audit'
  }
}, {
  tableName: 'audit_logs',
  timestamps: false,
  indexes: [
    {
      name: 'idx_audit_user',
      fields: ['user_id']
    },
    {
      name: 'idx_audit_time',
      fields: ['timestamp']
    },
    {
      name: 'idx_audit_endpoint',
      fields: ['endpoint']
    },
    {
      name: 'idx_audit_type',
      fields: ['audit_event_type']
    }
  ]
});

module.exports = AuditLog;
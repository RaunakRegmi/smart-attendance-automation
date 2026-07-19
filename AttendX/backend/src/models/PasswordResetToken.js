const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Single-use, time-limited set/reset-password token. Only the SHA-256 hash of
// the token is stored — the raw value lives solely in the delivered link.
const PasswordResetToken = sequelize.define('PasswordResetToken', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  tokenHash: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  usedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'password_reset_tokens',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['tokenHash'],
    },
  ],
});

module.exports = PasswordResetToken;

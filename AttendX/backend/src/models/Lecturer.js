const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Lecturer = sequelize.define('Lecturer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: { isEmail: true },
  },
  contact: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Optional link to a login user (role TEACHER). Nullable on purpose: a
  // lecturer without a login stays valid. Populated only by an explicit admin
  // "promote to login" action — never auto-matched by email.
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
}, {
  tableName: 'lecturers',
  timestamps: true,
  paranoid: true,
});

module.exports = Lecturer;

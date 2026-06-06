const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Section = sequelize.define('Section', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  batchId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'batches',
      key: 'id',
    },
  },
}, {
  tableName: 'sections',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['name', 'batchId'],
    },
  ],
});

module.exports = Section;

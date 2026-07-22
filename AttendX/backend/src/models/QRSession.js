const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Section = require('./Section');
const Subject = require('./Subject');

const QRSession = sequelize.define('QRSession', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
  },
  sectionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Section,
      key: 'id',
    },
  },
  subjectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Subject,
      key: 'id',
    },
  },
  classType: {
    type: DataTypes.ENUM('Lecture', 'Tutorial', 'Workshop'),
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  sessionToken: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'qrsessions',
  timestamps: true,
});

User.hasMany(QRSession, { foreignKey: 'createdBy', as: 'sessions' });
QRSession.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Section.hasMany(QRSession, { foreignKey: 'sectionId' });
QRSession.belongsTo(Section, { foreignKey: 'sectionId' });

Subject.hasMany(QRSession, { foreignKey: 'subjectId' });
QRSession.belongsTo(Subject, { foreignKey: 'subjectId' });

module.exports = QRSession;

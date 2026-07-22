'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('attendance_sessions', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
      },
      qrSessionId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'qrsessions',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      studentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'students',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM('Present', 'Late', 'Absent'),
        allowNull: false,
        defaultValue: 'Present',
      },
      scannedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      source: {
        type: Sequelize.ENUM('qr', 'late-request'),
        allowNull: false,
        defaultValue: 'qr',
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

    // Add unique constraint for (qrSessionId, studentId)
    try {
      await queryInterface.addConstraint('attendance_sessions', {
        type: 'unique',
        name: 'attendance_sessions_qrSessionId_studentId_unique',
        fields: ['qrSessionId', 'studentId'],
      });
    } catch (e) {
      if (!e.message.includes('already exists')) throw e;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('attendance_sessions', 'attendance_sessions_qrSessionId_studentId_unique');
    await queryInterface.dropTable('attendance_sessions');
  },
};

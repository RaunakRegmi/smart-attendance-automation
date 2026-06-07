'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create attendance table with enum status including 'Late'
    await queryInterface.createTable('attendance', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
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
      subjectId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'subjects',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('Present', 'Absent', 'Late'),
        defaultValue: 'Absent',
        allowNull: false,
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

    // Add unique constraint for (studentId, subjectId, date)
    try {
      await queryInterface.addConstraint('attendance', {
        type: 'unique',
        name: 'attendance_studentId_subjectId_date_unique',
        fields: ['studentId', 'subjectId', 'date'],
      });
    } catch (e) {
      if (!e.message.includes('already exists')) throw e;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('attendance', 'attendance_studentId_subjectId_date_unique');
    await queryInterface.dropTable('attendance');
  },
};
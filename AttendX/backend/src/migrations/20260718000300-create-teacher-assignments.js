'use strict';

// The backbone of teacher row-level scoping: which (section, subject) pairs a
// login-teacher owns. Every teacher-facing query must filter through this.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('teacher_assignments', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      teacherUserId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      sectionId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'sections', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      subjectId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'subjects', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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
    await queryInterface.addIndex('teacher_assignments', ['teacherUserId', 'sectionId', 'subjectId'], {
      unique: true,
      name: 'teacher_assignments_unique_triple',
    });
    await queryInterface.addIndex('teacher_assignments', ['teacherUserId']);
    await queryInterface.addIndex('teacher_assignments', ['sectionId', 'subjectId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('teacher_assignments');
  },
};

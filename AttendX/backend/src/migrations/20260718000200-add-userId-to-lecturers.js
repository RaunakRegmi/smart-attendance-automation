'use strict';

// Optional link from a lecturer record to a login user (role TEACHER).
// Nullable on purpose: a lecturer without a login stays valid. Populating this
// is a manual admin action ("promote lecturer to login") — never auto-matched.
// Note: subjects.lecturerId (who teaches a subject, loginless reference data)
// remains a separate concept from teacher_assignments (which login-teacher is
// scoped to which section+subject).
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('lecturers');
    if (!table.userId) {
      await queryInterface.addColumn('lecturers', 'userId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
      await queryInterface.addIndex('lecturers', ['userId']);
    } else {
      console.log('lecturers.userId already exists, skipping.');
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('lecturers');
    if (table.userId) {
      await queryInterface.removeColumn('lecturers', 'userId');
    }
  },
};

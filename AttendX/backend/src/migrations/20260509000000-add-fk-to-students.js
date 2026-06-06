'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add foreign key constraint for userId
    await queryInterface.addConstraint('students', {
      type: 'foreign key',
      name: 'fk_students_userId',
      fields: ['userId'],
      references: {
        table: 'users',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // Add foreign key constraint for sectionId
    await queryInterface.addConstraint('students', {
      type: 'foreign key',
      name: 'fk_students_sectionId',
      fields: ['sectionId'],
      references: {
        table: 'sections',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // Add foreign key constraint for batchId
    await queryInterface.addConstraint('students', {
      type: 'foreign key',
      name: 'fk_students_batchId',
      fields: ['batchId'],
      references: {
        table: 'batches',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('students', 'fk_students_userId');
    await queryInterface.removeConstraint('students', 'fk_students_sectionId');
    await queryInterface.removeConstraint('students', 'fk_students_batchId');
  },
};
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const fkConstraints = [
      { name: 'fk_students_userId', fields: ['userId'], table: 'users' },
      { name: 'fk_students_sectionId', fields: ['sectionId'], table: 'sections' },
      { name: 'fk_students_batchId', fields: ['batchId'], table: 'batches' },
    ];
    for (const fk of fkConstraints) {
      try {
        await queryInterface.addConstraint('students', {
          type: 'foreign key',
          name: fk.name,
          fields: fk.fields,
          references: { table: fk.table, field: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        });
      } catch (e) {
        if (!e.message.includes('already exists')) throw e;
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('students', 'fk_students_userId');
    await queryInterface.removeConstraint('students', 'fk_students_sectionId');
    await queryInterface.removeConstraint('students', 'fk_students_batchId');
  },
};
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add deletedAt columns to paranoid models (may already exist from sync alter)
    const tables = ['batches', 'sections', 'students', 'subjects', 'lecturers', 'routines'];
    for (const table of tables) {
      try {
        await queryInterface.addColumn(table, 'deletedAt', { type: Sequelize.DATE, allowNull: true });
      } catch (e) {
        if (!e.message.includes('already exists')) throw e;
      }
    }

    // 2. Add sheetId column to attendance (nullable FK)
    try {
      await queryInterface.addColumn('attendance', 'sheetId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Sheets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    } catch (e) {
      if (!e.message.includes('already exists')) throw e;
    }

    // 3. Drop existing unique constraints (safe to ignore if they don't exist)
    try { await queryInterface.removeConstraint('batches', 'batches_name_key'); } catch (e) {}
    try { await queryInterface.removeIndex('batches', 'batches_name_key'); } catch (e) {}
    try { await queryInterface.removeConstraint('batches', 'batches_abbreviation_key'); } catch (e) {}
    try { await queryInterface.removeIndex('batches', 'batches_abbreviation_key'); } catch (e) {}
    try { await queryInterface.removeConstraint('sections', 'sections_name_batchId_key'); } catch (e) {}
    try { await queryInterface.removeIndex('sections', 'sections_name_batchId_key'); } catch (e) {}
    try { await queryInterface.removeIndex('sections', 'sections_name_batch_id'); } catch (e) {}
    try { await queryInterface.removeConstraint('students', 'students_email_key'); } catch (e) {}
    try { await queryInterface.removeIndex('students', 'students_email_key'); } catch (e) {}
    try { await queryInterface.removeConstraint('students', 'students_regNum_key'); } catch (e) {}
    try { await queryInterface.removeIndex('students', 'students_regNum_key'); } catch (e) {}
    try { await queryInterface.removeConstraint('students', 'students_univId_key'); } catch (e) {}
    try { await queryInterface.removeIndex('students', 'students_univId_key'); } catch (e) {}
    try { await queryInterface.removeConstraint('subjects', 'subjects_subjectCode_key'); } catch (e) {}
    try { await queryInterface.removeIndex('subjects', 'subjects_subjectCode_key'); } catch (e) {}
    try { await queryInterface.removeConstraint('Sheets', 'Sheets_sheetId_key'); } catch (e) {}
    try { await queryInterface.removeIndex('Sheets', 'Sheets_sheetId_key'); } catch (e) {}
    try { await queryInterface.removeConstraint('users', 'users_email_key'); } catch (e) {}
    try { await queryInterface.removeIndex('users', 'users_email_key'); } catch (e) {}

    // 4. Create partial unique indexes (WHERE deleted)
    // These allow soft-deleted records to share unique values with active records.
    // Using raw SQL to ensure proper quoting of camelCase column names.
    // paranoid models use deletedAt; Sheets uses status; users uses isActive.
    const partialIndexes = [
      { table: 'batches', fields: ['name'], name: 'batches_name_unique_active', where: '"deletedAt" IS NULL' },
      { table: 'batches', fields: ['abbreviation'], name: 'batches_abbreviation_unique_active', where: '"deletedAt" IS NULL' },
      { table: 'sections', fields: ['name', 'batchId'], name: 'sections_name_batchId_unique_active', where: '"deletedAt" IS NULL' },
      { table: 'students', fields: ['email'], name: 'students_email_unique_active', where: '"deletedAt" IS NULL' },
      { table: 'students', fields: ['regNum'], name: 'students_regNum_unique_active', where: '"deletedAt" IS NULL' },
      { table: 'students', fields: ['univId'], name: 'students_univId_unique_active', where: '"deletedAt" IS NULL' },
      { table: 'subjects', fields: ['subjectCode'], name: 'subjects_subjectCode_unique_active', where: '"deletedAt" IS NULL' },
      { table: 'lecturers', fields: ['email'], name: 'lecturers_email_unique_active', where: '"deletedAt" IS NULL' },
      { table: 'Sheets', fields: ['sheetId'], name: 'Sheets_sheetId_unique_active', where: '"status" = \'active\'' },
      { table: 'users', fields: ['email'], name: 'users_email_unique_active', where: '"isActive" = true' },
    ];
    for (const idx of partialIndexes) {
      const cols = idx.fields.map(f => '"' + f + '"').join(', ');
      try {
        await queryInterface.sequelize.query(
          `CREATE UNIQUE INDEX "${idx.name}" ON "${idx.table}" (${cols}) WHERE ${idx.where}`
        );
      } catch (e) {
        if (!e.message.includes('already exists')) throw e;
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove partial unique indexes
    const allIndexes = [
      'batches_name_unique_active', 'batches_abbreviation_unique_active',
      'sections_name_batchId_unique_active',
      'students_email_unique_active', 'students_regNum_unique_active', 'students_univId_unique_active',
      'subjects_subjectCode_unique_active', 'lecturers_email_unique_active',
      'Sheets_sheetId_unique_active', 'users_email_unique_active',
    ];
    for (const idx of allIndexes) {
      try { await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "${idx}"`); } catch (e) {}
    }

    // Remove deletedAt columns (may not exist on all tables)
    for (const table of ['batches', 'sections', 'students', 'subjects', 'lecturers', 'routines']) {
      try { await queryInterface.removeColumn(table, 'deletedAt'); } catch (e) {}
    }

    // Remove sheetId from attendance
    try { await queryInterface.removeColumn('attendance', 'sheetId'); } catch (e) {}
  },
};

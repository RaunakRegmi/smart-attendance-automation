'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Drop FK constraints on semesterId columns (safe ignore if missing)
    const constraints = [
      { table: 'Sheets', constraint: 'Sheets_semesterId_fkey' },
      { table: 'attendance', constraint: 'attendance_semesterId_fkey' },
      { table: 'routines', constraint: 'routines_semesterId_fkey' },
      { table: 'students', constraint: 'students_currentSemesterId_fkey' },
    ];
    for (const { table, constraint } of constraints) {
      try { await queryInterface.removeConstraint(table, constraint); } catch (e) {}
    }

    // 2. Drop semesterId columns from child tables (safe if missing)
    const cols = [
      ['students', 'currentSemesterId'],
      ['routines', 'semesterId'],
      ['attendance', 'semesterId'],
      ['Sheets', 'semesterId'],
    ];
    for (const [table, column] of cols) {
      try { await queryInterface.removeColumn(table, column); } catch (e) {}
    }

    // 3. Drop the semesters table (safe if missing)
    try { await queryInterface.dropTable('semesters'); } catch (e) {}
  },

  async down(queryInterface, Sequelize) {
    // Re-create the semesters table
    await queryInterface.createTable('semesters', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: Sequelize.STRING, allowNull: false },
      order: { type: Sequelize.INTEGER, allowNull: false },
      batchId: { type: Sequelize.UUID, allowNull: false, references: { model: 'batches', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      startDate: { type: Sequelize.DATEONLY, allowNull: true },
      endDate: { type: Sequelize.DATEONLY, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    // Re-add FK columns
    await queryInterface.addColumn('students', 'currentSemesterId', {
      type: Sequelize.INTEGER, allowNull: true,
      references: { model: 'semesters', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('routines', 'semesterId', {
      type: Sequelize.INTEGER, allowNull: true,
      references: { model: 'semesters', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('attendance', 'semesterId', {
      type: Sequelize.INTEGER, allowNull: true,
      references: { model: 'semesters', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('Sheets', 'semesterId', {
      type: Sequelize.INTEGER, allowNull: true,
      references: { model: 'semesters', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
    });
  },
};

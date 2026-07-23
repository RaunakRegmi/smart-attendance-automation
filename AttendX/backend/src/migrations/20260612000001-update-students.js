'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('students', 'facultyId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'faculties',
        key: 'id',
      },
    });
    await queryInterface.sequelize.query(
      `CREATE TYPE enum_students_gender AS ENUM('Male', 'Female', 'Others')`
    );
    await queryInterface.sequelize.query(`
      ALTER TABLE students
      ALTER COLUMN gender TYPE enum_students_gender
      USING gender::text::enum_students_gender
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('students', 'facultyId');
    await queryInterface.sequelize.query(`
      ALTER TABLE students
      ALTER COLUMN gender TYPE VARCHAR
    `);
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_students_gender');
  },
};

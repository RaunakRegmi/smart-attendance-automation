'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.options.dialect;
    if (dialect === 'postgres') {
      // Check if 'Late' already exists in enum_attendance_status
      const result = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'enum_attendance_status' AND e.enumlabel = 'Late'
        );
      `, { type: Sequelize.QueryTypes.SELECT });
      const exists = result[0] && result[0].exists;
      if (!exists) {
        await queryInterface.sequelize.query(`ALTER TYPE "enum_attendance_status" ADD VALUE 'Late';`);
      } else {
        console.log('Late already exists in enum_attendance_status, skipping.');
      }
    } else if (dialect === 'mysql') {
      // For MySQL, check if Late is in the enum
      const [rows] = await queryInterface.sequelize.query(`SHOW COLUMNS FROM attendance LIKE 'status';`);
      const type = rows[0] && rows[0].Type;
      if (type && !type.includes("'Late'")) {
        await queryInterface.sequelize.query(`ALTER TABLE attendance MODIFY status ENUM('Present', 'Absent', 'Late');`);
      }
    } else {
      throw new Error(`Unsupported dialect for enum modification: ${dialect}`);
    }
  },

  async down(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.options.dialect;
    if (dialect === 'postgres') {
      console.warn('PostgreSQL does not support dropping enum values. Manual intervention required to revert.');
    } else if (dialect === 'mysql') {
      await queryInterface.sequelize.query(`ALTER TABLE attendance MODIFY status ENUM('Present', 'Absent');`);
    }
  },
};
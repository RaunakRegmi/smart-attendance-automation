'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.options.dialect;
    if (dialect === 'postgres') {
      // Check if 'TEACHER' already exists in enum_users_role
      const result = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'enum_users_role' AND e.enumlabel = 'TEACHER'
        );
      `, { type: Sequelize.QueryTypes.SELECT });
      const exists = result[0] && result[0].exists;
      if (!exists) {
        await queryInterface.sequelize.query(`ALTER TYPE "enum_users_role" ADD VALUE 'TEACHER';`);
      } else {
        console.log('TEACHER already exists in enum_users_role, skipping.');
      }
    } else if (dialect === 'mysql') {
      const [rows] = await queryInterface.sequelize.query(`SHOW COLUMNS FROM users LIKE 'role';`);
      const type = rows[0] && rows[0].Type;
      if (type && !type.includes("'TEACHER'")) {
        await queryInterface.sequelize.query(`ALTER TABLE users MODIFY role ENUM('ADMIN', 'STUDENT', 'TEACHER') NOT NULL DEFAULT 'STUDENT';`);
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
      await queryInterface.sequelize.query(`ALTER TABLE users MODIFY role ENUM('ADMIN', 'STUDENT') NOT NULL DEFAULT 'STUDENT';`);
    }
  },
};

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('students', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      gender: { type: Sequelize.STRING, allowNull: true },
      bloodGroup: { type: Sequelize.STRING, allowNull: true },
      regNum: { type: Sequelize.STRING, allowNull: true, unique: true },
      univId: { type: Sequelize.STRING, allowNull: true, unique: true },
      admissionDate: { type: Sequelize.DATEONLY, allowNull: true },
      dob: { type: Sequelize.DATEONLY, allowNull: true },
      faculty: { type: Sequelize.STRING, allowNull: true },
      guardianName: { type: Sequelize.STRING, allowNull: true },
      guardianContact: { type: Sequelize.STRING, allowNull: true },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      sectionId: {
        type: Sequelize.UUID,
        allowNull: true,
        // Foreign key will be added after sections table is created
      },
      batchId: {
        type: Sequelize.UUID,
        allowNull: true,
        // Foreign key will be added after batches table is created
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('students');
  },
};

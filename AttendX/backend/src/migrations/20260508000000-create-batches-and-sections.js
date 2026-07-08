'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create Batches table
    await queryInterface.createTable('batches', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      abbreviation: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
        validate: {
          isUppercase: true,
          isAlphanumeric: true,
        },
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

    // Create Sections table
    await queryInterface.createTable('sections', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      batchId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'batches',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
    await queryInterface.dropTable('sections');
    await queryInterface.dropTable('batches');
  },
};
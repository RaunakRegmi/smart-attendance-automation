const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    dialect: 'postgres',
    logging: false,
  }
);

// Import the User model (includes hooks for password hashing)
const User = require('../models/User');

async function seedData() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database for seeding');

    // Check if admin already exists
    const existing = await User.findOne({ where: { email: 'admin@example.com' } });
    if (existing) {
      // If password is not hashed (plain text), hash it
      if (!existing.password.startsWith('$2')) {
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        existing.password = await bcrypt.hash('admin@123', salt);
        await existing.save();
        console.log('Admin password updated to hashed version');
      } else {
        console.log('Admin user already exists and password is hashed. Skipping seed.');
      }
      return;
    }

    // Create admin user (password will be hashed by model hook)
    await User.create({
      email: 'admin@example.com',
      password: 'admin@123',
      role: 'ADMIN',
      isActive: true,
    });

    console.log('Admin user seeded successfully');
  } catch (err) {
    console.error('Error seeding data:', err.message);
  } finally {
    await sequelize.close();
  }
}

seedData();

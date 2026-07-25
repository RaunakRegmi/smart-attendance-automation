const User = require('../models/User');

/**
 * Seeds (or repairs) the default administrator.
 *
 * Moved out of src/index.js, where it was invoked as a floating promise at module load —
 * i.e. before sequelize.authenticate() and racing app.listen(). startServer() now awaits it,
 * so a booted server is guaranteed to have the admin row.
 *
 * Errors are logged rather than thrown, preserving the original behaviour: a seeding failure
 * must not prevent the server from coming up.
 */
const ensureAdminUser = async () => {
  try {
    const adminUser = await User.findOne({ where: { email: 'admin@example.com' } });
    if (!adminUser) {
      await User.create({
        email: 'admin@example.com',
        password: 'admin@123',
        role: 'ADMIN',
        isActive: true
      });
    } else {
      // Ensure password is hashed; if not, rehash
      if (!adminUser.password.startsWith('$2')) {
        adminUser.password = 'admin@123';
        await adminUser.save(); // triggers beforeUpdate hook
        console.log('Admin password hashed on startup');
      }
    }
  } catch (error) {
    console.error('Failed to ensure admin user:', error);
  }
};

module.exports = ensureAdminUser;

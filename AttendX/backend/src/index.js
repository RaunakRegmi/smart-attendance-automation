require('dotenv').config();

const sequelize = require('./config/database');
const schedulerService = require('./services/schedulerService');
const ensureAdminUser = require('./bootstrap/ensureAdminUser');
const app = require('./app');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    // In Docker, migrations are applied on startup; avoid alter sync wiping/changing schema unexpectedly
    if (process.env.DB_SYNC_ALTER === 'true') {
      await sequelize.sync({ alter: true });
      console.log('Database schema synced (alter mode)');
    }
    await ensureAdminUser();
    if (process.env.DISABLE_BACKGROUND_JOBS === 'true') {
      // Test/CI mode: no scheduler and no BullMQ workers (no Redis required).
      console.log('Background jobs disabled (DISABLE_BACKGROUND_JOBS=true)');
    } else {
      // Start the attendance sync scheduler (auto sync)
      schedulerService.start();
      // Start BullMQ worker to process sheet sync jobs
      require('./workers/sheetSyncWorker');
      // Start BullMQ worker to process sheet append jobs
      require('./workers/sheetAppendWorker');
    }
    return app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Only boot when run directly (`node src/index.js`). Requiring this module — or src/app.js —
// must not open a port, so that Supertest can drive the app in-process and coverage can be
// measured without crossing a `spawn` boundary.
if (require.main === module) {
  startServer();

  // Graceful shutdown for scheduler
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received: stopping scheduler service');
    await schedulerService.stop();
    process.exit(0);
  });
}

module.exports = { app, startServer };

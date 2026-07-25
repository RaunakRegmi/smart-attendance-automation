/**
 * Nothing to tear down at the global level any more: there is no spawned server process, and
 * each worker closes its own Sequelize pool in setupAfterEnv's afterAll.
 *
 * The test database is deliberately left in place — globalSetup drops and recreates it on the
 * next run, and keeping the final state around makes a failure post-mortem possible.
 */
module.exports = async () => {};

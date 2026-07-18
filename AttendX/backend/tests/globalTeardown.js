module.exports = async () => {
  if (global.__TEST_SERVER__) {
    global.__TEST_SERVER__.kill('SIGTERM');
  } else if (process.env.__TEST_SERVER_PID__) {
    try {
      process.kill(Number(process.env.__TEST_SERVER_PID__), 'SIGTERM');
    } catch (_) {
      // already gone
    }
  }
};

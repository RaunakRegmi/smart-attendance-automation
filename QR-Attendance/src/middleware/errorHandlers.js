function notFoundHandler(req, res) {
  res.status(404).json({ message: 'Not found' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}

module.exports = { notFoundHandler, errorHandler };


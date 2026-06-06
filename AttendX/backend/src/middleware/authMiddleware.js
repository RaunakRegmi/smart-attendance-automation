const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateJWT = (req, res, next) => {
  // Allow unauthenticated access to Swagger UI, its JSON spec, and the login endpoint
  if (
    req.path.startsWith('/api-docs') ||
    req.path === '/api/auth/login' ||
    req.path === '/api/health'
  ) {
    return next();
  }
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token' });
      }
      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ success: false, message: 'Authorization token required' });
  }
};

module.exports = authenticateJWT;

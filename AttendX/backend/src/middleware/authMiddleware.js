const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const User = require('../models/User');
require('dotenv').config();

const authenticateJWT = async (req, res, next) => {
  // Allow unauthenticated access to Swagger UI, its JSON spec, and the login endpoint
  if (
    req.path.startsWith('/api-docs') ||
    req.path === '/api/auth/login' ||
    req.path === '/api/auth/reset-password' ||
    req.path === '/api/health' ||
    req.path.startsWith('/api/samples')
  ) {
    return next();
  }
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  // Verify tokenVersion matches the user's current version (token not revoked)
  const user = await User.findByPk(decoded.id, {
    attributes: ['id', 'tokenVersion', 'isActive'],
  });
  if (!user || !user.isActive) {
    return res.status(401).json({ success: false, message: 'Account deactivated or not found' });
  }
  if (user.tokenVersion !== decoded.tokenVersion) {
    return res.status(401).json({ success: false, message: 'Token has been revoked. Please log in again.' });
  }

  req.user = decoded;
  next();
};

module.exports = authenticateJWT;

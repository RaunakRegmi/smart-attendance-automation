const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/errors');
const { db } = require('../db/knex');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw new AppError('Missing or invalid Authorization header', 401);

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db('users')
      .select('id', 'name', 'email', 'phone', 'role')
      .where({ id: payload.sub })
      .first();

    if (!user) throw new AppError('User not found', 401);
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new AppError('Invalid or expired token', 401));
    }
    return next(err);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new AppError('Unauthorized', 401));
    if (!roles.includes(req.user.role)) return next(new AppError('Forbidden', 403));
    return next();
  };
}

module.exports = { requireAuth, requireRole };


/**
 * Middleware to authorize based on user roles.
 * Usage: authorizeRoles('ADMIN'), authorizeRoles('ADMIN', 'STUDENT')
 */
const authorizeRoles = (...allowedRoles) => {
  const guard = (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authorization token required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
  // Introspection seam: the router stack only exposes handler names, and this used to
  // return an anonymous arrow. Naming it and tagging the roles makes the *declared*
  // authorization of every route machine-readable (see tests/helpers/routeWalker.js).
  guard.__allowedRoles = allowedRoles;
  return guard;
};

module.exports = authorizeRoles;

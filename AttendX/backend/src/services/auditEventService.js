const AuditLog = require('../models/AuditLog');

// Explicit, attributed audit rows for teacher/assignment/messaging actions.
// The global audit middleware runs before auth, so its rows usually carry no
// user_id; these rows do. Event types used:
//   teacher.created / teacher.updated / teacher.deactivated
//   teacher.lecturer_linked
//   assignment.added / assignment.removed
//   notification.sent
//   thread.created / message.sent / thread.read
//   oversight.viewed
const logAuditEvent = async (req, eventType, details = {}) => {
  try {
    await AuditLog.create({
      user_id: req.user ? String(req.user.id) : null,
      timestamp: new Date(),
      endpoint: req.originalUrl || '',
      method: req.method || 'SYSTEM',
      route: `${req.baseUrl || ''}${(req.route && req.route.path) || ''}`,
      client_ip: req.ip || (req.connection && req.connection.remoteAddress) || 'unknown',
      request_body: details,
      remote_user: req.user ? `${req.user.role}:${req.user.id}` : null,
      audit_event_type: eventType,
    });
  } catch (error) {
    // Auditing must never break the request itself.
    console.error(`Failed to write audit event ${eventType}:`, error.message);
  }
};

module.exports = { logAuditEvent };

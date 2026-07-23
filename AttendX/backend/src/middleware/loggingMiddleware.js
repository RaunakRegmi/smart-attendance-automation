const AuditLog = require('../models/AuditLog');
var auditApiLogs = function (req, res, next) {
  // Store start time for response time calculation
  req._startTime = Date.now();

  // Log the request
  console.log('API Request - ' + req.originalUrl + ' by ' + (req.user ? req.user.id : 'anonymous'));

  req.logEntry = {
    userId: req.user ? req.user.id : null,
    timestamp: new Date(),
    endpoint: req.originalUrl,
    method: req.method
  };

  // Store audit data for the request
  req._auditData = {
    user_id: req.user ? req.user.id : null,
    timestamp: new Date(),
    endpoint: req.originalUrl,
    method: req.method,
    route: req.route ? req.route.path : req.url,
    client_ip: req.ip || req.connection.remoteAddress || 'unknown',
    request_headers: req.headers,
    authorization_header: req.headers.authorization || null,
    client_agent: req.headers['user-agent'] || null,
    remote_user: (req.user && req.user.email) || (req.user && req.user.username) || null,
    audit_event_type: 'api-access'
  };

  next();
};

var auditResponseLogger = function (req, res, next) {
  var start = req._startTime;
  var auditData = req._auditData;

  var oldSend = res.send;
  var oldJson = res.json;

  res.send = function(data) {
    res._body = data;
    return oldSend.call(this, data);
  };

  var finishAudit = function () {
    if (!auditData) {
      return next();
    }
    AuditLog.create(auditData).then(function() {
      // Successfully saved
    }).catch(function(err) {
      console.error('Failed to save audit log to PostgreSQL:', err);
    });
  };

  res.on('finish', finishAudit);
  res.on('close', finishAudit);

  next();
};

var userActivityLogger = function (req, res, next) {
  var activity = {
    userId: req.user ? req.user.id : null,
    action: req.method + ' ' + req.originalUrl,
    timestamp: new Date()
  };
  console.log('User Activity - ' + JSON.stringify(activity));
  next();
};

module.exports = {
  auditApiLogs: auditApiLogs,
  auditResponseLogger: auditResponseLogger,
  userActivityLogger: userActivityLogger
};
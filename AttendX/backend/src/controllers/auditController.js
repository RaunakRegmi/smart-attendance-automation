const AuditLog = require('../models/AuditLog');

// GET /api/audit/logs?userId=...&start=...&end=...
exports.fetchAllLogs = async (req, res) => {
  try {
    const { userId, start, end, limit = 100, offset = 0 } = req.query;
    const where = {};
    if (userId) where.user_id = userId;
    if (start) where.timestamp = { ...(where.timestamp || {}), $gte: new Date(start) };
    if (end) where.timestamp = { ...(where.timestamp || {}), $lte: new Date(end) };

    const logs = await AuditLog.findAll({
      where,
      order: [['timestamp', 'DESC']],
      limit: Number(limit),
      offset: Number(offset)
    });
    res.json(logs);
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ error: 'Failed to retrieve audit logs' });
  }
};

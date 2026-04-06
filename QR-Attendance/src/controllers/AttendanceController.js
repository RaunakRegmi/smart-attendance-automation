const { AttendanceService } = require('../services/AttendanceService');

const AttendanceController = {
  async startSession(req, res, next) {
    try {
      const session = await AttendanceService.startSession(req.user, req.body);
      res.status(201).json(session);
    } catch (err) {
      next(err);
    }
  },

  async getSession(req, res, next) {
    try {
      const session = await AttendanceService.getSession(req.user, req.params.sessionId);
      res.json(session);
    } catch (err) {
      next(err);
    }
  },

  async scanQr(req, res, next) {
    try {
      const result = await AttendanceService.scanQr(req.user, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async liveAttendance(req, res, next) {
    try {
      const live = await AttendanceService.liveAttendance(req.user, req.params.sessionId);
      res.json(live);
    } catch (err) {
      next(err);
    }
  },

  async createRequest(req, res, next) {
    try {
      const created = await AttendanceService.createRequest(req.user, req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  },

  async approveRequest(req, res, next) {
    try {
      const updated = await AttendanceService.resolveRequest(req.user, req.params.requestId, 'APPROVED');
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },

  async rejectRequest(req, res, next) {
    try {
      const updated = await AttendanceService.resolveRequest(req.user, req.params.requestId, 'REJECTED');
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = { AttendanceController };


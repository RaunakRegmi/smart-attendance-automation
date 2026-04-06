const { ReportService } = require('../services/ReportService');

const ReportController = {
  async studentMe(req, res, next) {
    try {
      const report = await ReportService.studentReport(req.user, req.user.id);
      res.json(report);
    } catch (err) {
      next(err);
    }
  },

  async classReport(req, res, next) {
    try {
      const report = await ReportService.classReport(req.user, req.params.classId);
      res.json(report);
    } catch (err) {
      next(err);
    }
  },

  async monthly(req, res, next) {
    try {
      const report = await ReportService.monthlyReport(req.user, req.query);
      res.json(report);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = { ReportController };


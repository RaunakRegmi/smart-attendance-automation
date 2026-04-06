const { ClassService } = require('../services/ClassService');

const ClassController = {
  async createClass(req, res, next) {
    try {
      const created = await ClassService.createClass(req.user, req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  },

  async listClasses(req, res, next) {
    try {
      const classes = await ClassService.listClasses(req.user);
      res.json(classes);
    } catch (err) {
      next(err);
    }
  },

  async addSchedule(req, res, next) {
    try {
      const schedule = await ClassService.addSchedule(req.user, req.params.classId, req.body);
      res.status(201).json(schedule);
    } catch (err) {
      next(err);
    }
  },

  async enrollStudent(req, res, next) {
    try {
      const result = await ClassService.enrollStudent(req.user, req.params.classId, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async enrollMultipleStudents(req, res, next) {
    try {
      const result = await ClassService.enrollMultipleStudents(req.user, req.params.classId, req.body.students);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = { ClassController };


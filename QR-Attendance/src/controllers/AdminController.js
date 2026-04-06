const { AdminService } = require('../services/AdminService');

const AdminController = {
  async createUser(req, res, next) {
    try {
      const created = await AdminService.createUser(req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  },

  async listUsers(req, res, next) {
    try {
      const users = await AdminService.listUsers(req.query);
      res.json(users);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = { AdminController };


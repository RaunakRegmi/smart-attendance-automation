const { AuthService } = require('../services/AuthService');

const AuthController = {
  async register(req, res, next) {
    try {
      const user = await AuthService.register(req.body);
      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const token = await AuthService.login(req.body);
      res.json(token);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = { AuthController };


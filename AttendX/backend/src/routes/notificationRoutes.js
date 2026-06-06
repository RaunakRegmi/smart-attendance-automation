const express = require('express');
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Middleware to ensure admin role
const ensureAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Admin access required' });
};

// Get all notifications for authenticated student (uses global auth middleware)
router.get('/notifications', notificationController.getNotifications);

// Mark notification as read
router.put('/notifications/:id/read', notificationController.markAsRead);

// Create notification (admin only)
router.post('/notifications', ensureAdmin, notificationController.createNotification);

module.exports = router;
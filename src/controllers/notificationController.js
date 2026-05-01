const { User, Notification } = require('../models');
const NotificationService = require('../services/notificationService');

const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const notifications = await NotificationService.getUserNotifications(userId);
    res.json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const notification = await NotificationService.markAsRead(id, userId);
    res.json({ success: true, data: notification });
  } catch (error) {
    if (error.message === 'Notification not found') {
      return res.status(404).json({ success: false, error: error.message });
    }
    if (error.message === 'Unauthorized to mark this notification as read') {
      return res.status(403).json({ success: false, error: error.message });
    }
    next(error);
  }
};

const createNotification = async (req, res, next) => {
  try {
    const { title, description, category, targetUserId } = req.body;
    const newNotification = await NotificationService.createNotification({
      title,
      description,
      category,
      targetUserId: targetUserId || null
    });
    res.status(201).json({ success: true, data: newNotification });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  createNotification
};
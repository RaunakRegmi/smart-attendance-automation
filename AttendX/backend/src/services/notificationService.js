const Notification = require('../models/Notification');
const User = require('../models/User');

class NotificationService {
  // Get notifications for a specific user
  static async getUserNotifications(userId) {
    // If targetUserId is set, it's for a specific user; otherwise, it's for all (admin broadcast)
    return Notification.findAll({
      where: {
        [require('sequelize').Op.or]: [
          { targetUserId: userId },
          { targetUserId: null }
        ]
      },
      order: [['createdAt', 'DESC']]
    });
  }

  // Mark a notification as read for a user (if they have permission)
  static async markAsRead(notificationId, userId) {
    const notification = await Notification.findByPk(notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }
    // Check if the notification is for this user or a broadcast (targetUserId is null)
    if (notification.targetUserId !== null && notification.targetUserId !== userId) {
      throw new Error('Unauthorized to mark this notification as read');
    }
    return notification.update({ isRead: true });
  }

  // Create a new notification (admin or system)
  static async createNotification(data) {
    return Notification.create(data);
  }
}

module.exports = NotificationService;
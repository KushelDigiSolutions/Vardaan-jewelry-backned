import Notification from '../models/Notification.js';

// Get notifications for current user / global alerts
export const getNotifications = async (req, res, next) => {
  try {
    const query = {
      $or: [
        { user: req.user._id },
        { user: null } // System-wide notifications
      ]
    };

    const notifications = await Notification.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
};

// Mark notification as read
export const markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

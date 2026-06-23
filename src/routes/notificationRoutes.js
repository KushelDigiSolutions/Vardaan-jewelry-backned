import express from 'express';
import {
  getNotifications,
  markNotificationRead
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // Notifications require login

router.get('/', getNotifications);
router.put('/:id/read', markNotificationRead);

export default router;

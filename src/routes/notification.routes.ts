import { Router } from 'express';
import {
  getNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  getUnreadCount,
} from '@controllers/notification.controller.js';
import { authenticate, restrictTo } from '@middlewares/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/unread/count', getUnreadCount);
router.get('/', getNotifications);
router.get('/:id', getNotificationById);

router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);

router.delete('/:id', deleteNotification);

// Admin only
router.post('/', restrictTo('admin', 'superadmin'), createNotification);

export default router;


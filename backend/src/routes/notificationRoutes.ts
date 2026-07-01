import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} from '../controllers/notificationController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticate, getNotifications);
router.get('/unread-count', authenticate, getUnreadCount);
router.patch('/mark-all-read', authenticate, markAllAsRead);
router.patch('/:id/read', authenticate, markAsRead);
router.delete('/:id', authenticate, deleteNotification);

export default router;

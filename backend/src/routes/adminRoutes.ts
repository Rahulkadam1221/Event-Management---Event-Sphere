import { Router } from 'express';
import { z } from 'zod';
import {
  getUsers,
  getUserById,
  updateUserRole,
  toggleUserStatus,
  getDashboardStats,
  getAdminEvents,
  updateEventStatus,
  toggleEventFeatured,
  toggleEventTrending,
  getAdminPayments,
  refundBooking,
  getAdminAuditLogs,
  getAdminAnalytics,
} from '../controllers/adminController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';

const router = Router();

// Zod validation schemas
const updateRoleSchema = z.object({
  role: z.enum(['ATTENDEE', 'ORGANIZER', 'ADMIN']),
});

const updateEventStatusSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED']),
});

// All admin routes require authentication + ADMIN role
router.use(authenticate, authorize('ADMIN'));

router.get('/stats', getDashboardStats);
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/role', validate(updateRoleSchema), updateUserRole);
router.patch('/users/:id/toggle-status', toggleUserStatus);

// Events management routes
router.get('/events', getAdminEvents);
router.patch('/events/:id/status', validate(updateEventStatusSchema), updateEventStatus);
router.patch('/events/:id/toggle-featured', toggleEventFeatured);
router.patch('/events/:id/toggle-trending', toggleEventTrending);

// Payments & Refunds
router.get('/payments', getAdminPayments);
router.post('/payments/:bookingId/refund', refundBooking);

// Audit logs
router.get('/audit-logs', getAdminAuditLogs);

// Global platform analytics
router.get('/analytics', getAdminAnalytics);

export default router;

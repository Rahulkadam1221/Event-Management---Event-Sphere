import { Router } from 'express';
import { z } from 'zod';
import {
  getTicketTiers,
  createTicketTier,
  updateTicketTier,
  deleteTicketTier,
  getCoupons,
  createCoupon,
  validateCoupon,
} from '../controllers/ticketController';
import {
  getMyTickets,
  getTicketPdf,
  verifyTicketCode,
  getAttendanceStats,
  getAttendanceLogs,
} from '../controllers/attendeeTicketController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';

const router = Router();

// Zod validation schemas
const ticketTierSchema = z.object({
  name: z.string().min(1, 'Ticket tier name is required').max(100),
  type: z.enum(['FREE', 'GENERAL', 'VIP', 'STUDENT']),
  price: z.number().min(0, 'Price must be non-negative'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  description: z.string().max(300, 'Description is too long').optional().nullable(),
  perks: z.array(z.string().max(100)).optional(),
});

const updateTicketTierSchema = ticketTierSchema.partial();

const createCouponSchema = z.object({
  code: z.string().min(3, 'Code must be at least 3 characters').max(20, 'Code is too long').regex(/^[A-Z0-9]+$/, 'Code must be alphanumeric and uppercase'),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().positive('Discount value must be positive'),
  minOrderAmount: z.number().nonnegative('Minimum order amount must be non-negative').default(0),
  maxUses: z.number().int().positive('Max uses must be a positive integer').optional().nullable(),
  expiresAt: z.string().refine(val => !isNaN(Date.parse(val)), { message: 'Invalid expiration date format' }).optional().nullable(),
});

const verifyTicketSchema = z.object({
  code: z.string().min(1, 'Ticket verification code is required').max(300),
  action: z.enum(['CHECK_IN', 'CHECK_OUT']).optional(),
});

// Ticket tiers
router.get('/events/:eventId/tiers', getTicketTiers);
router.post('/events/:eventId/tiers', authenticate, authorize('ORGANIZER', 'ADMIN'), validate(ticketTierSchema), createTicketTier);
router.patch('/tiers/:tierId', authenticate, authorize('ORGANIZER', 'ADMIN'), validate(updateTicketTierSchema), updateTicketTier);
router.delete('/tiers/:tierId', authenticate, authorize('ORGANIZER', 'ADMIN'), deleteTicketTier);

// Coupons
router.get('/coupons', authenticate, authorize('ADMIN'), getCoupons);
router.post('/coupons', authenticate, authorize('ADMIN'), validate(createCouponSchema), createCoupon);
router.post('/coupons/validate', authenticate, validateCoupon);

// Attendee Tickets
router.get('/my', authenticate, getMyTickets);
router.get('/:id/pdf', authenticate, getTicketPdf);

// Gate check-in scan verification
router.post('/verify', authenticate, authorize('ORGANIZER', 'ADMIN'), validate(verifyTicketSchema), verifyTicketCode);

// Attendance Statistics & Logs
router.get('/events/:eventId/attendance/stats', authenticate, authorize('ORGANIZER', 'ADMIN'), getAttendanceStats);
router.get('/events/:eventId/attendance/logs', authenticate, authorize('ORGANIZER', 'ADMIN'), getAttendanceLogs);

export default router;

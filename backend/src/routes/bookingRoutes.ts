import { Router } from 'express';
import { z } from 'zod';
import {
  createBooking,
  getUserBookings,
  getBookingById,
  checkInBooking,
  confirmPayment,
  cancelBooking,
  getEventBookings,
  validateCoupon,
} from '../controllers/bookingController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';
import { bookingRateLimit } from '../middleware/rateLimiter';

const router = Router();

// Zod validation schemas
const createBookingSchema = z.object({
  eventId: z.string().uuid('Invalid Event ID format'),
  ticketTierId: z.string().uuid('Invalid Ticket Tier ID format'),
  ticketCount: z.number().int().min(1, 'Must book at least 1 ticket').max(10, 'Cannot book more than 10 tickets at once'),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional().nullable(),
  couponCode: z.string().max(50, 'Coupon code is too long').optional().nullable(),
});

const confirmPaymentSchema = z.object({
  bookingId: z.string().uuid('Invalid Booking ID format'),
  paymentId: z.string().min(1, 'Payment ID is required').max(100),
  paymentOrderId: z.string().min(1, 'Payment Order ID is required').max(100),
  paymentSignature: z.string().min(1, 'Payment Signature is required').max(256),
});

const validateCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required').max(50),
  eventId: z.string().uuid('Invalid Event ID format'),
  ticketTierId: z.string().uuid('Invalid Ticket Tier ID format'),
  ticketCount: z.number().int().min(1, 'Ticket count must be at least 1'),
});

router.post('/', authenticate, bookingRateLimit, validate(createBookingSchema), createBooking);
router.get('/my', authenticate, getUserBookings);
router.get('/event/:eventId', authenticate, authorize('ORGANIZER', 'ADMIN'), getEventBookings);
router.post('/confirm-payment', authenticate, bookingRateLimit, validate(confirmPaymentSchema), confirmPayment);
router.post('/coupons/validate', authenticate, validate(validateCouponSchema), validateCoupon);
router.get('/:id', authenticate, getBookingById);
router.patch('/:id/check-in', authenticate, authorize('ORGANIZER', 'ADMIN'), checkInBooking);
router.patch('/:id/cancel', authenticate, cancelBooking);

export default router;

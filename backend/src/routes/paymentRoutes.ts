import { Router } from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { refundBooking } from '../controllers/bookingController';
import { PrismaClient, BookingStatus, PaymentStatus } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { CustomError } from '../utils/customError';
import { paymentService } from '../services/paymentService';
import { ticketService } from '../services/ticketService';
import { logger } from '../utils/logger';
import QRCode from 'qrcode';
import { AuthenticatedRequest } from '../types';

const prisma = new PrismaClient();
const router = Router();

// 1. Webhook processing endpoint
router.post('/webhook', asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'dummyWebhookSecret';
  
  // Since express.json() is mounted globally, req.body is already an object.
  const rawBody = JSON.stringify(req.body);
  const isValid = paymentService.verifyWebhookSignature(rawBody, signature, webhookSecret);
  
  if (!isValid && process.env.NODE_ENV === 'production') {
    logger.warn('Invalid Razorpay webhook signature');
    throw CustomError.badRequest('Invalid signature');
  }

  const eventType = req.body.event;
  const payload = req.body.payload;

  logger.info(`Received Razorpay Webhook [${eventType}]`);

  if (eventType === 'order.paid' || eventType === 'payment.captured') {
    const paymentEntity = payload.payment.entity;
    const orderId = paymentEntity.order_id;
    const paymentId = paymentEntity.id;

    // Find corresponding booking
    const booking = await prisma.booking.findFirst({
      where: { paymentOrderId: orderId },
    });

    if (booking && booking.status !== BookingStatus.CONFIRMED) {
      // Confirms the booking in case frontend failed to submit confirmation
      const qrData = JSON.stringify({ bookingId: booking.id, ref: booking.bookingReference });
      const qrCode = await QRCode.toDataURL(qrData);

      await prisma.$transaction([
        prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.CONFIRMED,
            paymentId,
            qrCode,
          },
        }),
        prisma.ticketTier.update({
          where: { id: booking.ticketTierId },
          data: { sold: { increment: booking.ticketCount } },
        }),
        prisma.event.update({
          where: { id: booking.eventId },
          data: { availableSeats: { decrement: booking.ticketCount } },
        }),
        prisma.payment.upsert({
          where: { paymentReference: paymentId },
          create: {
            paymentReference: paymentId,
            amount: booking.totalAmount,
            status: PaymentStatus.SUCCESS,
            method: paymentEntity.method || 'CARD',
            gateway: 'RAZORPAY',
            bookingId: booking.id,
          },
          update: {
            status: PaymentStatus.SUCCESS,
          }
        }),
      ]);
      logger.info(`Webhook successfully processed order payment success for booking ${booking.id}`);

      // Trigger ticket generation, PDF drawing, and emailing asynchronously
      ticketService.processConfirmedBooking(booking.id).catch(err => {
        logger.error(`Error generating tickets in background from webhook for booking ${booking.id}:`, err);
      });
    }
  } else if (eventType === 'refund.processed') {
    const refundEntity = payload.refund.entity;
    const paymentId = refundEntity.payment_id;
    const refundId = refundEntity.id;

    const payment = await prisma.payment.findUnique({
      where: { paymentReference: paymentId },
      include: { booking: true },
    });

    if (payment && payment.booking.status !== BookingStatus.REFUNDED) {
      const booking = payment.booking;
      
      await prisma.$transaction([
        prisma.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.REFUNDED },
        }),
        prisma.ticketTier.update({
          where: { id: booking.ticketTierId },
          data: { sold: { decrement: booking.ticketCount } },
        }),
        prisma.event.update({
          where: { id: booking.eventId },
          data: { availableSeats: { increment: booking.ticketCount } },
        }),
        prisma.payment.create({
          data: {
            paymentReference: refundId,
            amount: booking.totalAmount,
            status: PaymentStatus.REFUNDED,
            method: 'REFUND',
            gateway: 'RAZORPAY',
            bookingId: booking.id,
          },
        }),
      ]);
      logger.info(`Webhook processed refund.processed for booking ${booking.id}`);
    }
  }

  sendSuccess(res, null, 'Webhook processed successfully');
}));

// 2. Transaction history endpoint
router.get('/history', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;

  let payments;
  if (userRole === 'ADMIN') {
    payments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        booking: {
          include: {
            event: { select: { title: true, category: true, startDate: true } },
            ticketTier: { select: { name: true } },
            user: { select: { name: true, email: true } },
          },
        },
      },
    });
  } else if (userRole === 'ORGANIZER') {
    payments = await prisma.payment.findMany({
      where: {
        booking: {
          event: { organizerId: userId },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        booking: {
          include: {
            event: { select: { title: true, category: true, startDate: true } },
            ticketTier: { select: { name: true } },
            user: { select: { name: true, email: true } },
          },
        },
      },
    });
  } else {
    payments = await prisma.payment.findMany({
      where: {
        booking: {
          userId: userId,
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        booking: {
          include: {
            event: { select: { title: true, category: true, startDate: true } },
            ticketTier: { select: { name: true } },
          },
        },
      },
    });
  }

  sendSuccess(res, payments, 'Transaction history fetched');
}));

// 3. Admin / Organizer refund trigger
router.post('/refund/:id', authenticate, authorize('ORGANIZER', 'ADMIN'), refundBooking);

export default router;

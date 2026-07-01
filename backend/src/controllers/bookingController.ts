import { Response } from 'express';
import { PrismaClient, BookingStatus } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { CustomError } from '../utils/customError';
import { AuthenticatedRequest, getPaginationParams, getPaginationMeta } from '../types';
import QRCode from 'qrcode';
import { paymentService } from '../services/paymentService';
import { ticketService } from '../services/ticketService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export const createBooking = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { eventId, ticketTierId, ticketCount, couponCode } = req.body;

  const [event, tier] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId } }),
    prisma.ticketTier.findUnique({ where: { id: ticketTierId } }),
  ]);

  if (!event) throw CustomError.notFound('Event not found');
  if (!tier) throw CustomError.notFound('Ticket tier not found');
  if (tier.quantity - tier.sold < ticketCount) throw CustomError.badRequest('Not enough seats available');
  if (event.availableSeats < ticketCount) throw CustomError.badRequest('Not enough event capacity');

  let discountAmount = 0;
  if (couponCode) {
    const coupon = await prisma.coupon.findFirst({
      where: { code: couponCode.toUpperCase(), isActive: true },
    });
    if (coupon) {
      const subtotalForCoupon = tier.price * ticketCount;
      if (subtotalForCoupon >= coupon.minOrderAmount) {
        discountAmount =
          coupon.discountType === 'percentage'
            ? (subtotalForCoupon * coupon.discountValue) / 100
            : Math.min(coupon.discountValue, subtotalForCoupon);
      }
    }
  }

  const subtotal = tier.price * ticketCount;
  const taxAmount = (subtotal - discountAmount) * 0.18;
  const totalAmount = subtotal - discountAmount + taxAmount;

  let paymentOrderId = null;
  if (totalAmount > 0) {
    try {
      const order = await paymentService.createOrder(eventId, totalAmount);
      paymentOrderId = order.id;
    } catch (error) {
      throw CustomError.internal('Failed to generate payment gateway order');
    }
  }

  const booking = await prisma.booking.create({
    data: {
      userId: req.user!.id,
      eventId,
      ticketTierId,
      ticketCount,
      unitPrice: tier.price,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
      couponCode: couponCode?.toUpperCase(),
      status: totalAmount === 0 ? BookingStatus.CONFIRMED : BookingStatus.PENDING,
      paymentOrderId,
    },
    include: {
      event: { select: { id: true, title: true, startDate: true, venue: true } },
      ticketTier: { select: { id: true, name: true, type: true } },
    },
  });

  if (booking.status === BookingStatus.CONFIRMED) {
    const qrData = JSON.stringify({ bookingId: booking.id, ref: booking.bookingReference });
    const qrCode = await QRCode.toDataURL(qrData);
    await prisma.booking.update({ where: { id: booking.id }, data: { qrCode } });
    
    // Automatically generate individual tickets, PDF, and send confirmation email for free bookings
    ticketService.processConfirmedBooking(booking.id).catch(err => {
      logger.error(`Error generating tickets in background for free booking ${booking.id}:`, err);
    });
  }

  sendSuccess(res, booking, 'Booking created', 201);
});

export const getUserBookings = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, string>);
  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where: { userId: req.user!.id },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            bannerUrl: true,
            startDate: true,
            venue: true,
            city: true,
          },
        },
        ticketTier: { select: { id: true, name: true, type: true } },
      },
    }),
    prisma.booking.count({ where: { userId: req.user!.id } }),
  ]);
  sendSuccess(res, bookings, 'Bookings fetched', 200, getPaginationMeta(total, page, limit));
});

export const getBookingById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
    include: {
      event: true,
      ticketTier: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!booking) throw CustomError.notFound('Booking not found');
  sendSuccess(res, booking, 'Booking fetched');
});

export const checkInBooking = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { event: true },
  });
  if (!booking) throw CustomError.notFound('Booking not found');
  if (booking.event.organizerId !== req.user!.id && req.user!.role !== 'ADMIN') {
    throw CustomError.forbidden();
  }
  if (booking.checkedIn) throw CustomError.conflict('Already checked in');
  if (booking.status !== BookingStatus.CONFIRMED) throw CustomError.badRequest('Booking not confirmed');

  const updated = await prisma.booking.update({
    where: { id },
    data: { checkedIn: true, checkedInAt: new Date() },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  sendSuccess(res, updated, 'Checked in successfully');
});

export const confirmPayment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { bookingId, paymentId, paymentOrderId, paymentSignature } = req.body;
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, userId: req.user!.id },
  });
  if (!booking) throw CustomError.notFound('Booking not found');

  // Verify Razorpay Payment Signature
  const isValid = paymentService.verifyPayment(
    paymentOrderId || booking.paymentOrderId || '',
    paymentId,
    paymentSignature
  );
  if (!isValid) {
    throw CustomError.badRequest('Payment signature verification failed');
  }

  const qrData = JSON.stringify({ bookingId: booking.id, ref: booking.bookingReference });
  const qrCode = await QRCode.toDataURL(qrData);

  const [updated] = await prisma.$transaction([
    prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CONFIRMED,
        paymentId,
        paymentOrderId,
        paymentSignature,
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
    prisma.payment.create({
      data: {
        paymentReference: paymentId,
        amount: booking.totalAmount,
        status: 'SUCCESS',
        method: 'CARD',
        gateway: 'RAZORPAY',
        bookingId: booking.id,
      },
    }),
  ]);

  // Trigger ticket generation, PDF drawing, and emailing asynchronously
  ticketService.processConfirmedBooking(bookingId).catch(err => {
    logger.error(`Error generating tickets in background for booking ${bookingId}:`, err);
  });

  sendSuccess(res, updated, 'Payment confirmed');
});

export const refundBooking = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params; // booking ID
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { event: true },
  });

  if (!booking) throw CustomError.notFound('Booking not found');
  if (booking.status !== BookingStatus.CONFIRMED) {
    throw CustomError.badRequest('Only confirmed bookings can be refunded');
  }
  if (!booking.paymentId) {
    throw CustomError.badRequest('No payment record found for this booking');
  }

  // Restrict to organizer or admin
  if (booking.event.organizerId !== req.user!.id && req.user!.role !== 'ADMIN') {
    throw CustomError.forbidden('Only organizers or administrators can refund payments');
  }

  try {
    const refund = await paymentService.refundPayment(booking.paymentId, booking.totalAmount);
    
    const [updated] = await prisma.$transaction([
      prisma.booking.update({
        where: { id },
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
          paymentReference: refund.id,
          amount: booking.totalAmount,
          status: 'REFUNDED',
          method: 'REFUND',
          gateway: 'RAZORPAY',
          bookingId: booking.id,
        },
      }),
    ]);

    sendSuccess(res, updated, 'Booking refunded successfully');
  } catch (error: any) {
    logger.error('Refund processing error', error);
    throw CustomError.badRequest(error?.message || 'Refund failed');
  }
});

export const cancelBooking = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const booking = await prisma.booking.findFirst({
    where: { id, userId: req.user!.id },
  });
  if (!booking) throw CustomError.notFound('Booking not found');
  if (booking.status === BookingStatus.CANCELLED) throw CustomError.conflict('Booking already cancelled');

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: BookingStatus.CANCELLED },
  });

  if (booking.status === BookingStatus.CONFIRMED) {
    await prisma.$transaction([
      prisma.ticketTier.update({
        where: { id: booking.ticketTierId },
        data: { sold: { decrement: booking.ticketCount } },
      }),
      prisma.event.update({
        where: { id: booking.eventId },
        data: { availableSeats: { increment: booking.ticketCount } },
      }),
    ]);
  }

  sendSuccess(res, updated, 'Booking cancelled');
});

export const getEventBookings = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, string>);

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw CustomError.notFound('Event not found');
  if (event.organizerId !== req.user!.id && req.user!.role !== 'ADMIN') {
    throw CustomError.forbidden();
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where: { eventId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
        ticketTier: { select: { id: true, name: true, type: true } },
        tickets: {
          include: {
            attendances: {
              select: {
                checkedInAt: true,
                scanner: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.booking.count({ where: { eventId } }),
  ]);

  // Reconstruct validationCode using signature helper for frontend copy-paste convenience
  const bookingsWithValidation = bookings.map((b) => {
    const ticketsWithCode = b.tickets.map((t) => {
      const sig = ticketService.generateSignature(t.id);
      return {
        ...t,
        validationCode: `TIC-${t.id}.${sig}`,
      };
    });
    return {
      ...b,
      tickets: ticketsWithCode,
    };
  });

  sendSuccess(res, bookingsWithValidation, 'Event bookings fetched', 200, getPaginationMeta(total, page, limit));
});

export const validateCoupon = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { code, amount } = req.body;
  if (!code) throw CustomError.badRequest('Coupon code is required');

  const coupon = await prisma.coupon.findFirst({
    where: { code: code.toUpperCase(), isActive: true },
  });

  if (!coupon) {
    throw CustomError.notFound('Invalid or inactive coupon code');
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw CustomError.badRequest('Coupon has expired');
  }

  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    throw CustomError.badRequest('Coupon usage limit reached');
  }

  if (amount !== undefined && amount < coupon.minOrderAmount) {
    throw CustomError.badRequest(`Minimum order amount of ₹${coupon.minOrderAmount} required`);
  }

  sendSuccess(res, coupon, 'Coupon is valid');
});


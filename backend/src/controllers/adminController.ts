import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { CustomError } from '../utils/customError';
import { AuthenticatedRequest, getPaginationParams, getPaginationMeta } from '../types';
import { sendEventCancellationEmail } from '../services/emailService';

const prisma = new PrismaClient();

// Helper to record audit logs
export const logAudit = async (
  action: string,
  target: string,
  details: string,
  performedBy: string,
  ipAddress?: string
) => {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        target,
        details,
        performedBy,
        ipAddress,
      },
    });
  } catch (error) {
    console.error('Audit logging failed:', error);
  }
};

export const getUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, string>);
  const { search, role } = req.query as Record<string, string>;

  const where: Record<string, any> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (role) where.role = role;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
        _count: { select: { bookings: true, organizedEvents: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  sendSuccess(res, users, 'Users fetched', 200, getPaginationMeta(total, page, limit));
});

export const getUserById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
      bio: true,
      phone: true,
      isVerified: true,
      isActive: true,
      createdAt: true,
      _count: { select: { bookings: true, organizedEvents: true } },
    },
  });
  if (!user) throw CustomError.notFound('User not found');
  sendSuccess(res, user, 'User fetched');
});

export const updateUserRole = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;

  const user = await prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, email: true, name: true, role: true },
  });

  await logAudit(
    'USER_ROLE_UPDATE',
    `User ${id}`,
    `Updated role of user ${user.name} (${user.email}) to ${role}`,
    req.user!.email,
    req.ip
  );

  sendSuccess(res, user, 'User role updated');
});

export const toggleUserStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw CustomError.notFound('User not found');

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: !user.isActive },
    select: { id: true, email: true, name: true, isActive: true },
  });

  await logAudit(
    'USER_STATUS_TOGGLE',
    `User ${id}`,
    `${updated.isActive ? 'Activated' : 'Deactivated'} account of user ${updated.name} (${updated.email})`,
    req.user!.email,
    req.ip
  );

  sendSuccess(res, updated, `User ${updated.isActive ? 'activated' : 'deactivated'}`);
});

export const getDashboardStats = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const [
    totalUsers,
    totalEvents,
    totalBookings,
    totalRevenue,
    recentBookings,
    eventsByCategory,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.event.count(),
    prisma.booking.count(),
    prisma.booking.aggregate({
      where: { status: 'CONFIRMED' },
      _sum: { totalAmount: true },
    }),
    prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        event: { select: { id: true, title: true } },
      },
    }),
    prisma.event.groupBy({
      by: ['category'],
      _count: { category: true },
    }),
  ]);

  sendSuccess(res, {
    stats: {
      totalUsers,
      totalEvents,
      totalBookings,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
    },
    recentBookings,
    eventsByCategory,
  }, 'Dashboard stats fetched');
});

// New Admin controllers
export const getAdminEvents = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, string>);
  const { search, status } = req.query as Record<string, string>;

  const where: any = {};
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { venue: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (status) where.status = status;

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        organizer: { select: { id: true, name: true, email: true } },
        _count: { select: { bookings: true } },
      },
    }),
    prisma.event.count({ where }),
  ]);

  sendSuccess(res, events, 'Admin events fetched', 200, getPaginationMeta(total, page, limit));
});

export const updateEventStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw CustomError.notFound('Event not found');

  const updated = await prisma.event.update({
    where: { id },
    data: { status },
  });

  await logAudit(
    'EVENT_STATUS_UPDATE',
    `Event ${id}`,
    `Updated status of event "${event.title}" to ${status}`,
    req.user!.email,
    req.ip
  );

  sendSuccess(res, updated, `Event status updated to ${status}`);
});

export const toggleEventFeatured = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw CustomError.notFound('Event not found');

  const updated = await prisma.event.update({
    where: { id },
    data: { isFeatured: !event.isFeatured },
  });

  await logAudit(
    'EVENT_FEATURE_TOGGLE',
    `Event ${id}`,
    `${updated.isFeatured ? 'Featured' : 'Unfeatured'} event "${event.title}"`,
    req.user!.email,
    req.ip
  );

  sendSuccess(res, updated, `Event featured state toggled to ${updated.isFeatured}`);
});

export const toggleEventTrending = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw CustomError.notFound('Event not found');

  const updated = await prisma.event.update({
    where: { id },
    data: { isTrending: !event.isTrending },
  });

  await logAudit(
    'EVENT_TRENDING_TOGGLE',
    `Event ${id}`,
    `${updated.isTrending ? 'Marked' : 'Unmarked'} event "${event.title}" as trending`,
    req.user!.email,
    req.ip
  );

  sendSuccess(res, updated, `Event trending state toggled to ${updated.isTrending}`);
});

export const getAdminPayments = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, string>);
  const { search } = req.query as Record<string, string>;

  const where: any = {};
  if (search) {
    where.OR = [
      { bookingReference: { contains: search, mode: 'insensitive' } },
      { paymentId: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        event: { select: { id: true, title: true } },
        ticketTier: { select: { id: true, name: true } },
      },
    }),
    prisma.booking.count({ where }),
  ]);

  sendSuccess(res, bookings, 'Admin payments fetched', 200, getPaginationMeta(total, page, limit));
});

export const refundBooking = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { bookingId } = req.params;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { user: true, event: true },
  });

  if (!booking) throw CustomError.notFound('Booking not found');
  if (booking.status === 'REFUNDED') throw CustomError.badRequest('Booking already refunded');

  // Process refund state update
  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'REFUNDED' },
  });

  // Restore seats
  await prisma.event.update({
    where: { id: booking.eventId },
    data: {
      availableSeats: {
        increment: booking.ticketCount,
      },
    },
  });

  // Dispatch cancellation/refund email
  try {
    await sendEventCancellationEmail(booking.user.email, booking.user.name, booking.event.title);
  } catch (err) {
    console.error('Failed to send refund email:', err);
  }

  await logAudit(
    'PAYMENT_REFUND',
    `Booking ${bookingId}`,
    `Refunded ₹${booking.totalAmount} for booking ${booking.bookingReference} (user: ${booking.user.email})`,
    req.user!.email,
    req.ip
  );

  sendSuccess(res, updatedBooking, 'Booking refunded successfully');
});

export const getAdminAuditLogs = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, string>);

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.count(),
  ]);

  sendSuccess(res, logs, 'Admin audit logs fetched', 200, getPaginationMeta(total, page, limit));
});

export const getAdminAnalytics = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  // Aggregate stats
  const totalRevenueResult = await prisma.booking.aggregate({
    where: { status: 'CONFIRMED' },
    _sum: { totalAmount: true },
  });
  const totalUsers = await prisma.user.count();
  const totalEvents = await prisma.event.count();
  const totalBookings = await prisma.booking.count();

  // User growth
  const users = await prisma.user.findMany({
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  const userGrowthMap: Record<string, number> = {};
  users.forEach(u => {
    const month = u.createdAt.toISOString().slice(0, 7);
    userGrowthMap[month] = (userGrowthMap[month] || 0) + 1;
  });
  const userGrowthTimeline = Object.entries(userGrowthMap).map(([month, count]) => ({ month, registrations: count }));

  // Gross monthly sales
  const confirmedBookings = await prisma.booking.findMany({
    where: { status: 'CONFIRMED' },
    select: { totalAmount: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  const salesMap: Record<string, number> = {};
  confirmedBookings.forEach(b => {
    const month = b.createdAt.toISOString().slice(0, 7);
    salesMap[month] = (salesMap[month] || 0) + b.totalAmount;
  });
  const salesTimeline = Object.entries(salesMap).map(([month, amount]) => ({ month, sales: Math.round(amount) }));

  // Ticket categories split
  const eventCategories = await prisma.event.groupBy({
    by: ['category'],
    _count: { id: true },
  });
  const categorySplit = eventCategories.map(cat => ({
    name: cat.category,
    value: cat._count.id,
  }));

  sendSuccess(res, {
    summary: {
      totalRevenue: totalRevenueResult._sum.totalAmount || 0,
      totalUsers,
      totalEvents,
      totalBookings,
    },
    userGrowthTimeline,
    salesTimeline,
    categorySplit,
  }, 'Admin analytics fetched');
});

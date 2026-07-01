import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { CustomError } from '../utils/customError';
import { AuthenticatedRequest } from '../types';

const prisma = new PrismaClient();

export const getOrganizerAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const organizerId = req.user!.id;
  const { eventId } = req.query;

  // 1. Fetch all events owned by organizer to resolve IDs
  const organizerEvents = await prisma.event.findMany({
    where: { organizerId },
    select: { id: true, title: true }
  });

  const eventIds = organizerEvents.map(e => e.id);

  if (eventIds.length === 0) {
    // Return empty stats if organizer has no events
    return sendSuccess(res, {
      kpis: {
        totalRevenue: 0,
        totalBookings: 0,
        ticketsSold: 0,
        avgOrderValue: 0,
        conversionRate: 0,
        attendanceRate: 0
      },
      charts: {
        revenueTimeline: [],
        bookingStatusDistribution: [],
        popularEvents: [],
        salesHeatmap: []
      }
    }, 'No events found for organizer');
  }

  // 2. Determine event scoping
  let targetEventIds = eventIds;
  if (eventId && eventId !== 'all') {
    const singleEventId = eventId as string;
    if (!eventIds.includes(singleEventId)) {
      throw CustomError.forbidden('You are not authorized to view analytics for this event');
    }
    targetEventIds = [singleEventId];
  }

  // 3. Fetch bookings for target events
  const bookings = await prisma.booking.findMany({
    where: { eventId: { in: targetEventIds } },
    orderBy: { createdAt: 'asc' }
  });

  // 4. Fetch tickets check-in counts
  const totalTicketsCount = await prisma.ticket.count({
    where: { 
      booking: { eventId: { in: targetEventIds } },
      status: 'ACTIVE'
    }
  });

  const checkedInTicketsCount = await prisma.ticket.count({
    where: { 
      booking: { eventId: { in: targetEventIds } },
      status: 'ACTIVE',
      isCheckedIn: true
    }
  });

  // 5. Calculate Core KPIs
  const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED');
  const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.totalAmount, 0);
  const ticketsSold = confirmedBookings.reduce((sum, b) => sum + b.ticketCount, 0);
  const totalBookings = bookings.length;
  const avgOrderValue = confirmedBookings.length > 0 ? Math.round(totalRevenue / confirmedBookings.length) : 0;
  const conversionRate = totalBookings > 0 ? Math.round((confirmedBookings.length / totalBookings) * 100) : 0;
  const attendanceRate = totalTicketsCount > 0 ? Math.round((checkedInTicketsCount / totalTicketsCount) * 100) : 0;

  // 6. Generate Revenue Timeline (Last 30 Days)
  const timelineMap: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    timelineMap[dateStr] = 0;
  }

  confirmedBookings.forEach(b => {
    const dateStr = new Date(b.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (timelineMap[dateStr] !== undefined) {
      timelineMap[dateStr] += b.totalAmount;
    }
  });

  const revenueTimeline = Object.entries(timelineMap).map(([name, sales]) => ({ name, sales }));

  // 7. Booking Status Distribution (Pie Chart)
  const statusCounts = { CONFIRMED: 0, PENDING: 0, CANCELLED: 0, REFUNDED: 0 };
  bookings.forEach(b => {
    if (statusCounts[b.status] !== undefined) {
      statusCounts[b.status]++;
    }
  });

  const bookingStatusDistribution = Object.entries(statusCounts).map(([name, value]) => ({
    name: name === 'CONFIRMED' ? 'Confirmed' : name === 'PENDING' ? 'Pending' : name === 'CANCELLED' ? 'Cancelled' : 'Refunded',
    value
  }));

  // 8. Popular Campaigns (Bar Chart)
  const eventStats: Record<string, { name: string; tickets: number; revenue: number }> = {};
  
  // Initialize target events
  const targetEvents = organizerEvents.filter(e => targetEventIds.includes(e.id));
  targetEvents.forEach(e => {
    eventStats[e.id] = { name: e.title, tickets: 0, revenue: 0 };
  });

  confirmedBookings.forEach(b => {
    if (eventStats[b.eventId]) {
      eventStats[b.eventId].tickets += b.ticketCount;
      eventStats[b.eventId].revenue += b.totalAmount;
    }
  });

  const popularEvents = Object.values(eventStats)
    .sort((a, b) => b.tickets - a.tickets)
    .slice(0, 5);

  // 9. Day of Week / Hour of Day Sales Heatmap
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const heatmapData: any[] = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      heatmapData.push({ day: daysOfWeek[d], hour: h, count: 0 });
    }
  }

  bookings.forEach(b => {
    const date = new Date(b.createdAt);
    const dayStr = daysOfWeek[date.getDay()];
    const hour = date.getHours();
    const cell = heatmapData.find(c => c.day === dayStr && c.hour === hour);
    if (cell) {
      cell.count++;
    }
  });

  return sendSuccess(res, {
    kpis: {
      totalRevenue,
      totalBookings,
      ticketsSold,
      avgOrderValue,
      conversionRate,
      attendanceRate
    },
    charts: {
      revenueTimeline,
      bookingStatusDistribution,
      popularEvents,
      salesHeatmap: heatmapData
    }
  }, 'Organizer analytics metrics fetched successfully');
});

import { Request, Response } from 'express';
import { PrismaClient, EventStatus } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { CustomError } from '../utils/customError';
import { AuthenticatedRequest, getPaginationParams, getPaginationMeta } from '../types';
import { uniqueSlug } from '../utils/slugify';
import { sendEventUpdateEmail, sendEventCancellationEmail } from '../services/emailService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export const getEvents = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, string>);
  const {
    search,
    category,
    city,
    startDate,
    minPrice,
    maxPrice,
    status,
    featured,
    trending,
    sort = 'startDate',
  } = req.query as Record<string, string>;

  const where: Record<string, any> = {
    status: status || EventStatus.PUBLISHED,
  };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
      { tags: { has: search } },
    ];
  }
  if (category) where.category = { equals: category, mode: 'insensitive' };
  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (startDate) where.startDate = { gte: new Date(startDate) };
  if (featured === 'true') where.isFeatured = true;
  if (trending === 'true') where.isTrending = true;

  if (minPrice || maxPrice) {
    const min = minPrice ? parseFloat(minPrice) : NaN;
    const max = maxPrice ? parseFloat(maxPrice) : NaN;
    const priceFilter: Record<string, number> = {};
    if (!isNaN(min)) priceFilter.gte = min;
    if (!isNaN(max)) priceFilter.lte = max;
    
    if (Object.keys(priceFilter).length > 0) {
      where.ticketTiers = {
        some: {
          price: priceFilter,
          isActive: true,
        },
      };
    }
  }

  // Parse sorting parameter
  let sortBy = 'startDate';
  let sortOrder: 'asc' | 'desc' = 'asc';

  if (sort.startsWith('-')) {
    sortBy = sort.substring(1);
    sortOrder = 'desc';
  } else {
    sortBy = sort;
    sortOrder = 'asc';
  }

  const validEventFields = [
    'title', 'category', 'city', 'startDate', 'endDate',
    'capacity', 'availableSeats', 'isFeatured', 'isTrending',
    'createdAt', 'updatedAt'
  ];

  let orderBy: any = {};
  let sortInMemory = false;

  if (sortBy === 'price') {
    sortInMemory = true;
  } else if (validEventFields.includes(sortBy)) {
    orderBy = { [sortBy]: sortOrder };
  } else {
    orderBy = { createdAt: 'desc' };
  }

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      ...(sortInMemory ? {} : { skip, take: limit }),
      orderBy: sortInMemory ? undefined : orderBy,
      include: {
        organizer: { select: { id: true, name: true, avatar: true } },
        ticketTiers: {
          where: { isActive: true },
          select: { id: true, name: true, type: true, price: true, quantity: true, sold: true },
        },
        _count: { select: { bookings: true } },
      },
    }),
    prisma.event.count({ where }),
  ]);

  let finalEvents = events;
  if (sortInMemory) {
    finalEvents.sort((a, b) => {
      const priceA = a.ticketTiers.length > 0 ? Math.min(...a.ticketTiers.map(t => t.price)) : 0;
      const priceB = b.ticketTiers.length > 0 ? Math.min(...b.ticketTiers.map(t => t.price)) : 0;
      return sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
    });
    finalEvents = finalEvents.slice(skip, skip + limit);
  }

  // Cache list of events for 60 seconds
  res.setHeader('Cache-Control', 'public, max-age=60');
  sendSuccess(res, finalEvents, 'Events fetched', 200, getPaginationMeta(total, page, limit));
});

export const getEventById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const event = await prisma.event.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: {
      organizer: { select: { id: true, name: true, avatar: true, bio: true } },
      ticketTiers: { where: { isActive: true }, orderBy: { price: 'asc' } },
      _count: { select: { bookings: true, messages: true } },
    },
  });
  if (!event) throw CustomError.notFound('Event not found');
  // Individual event details must never be cached at the HTTP layer to ensure live tickets/edits are visible
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  sendSuccess(res, event, 'Event fetched');
});

export const createEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { ticketTiers, ...eventData } = req.body;
  const slug = uniqueSlug(eventData.title);

  const event = await prisma.event.create({
    data: {
      ...eventData,
      startDate: new Date(eventData.startDate),
      endDate: new Date(eventData.endDate),
      slug,
      organizerId: req.user!.id,
      availableSeats: eventData.capacity,
      ticketTiers: ticketTiers ? {
        create: ticketTiers.map((tier: any) => ({
          name: tier.name,
          type: tier.type,
          price: Number(tier.price),
          quantity: Number(tier.quantity),
          description: tier.description || null,
          perks: tier.perks || [],
        }))
      } : undefined,
    },
    include: {
      ticketTiers: true,
      organizer: { select: { id: true, name: true } },
    },
  });
  sendSuccess(res, event, 'Event created', 201);
});

export const updateEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const event = await prisma.event.findFirst({ where: { id } });
  if (!event) throw CustomError.notFound('Event not found');
  if (event.organizerId !== req.user!.id && req.user!.role !== 'ADMIN') {
    throw CustomError.forbidden();
  }

  const updateData = { ...req.body };
  if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
  if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

  // Check if critical details or status changed
  const dateChanged = updateData.startDate && updateData.startDate.getTime() !== event.startDate.getTime();
  const startTimeChanged = updateData.startTime && updateData.startTime !== event.startTime;
  const venueChanged = updateData.venue && updateData.venue !== event.venue;
  const addressChanged = updateData.address && updateData.address !== event.address;
  const isDetailsChanged = dateChanged || startTimeChanged || venueChanged || addressChanged;

  const statusChangedToCancelled = updateData.status === 'CANCELLED' && event.status !== 'CANCELLED';

  // Synchronize ticket tiers if passed in payload
  if (updateData.ticketTiers) {
    const tiersToSync = updateData.ticketTiers;
    delete updateData.ticketTiers;

    for (const tier of tiersToSync) {
      if (tier.id) {
        // Update existing tier
        await prisma.ticketTier.update({
          where: { id: tier.id },
          data: {
            name: tier.name,
            type: tier.type,
            price: Number(tier.price),
            quantity: Number(tier.quantity),
            description: tier.description || null,
            perks: tier.perks || [],
          },
        });
      } else {
        // Create new tier for this event
        await prisma.ticketTier.create({
          data: {
            eventId: id,
            name: tier.name,
            type: tier.type,
            price: Number(tier.price),
            quantity: Number(tier.quantity),
            description: tier.description || null,
            perks: tier.perks || [],
          },
        });
      }
    }

    // Safely deactivate any database tiers that were removed in the edit form
    const incomingIds = tiersToSync.map((t: any) => t.id).filter(Boolean);
    await prisma.ticketTier.updateMany({
      where: {
        eventId: id,
        id: { notIn: incomingIds },
      },
      data: { isActive: false },
    });
  }

  const updated = await prisma.event.update({
    where: { id },
    data: updateData,
    include: { ticketTiers: true },
  });

  // Fetch confirmed bookings for notifications
  const bookings = await prisma.booking.findMany({
    where: { eventId: id, status: 'CONFIRMED' },
    include: { user: true },
  });

  if (bookings.length > 0) {
    if (statusChangedToCancelled) {
      // Send cancellation emails
      Promise.all(bookings.map(b => 
        sendEventCancellationEmail(b.user.email, b.user.name, event.title)
      )).catch(err => logger.error('Failed to send cancellation emails', err));
    } else if (isDetailsChanged) {
      // Build changes summary
      const changes: string[] = [];
      if (dateChanged) {
        const oldDate = event.startDate.toLocaleDateString('en-US', { dateStyle: 'long' });
        const newDate = updateData.startDate.toLocaleDateString('en-US', { dateStyle: 'long' });
        changes.push(`Date changed from <strong>${oldDate}</strong> to <strong>${newDate}</strong>`);
      }
      if (startTimeChanged) {
        changes.push(`Start Time changed from <strong>${event.startTime}</strong> to <strong>${updateData.startTime}</strong>`);
      }
      if (venueChanged || addressChanged) {
        const oldVenue = event.venue + (event.address ? `, ${event.address}` : '');
        const newVenue = (updateData.venue || event.venue) + (updateData.address ? `, ${updateData.address}` : (event.address ? `, ${event.address}` : ''));
        changes.push(`Venue changed from <strong>${oldVenue}</strong> to <strong>${newVenue}</strong>`);
      }
      
      const changesSummary = changes.join('<br/>');
      const formattedDate = (updateData.startDate || event.startDate).toLocaleDateString('en-US', { dateStyle: 'long' });
      const currentVenue = updateData.venue || event.venue;

      // Send update emails
      Promise.all(bookings.map(b => 
        sendEventUpdateEmail(
          b.user.email,
          b.user.name,
          event.title,
          changesSummary,
          formattedDate,
          currentVenue,
          event.slug
        )
      )).catch(err => logger.error('Failed to send event update emails', err));
    }
  }

  sendSuccess(res, updated, 'Event updated');
});

export const deleteEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const event = await prisma.event.findFirst({ where: { id } });
  if (!event) throw CustomError.notFound('Event not found');
  if (event.organizerId !== req.user!.id && req.user!.role !== 'ADMIN') {
    throw CustomError.forbidden();
  }

  const bookings = await prisma.booking.findMany({
    where: { eventId: id, status: 'CONFIRMED' },
    include: { user: true },
  });

  await prisma.event.delete({ where: { id } });

  // Send cancellation emails asynchronously on deletion
  if (bookings.length > 0) {
    Promise.all(bookings.map(b => 
      sendEventCancellationEmail(b.user.email, b.user.name, event.title)
    )).catch(err => logger.error('Failed to send cancellation emails on deletion', err));
  }

  sendSuccess(res, null, 'Event deleted');
});

export const getOrganizerEvents = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, string>);
  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where: { organizerId: req.user!.id },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        ticketTiers: true,
        _count: { select: { bookings: true } },
      },
    }),
    prisma.event.count({ where: { organizerId: req.user!.id } }),
  ]);
  sendSuccess(res, events, 'Organizer events fetched', 200, getPaginationMeta(total, page, limit));
});

export const getFeaturedEvents = asyncHandler(async (_req: Request, res: Response) => {
  const events = await prisma.event.findMany({
    where: { isFeatured: true, status: EventStatus.PUBLISHED },
    take: 6,
    orderBy: { createdAt: 'desc' },
    include: {
      organizer: { select: { id: true, name: true, avatar: true } },
      ticketTiers: { where: { isActive: true }, orderBy: { price: 'asc' }, take: 1 },
    },
  });
  // Cache featured events for 120 seconds (2 minutes)
  res.setHeader('Cache-Control', 'public, max-age=120');
  sendSuccess(res, events, 'Featured events fetched');
});

export const getCategories = asyncHandler(async (_req: Request, res: Response) => {
  const cats = await prisma.event.groupBy({
    by: ['category'],
    where: { status: EventStatus.PUBLISHED },
    _count: { category: true },
    orderBy: { _count: { category: 'desc' } },
  });
  // Cache category groupings for 300 seconds (5 minutes)
  res.setHeader('Cache-Control', 'public, max-age=300');
  sendSuccess(res, cats, 'Categories fetched');
});

export const publishEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const event = await prisma.event.findFirst({
    where: { id },
    include: { ticketTiers: true },
  });
  if (!event) throw CustomError.notFound('Event not found');

  if (event.organizerId !== req.user!.id && req.user!.role !== 'ADMIN') {
    throw CustomError.forbidden('You are not authorized to publish this event');
  }

  if (event.ticketTiers.length === 0) {
    throw CustomError.badRequest('Cannot publish event without at least one ticket tier');
  }

  const updated = await prisma.event.update({
    where: { id },
    data: { status: EventStatus.PUBLISHED },
    include: { ticketTiers: true },
  });

  sendSuccess(res, updated, 'Event published successfully');
});

export const toggleSaveEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;
  const userId = req.user!.id;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw CustomError.notFound('Event not found');

  const existingSave = await prisma.savedEvent.findUnique({
    where: {
      userId_eventId: { userId, eventId },
    },
  });

  if (existingSave) {
    await prisma.savedEvent.delete({
      where: {
        userId_eventId: { userId, eventId },
      },
    });
    sendSuccess(res, { saved: false }, 'Event unsaved successfully');
  } else {
    const saved = await prisma.savedEvent.create({
      data: { userId, eventId },
    });
    sendSuccess(res, { saved: true, data: saved }, 'Event saved successfully');
  }
});

export const getSavedEvents = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const saved = await prisma.savedEvent.findMany({
    where: { userId },
    include: {
      event: {
        include: {
          organizer: { select: { id: true, name: true, avatar: true } },
          ticketTiers: { where: { isActive: true }, orderBy: { price: 'asc' } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const events = saved.map((s) => s.event);
  sendSuccess(res, events, 'Saved events fetched successfully');
});


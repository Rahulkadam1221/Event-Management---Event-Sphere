import { Router } from 'express';
import { z } from 'zod';
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getOrganizerEvents,
  getFeaturedEvents,
  getCategories,
  publishEvent,
  toggleSaveEvent,
  getSavedEvents,
} from '../controllers/eventController';
import { getOrganizerAnalytics } from '../controllers/analyticsController';
import { authenticate, authorize, optionalAuth } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';

const router = Router();

const ticketTierSchema = z.object({
  id: z.string().uuid('Invalid ticket tier ID format').optional(),
  name: z.string().min(1, 'Ticket tier name is required'),
  type: z.enum(['FREE', 'GENERAL', 'VIP', 'STUDENT']),
  price: z.number().min(0, 'Price must be non-negative'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  description: z.string().optional().nullable(),
  perks: z.array(z.string()).optional(),
  sold: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

const createEventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(150),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  shortDesc: z.string().max(250).optional(),
  bannerUrl: z.string().url('Invalid banner URL').or(z.string().length(0)).optional().or(z.literal('')),
  category: z.string().min(1, 'Category is required'),
  tags: z.array(z.string()).optional(),
  venue: z.string().min(1, 'Venue is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  country: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  startDate: z.string().refine(val => !isNaN(Date.parse(val)), { message: 'Invalid start date format' }),
  endDate: z.string().refine(val => !isNaN(Date.parse(val)), { message: 'Invalid end date format' }),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  capacity: z.number().int().positive('Capacity must be a positive integer'),
  ticketTiers: z.array(ticketTierSchema).min(1, 'At least one ticket tier is required'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED']).optional(),
});

const updateEventSchema = createEventSchema.partial();

// Public routes
router.get('/', optionalAuth, getEvents);
router.get('/featured', getFeaturedEvents);
router.get('/categories', getCategories);
router.get('/my-events', authenticate, authorize('ORGANIZER', 'ADMIN'), getOrganizerEvents);
router.get('/saved', authenticate, getSavedEvents);
router.get('/analytics/organizer', authenticate, authorize('ORGANIZER', 'ADMIN'), getOrganizerAnalytics);
router.get('/:id', optionalAuth, getEventById);

// Protected routes
router.post('/', authenticate, authorize('ORGANIZER', 'ADMIN'), validate(createEventSchema), createEvent);
router.patch('/:id', authenticate, authorize('ORGANIZER', 'ADMIN'), validate(updateEventSchema), updateEvent);
router.delete('/:id', authenticate, authorize('ORGANIZER', 'ADMIN'), deleteEvent);
router.post('/:id/publish', authenticate, authorize('ORGANIZER', 'ADMIN'), publishEvent);
router.post('/:eventId/save', authenticate, toggleSaveEvent);

export default router;

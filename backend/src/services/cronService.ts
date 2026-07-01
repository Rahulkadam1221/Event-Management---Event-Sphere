import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { 
  send24HourReminderEmail, 
  send1HourReminderEmail 
} from './emailService';

const prisma = new PrismaClient();

// Helper to format event date
const formatEventDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const initCronJobs = (): void => {
  logger.info('⏰ Initialize Cron Jobs Scheduler...');

  // Schedule to run every 15 minutes: */15 * * * *
  cron.schedule('*/15 * * * *', async () => {
    logger.debug('Running upcoming events reminder scan...');
    const now = new Date();

    try {
      // --- 1. SCAN FOR 24-HOUR REMINDERS ---
      const target24hMin = new Date(now.getTime() + 23 * 60 * 60 * 1000);
      const target24hMax = new Date(now.getTime() + 25 * 60 * 60 * 1000);

      const bookings24h = await prisma.booking.findMany({
        where: {
          status: 'CONFIRMED',
          reminderSent24h: false,
          event: {
            startDate: {
              gte: target24hMin,
              lte: target24hMax,
            }
          }
        },
        include: {
          user: true,
          event: true,
        }
      });

      if (bookings24h.length > 0) {
        logger.info(`Found ${bookings24h.length} bookings needing 24-hour reminder...`);
        for (const booking of bookings24h) {
          const userEmail = booking.user.email;
          const userName = booking.user.name;
          const eventTitle = booking.event.title;
          const eventDateStr = formatEventDate(booking.event.startDate);
          const startTime = booking.event.startTime;
          const venue = booking.event.venue;

          // Dispatch email
          await send24HourReminderEmail(
            userEmail,
            userName,
            eventTitle,
            eventDateStr,
            startTime,
            venue
          );

          // Update flag in database
          await prisma.booking.update({
            where: { id: booking.id },
            data: { reminderSent24h: true }
          });
        }
      }

      // --- 2. SCAN FOR 1-HOUR REMINDERS ---
      const target1hMin = new Date(now.getTime() + 45 * 60 * 1000);
      const target1hMax = new Date(now.getTime() + 75 * 60 * 1000);

      const bookings1h = await prisma.booking.findMany({
        where: {
          status: 'CONFIRMED',
          reminderSent1h: false,
          event: {
            startDate: {
              gte: target1hMin,
              lte: target1hMax,
            }
          }
        },
        include: {
          user: true,
          event: true,
        }
      });

      if (bookings1h.length > 0) {
        logger.info(`Found ${bookings1h.length} bookings needing 1-hour reminder...`);
        for (const booking of bookings1h) {
          const userEmail = booking.user.email;
          const userName = booking.user.name;
          const eventTitle = booking.event.title;
          const startTime = booking.event.startTime;
          const venue = booking.event.venue;
          const checkInCode = booking.bookingReference;

          // Dispatch email
          await send1HourReminderEmail(
            userEmail,
            userName,
            eventTitle,
            venue,
            startTime,
            checkInCode
          );

          // Update flag in database
          await prisma.booking.update({
            where: { id: booking.id },
            data: { reminderSent1h: true }
          });
        }
      }

    } catch (error) {
      logger.error('Error occurred during upcoming reminders cron scan', error);
    }
  });

  logger.success('✅ Cron Jobs Scheduler initialized successfully');
};

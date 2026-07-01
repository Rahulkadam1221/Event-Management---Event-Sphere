import 'dotenv/config';
import http from 'http';
import { PrismaClient } from '@prisma/client';
import { createApp } from './app';
import { setupSocketIO } from './services/socketService';
import { initCronJobs } from './services/cronService';
import { logger } from './utils/logger';
import { config } from './utils/config';

const startServer = async (): Promise<void> => {
  try {
    // DEBUG: Log what DATABASE_URL Prisma is receiving
    const dbUrl = process.env.DATABASE_URL || '(not set)';
    const directUrl = process.env.DIRECT_URL || '(not set)';
    console.log(`[DEBUG] DATABASE_URL starts with: "${dbUrl.substring(0, 15)}..." (length: ${dbUrl.length})`);
    console.log(`[DEBUG] DIRECT_URL starts with: "${directUrl.substring(0, 15)}..." (length: ${directUrl.length})`);
    console.log(`[DEBUG] All env keys: ${Object.keys(process.env).filter(k => k.includes('DATA') || k.includes('DIRECT') || k.includes('DB')).join(', ')}`);

    const prisma = new PrismaClient();
    // Test DB connection
    await prisma.$connect();
    logger.success('Database connected successfully');

    const app = createApp();
    const httpServer = http.createServer(app);

    // Setup Socket.IO
    const io = setupSocketIO(httpServer, config.frontendUrl);
    logger.success('Socket.IO initialized');

    // Initialize Cron Jobs
    initCronJobs();

    // Make io accessible from app (for use in controllers if needed)
    app.set('io', io);

    httpServer.listen(config.port, () => {
      logger.success(`🚀 EventSphere API running on port ${config.port}`);
      logger.info(`📝 Environment: ${config.env}`);
      logger.info(`🌐 Frontend URL: ${config.frontendUrl}`);
      logger.info(`❤️  Health check: http://localhost:${config.port}/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
      logger.warn(`${signal} received. Starting graceful shutdown...`);
      httpServer.close(async () => {
        await prisma.$disconnect();
        logger.info('Database disconnected');
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('Unhandled Rejection', reason);
      process.exit(1);
    });

    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception', { message: error.message, stack: error.stack });
      process.exit(1);
    });

  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to start server', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    } else {
      logger.error('Failed to start server', error);
    }
    process.exit(1);
  }
};

startServer();

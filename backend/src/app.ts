import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './utils/config';
import { loggingMiddleware } from './middleware/loggingMiddleware';
import { errorMiddleware, notFoundMiddleware } from './middleware/errorMiddleware';
import { defaultRateLimit } from './middleware/rateLimiter';

// Routes
import authRoutes from './routes/authRoutes';
import eventRoutes from './routes/eventRoutes';
import bookingRoutes from './routes/bookingRoutes';
import messageRoutes from './routes/messageRoutes';
import notificationRoutes from './routes/notificationRoutes';
import adminRoutes from './routes/adminRoutes';
import ticketRoutes from './routes/ticketRoutes';
import paymentRoutes from './routes/paymentRoutes';

export const createApp = (): Application => {
  const app = express();

  // Enable trust proxy for accurate IP tracking behind Railway's reverse proxy
  app.set('trust proxy', 1);

  // Security middleware
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // CORS
  const allowedOrigins = [
    config.frontendUrl.replace(/\/+$/, ''),
    'http://localhost:5173',
    'http://localhost:3000',
  ];
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || config.env === 'development') {
        callback(null, true);
      } else if (allowedOrigins.includes(origin.replace(/\/+$/, ''))) {
        callback(null, origin); // Reflect the actual request origin
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Compression
  app.use(compression());

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Logging
  app.use(loggingMiddleware);

  // Rate limiting
  app.use('/api/', defaultRateLimit);

  // Health check
  app.get('/health', (_req, res) => {
    res.status(200).json({
      success: true,
      message: 'EventSphere API is running',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: config.env,
    });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/events/:eventId/messages', messageRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/payments', paymentRoutes);

  // 404 handler
  app.use(notFoundMiddleware);

  // Error handler (must be last)
  app.use(errorMiddleware);

  return app;
};

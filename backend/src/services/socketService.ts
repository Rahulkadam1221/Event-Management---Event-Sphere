import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyAccessToken } from '../utils/tokenUtils';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export const setupSocketIO = (httpServer: HttpServer, frontendUrl: string): SocketIOServer => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (process.env.NODE_ENV === 'development' || !origin) {
          callback(null, true);
        } else {
          callback(null, frontendUrl);
        }
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication token required'));
    }
    try {
      const decoded = verifyAccessToken(token);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`Socket connected: ${socket.id} (user: ${socket.user?.name})`);

    // Join event room
    socket.on('join:event', (eventId: string) => {
      socket.join(`event:${eventId}`);
      logger.debug(`User ${socket.user?.name} joined event room: ${eventId}`);
      socket.to(`event:${eventId}`).emit('user:joined', {
        userId: socket.user?.id,
        name: socket.user?.name,
      });
    });

    // Leave event room
    socket.on('leave:event', (eventId: string) => {
      socket.leave(`event:${eventId}`);
      socket.to(`event:${eventId}`).emit('user:left', {
        userId: socket.user?.id,
        name: socket.user?.name,
      });
    });

    // Send message
    socket.on('message:send', async (data: { eventId: string; text: string }) => {
      if (!socket.user) return;

      try {
        const message = await prisma.message.create({
          data: {
            text: data.text,
            eventId: data.eventId,
            userId: socket.user.id,
          },
          include: {
            user: { select: { id: true, name: true, avatar: true } },
            reactions: true,
          },
        });

        io.to(`event:${data.eventId}`).emit('message:new', message);
      } catch (err) {
        logger.error('Socket message error', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing:start', (eventId: string) => {
      socket.to(`event:${eventId}`).emit('typing:start', {
        userId: socket.user?.id,
        name: socket.user?.name,
      });
    });

    socket.on('typing:stop', (eventId: string) => {
      socket.to(`event:${eventId}`).emit('typing:stop', {
        userId: socket.user?.id,
      });
    });

    // Join user-specific room for notifications
    if (socket.user) {
      socket.join(`user:${socket.user.id}`);
    }

    socket.on('disconnect', (reason) => {
      logger.debug(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
};

export const emitToUser = (io: SocketIOServer, userId: string, event: string, data: unknown): void => {
  io.to(`user:${userId}`).emit(event, data);
};

export const emitToEventRoom = (io: SocketIOServer, eventId: string, event: string, data: unknown): void => {
  io.to(`event:${eventId}`).emit(event, data);
};

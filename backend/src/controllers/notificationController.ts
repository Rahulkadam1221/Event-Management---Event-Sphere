import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { CustomError } from '../utils/customError';
import { AuthenticatedRequest, getPaginationParams, getPaginationMeta } from '../types';

const prisma = new PrismaClient();

export const getNotifications = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, string>);

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: req.user!.id },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        event: { select: { id: true, title: true, slug: true } },
      },
    }),
    prisma.notification.count({ where: { userId: req.user!.id } }),
  ]);

  sendSuccess(res, notifications, 'Notifications fetched', 200, getPaginationMeta(total, page, limit));
});

export const markAsRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const notification = await prisma.notification.findFirst({
    where: { id, userId: req.user!.id },
  });
  if (!notification) throw CustomError.notFound('Notification not found');

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
  sendSuccess(res, updated, 'Notification marked as read');
});

export const markAllAsRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, isRead: false },
    data: { isRead: true },
  });
  sendSuccess(res, null, 'All notifications marked as read');
});

export const deleteNotification = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const notification = await prisma.notification.findFirst({
    where: { id, userId: req.user!.id },
  });
  if (!notification) throw CustomError.notFound('Notification not found');

  await prisma.notification.delete({ where: { id } });
  sendSuccess(res, null, 'Notification deleted');
});

export const getUnreadCount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const count = await prisma.notification.count({
    where: { userId: req.user!.id, isRead: false },
  });
  sendSuccess(res, { count }, 'Unread count fetched');
});

export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: string,
  eventId?: string
): Promise<void> => {
  await prisma.notification.create({
    data: { userId, title, message, type, eventId },
  });
};

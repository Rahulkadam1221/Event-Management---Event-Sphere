import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { CustomError } from '../utils/customError';
import { AuthenticatedRequest, getPaginationParams, getPaginationMeta } from '../types';

const prisma = new PrismaClient();

export const getEventMessages = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, string>);

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where: { eventId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        reactions: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.message.count({ where: { eventId } }),
  ]);
  sendSuccess(res, messages.reverse(), 'Messages fetched', 200, getPaginationMeta(total, page, limit));
});

export const createMessage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;
  const { text } = req.body;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw CustomError.notFound('Event not found');

  const message = await prisma.message.create({
    data: { text, eventId, userId: req.user!.id },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
      reactions: true,
    },
  });
  sendSuccess(res, message, 'Message sent', 201);
});

export const deleteMessage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { messageId } = req.params;
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { event: true },
  });
  if (!message) throw CustomError.notFound('Message not found');

  const canDelete =
    message.userId === req.user!.id ||
    message.event.organizerId === req.user!.id ||
    req.user!.role === 'ADMIN';

  if (!canDelete) throw CustomError.forbidden();

  await prisma.message.delete({ where: { id: messageId } });
  sendSuccess(res, null, 'Message deleted');
});

export const toggleReaction = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { messageId } = req.params;
  const { emoji } = req.body;

  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) throw CustomError.notFound('Message not found');

  const existing = await prisma.messageReaction.findUnique({
    where: {
      messageId_userId_emoji: {
        messageId,
        userId: req.user!.id,
        emoji,
      },
    },
  });

  if (existing) {
    await prisma.messageReaction.delete({ where: { id: existing.id } });
    sendSuccess(res, { removed: true }, 'Reaction removed');
  } else {
    const reaction = await prisma.messageReaction.create({
      data: { messageId, userId: req.user!.id, emoji },
      include: { user: { select: { id: true, name: true } } },
    });
    sendSuccess(res, reaction, 'Reaction added', 201);
  }
});

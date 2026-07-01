import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { CustomError } from '../utils/customError';
import { AuthenticatedRequest, getPaginationParams, getPaginationMeta } from '../types';

const prisma = new PrismaClient();

export const getTicketTiers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;
  const tiers = await prisma.ticketTier.findMany({
    where: { eventId, isActive: true },
    orderBy: { price: 'asc' },
  });
  sendSuccess(res, tiers, 'Ticket tiers fetched');
});

export const createTicketTier = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw CustomError.notFound('Event not found');
  if (event.organizerId !== req.user!.id && req.user!.role !== 'ADMIN') {
    throw CustomError.forbidden();
  }

  const tier = await prisma.ticketTier.create({
    data: { ...req.body, eventId },
  });
  sendSuccess(res, tier, 'Ticket tier created', 201);
});

export const updateTicketTier = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { tierId } = req.params;
  const tier = await prisma.ticketTier.findUnique({
    where: { id: tierId },
    include: { event: true },
  });
  if (!tier) throw CustomError.notFound('Ticket tier not found');
  if (tier.event.organizerId !== req.user!.id && req.user!.role !== 'ADMIN') {
    throw CustomError.forbidden();
  }

  const updated = await prisma.ticketTier.update({
    where: { id: tierId },
    data: req.body,
  });
  sendSuccess(res, updated, 'Ticket tier updated');
});

export const deleteTicketTier = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { tierId } = req.params;
  const tier = await prisma.ticketTier.findUnique({
    where: { id: tierId },
    include: { event: true },
  });
  if (!tier) throw CustomError.notFound('Ticket tier not found');
  if (tier.event.organizerId !== req.user!.id && req.user!.role !== 'ADMIN') {
    throw CustomError.forbidden();
  }

  await prisma.ticketTier.delete({ where: { id: tierId } });
  sendSuccess(res, null, 'Ticket tier deleted');
});

export const getCoupons = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const { page, limit, skip } = getPaginationParams({});
  const [coupons, total] = await Promise.all([
    prisma.coupon.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.coupon.count(),
  ]);
  sendSuccess(res, coupons, 'Coupons fetched', 200, getPaginationMeta(total, page, limit));
});

export const createCoupon = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const coupon = await prisma.coupon.create({ data: _req.body });
  sendSuccess(res, coupon, 'Coupon created', 201);
});

export const validateCoupon = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { code, amount } = req.body;
  const coupon = await prisma.coupon.findFirst({
    where: { code: code.toUpperCase(), isActive: true },
  });
  if (!coupon) throw CustomError.notFound('Invalid coupon code');
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw CustomError.badRequest('Coupon has expired');
  }
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    throw CustomError.badRequest('Coupon usage limit reached');
  }
  if (amount < coupon.minOrderAmount) {
    throw CustomError.badRequest(`Minimum order amount is ₹${coupon.minOrderAmount}`);
  }

  const discountAmount =
    coupon.discountType === 'percentage'
      ? (amount * coupon.discountValue) / 100
      : Math.min(coupon.discountValue, amount);

  sendSuccess(res, { coupon, discountAmount }, 'Coupon valid');
});

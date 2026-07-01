import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { config } from '../utils/config';
import { AuthenticatedRequest } from '../types';

// Custom key generator that maps requests by user.id if logged in, or fallback to remote client IP
const getIpUserKey = (req: Request): string => {
  const authReq = req as AuthenticatedRequest;
  if (authReq.user && authReq.user.id) {
    return `user:${authReq.user.id}`;
  }
  return req.ip || req.headers['x-forwarded-for'] as string || 'unknown-ip';
};

export const defaultRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  keyGenerator: getIpUserKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // limit to 15 authentication actions per key window
  keyGenerator: getIpUserKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
});

export const bookingRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // limit to 10 booking actions per minute to prevent scalping/ticket bot spam
  keyGenerator: getIpUserKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many booking attempts. Please wait a minute and try again.',
  },
});

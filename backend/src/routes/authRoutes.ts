import { Router } from 'express';
import { z } from 'zod';
import {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  googleLogin,
  verifyEmail,
  resendVerification,
} from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';
import { authRateLimit } from '../middleware/rateLimiter';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  role: z.enum(['ATTENDEE', 'ORGANIZER']).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const googleAuthSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
  googleId: z.string().min(1, 'Google ID is required'),
  avatar: z.string().url().optional(),
});

const verifyEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().min(1, 'Verification code is required'),
});

const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
});

router.post('/register', authRateLimit, validate(registerSchema), register);
router.post('/login', authRateLimit, validate(loginSchema), login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateProfile);
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);
router.post('/forgot-password', authRateLimit, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authRateLimit, validate(resetPasswordSchema), resetPassword);
router.post('/google', authRateLimit, validate(googleAuthSchema), googleLogin);
router.post('/verify-email', authRateLimit, validate(verifyEmailSchema), verifyEmail);
router.post('/resend-verification', authRateLimit, validate(resendVerificationSchema), resendVerification);

export default router;

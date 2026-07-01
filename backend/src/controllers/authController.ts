import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { CustomError } from '../utils/customError';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/tokenUtils';
import { AuthenticatedRequest } from '../types';

const prisma = new PrismaClient();

// In-memory code and token storage (in a production app, use Redis or a DB table)
const verificationCodes = new Map<string, { code: string; expires: number }>();
const resetTokens = new Map<string, { token: string; expires: number }>();

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name, role } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw CustomError.conflict('Email already registered');

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: role === 'ORGANIZER' ? 'ORGANIZER' : 'ATTENDEE',
      isVerified: false, // Enforce email verification
    },
    select: { id: true, email: true, name: true, role: true, avatar: true, createdAt: true, isVerified: true },
  });

  // Generate 6-digit verification code
  const code = Math.random().toString().substring(2, 8);
  verificationCodes.set(email, { code, expires: Date.now() + 24 * 60 * 60 * 1000 }); // Valid for 24 hours

  // Log code for local testing/developer visibility
  console.log(`\n📧 [EMAIL VERIFICATION CODE] Email: ${email} | Code: ${code}\n`);

  const accessToken = generateAccessToken({ id: user.id, email: user.email, name: user.name, role: user.role });
  const refreshToken = generateRefreshToken({ id: user.id, email: user.email, name: user.name, role: user.role });

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return sendSuccess(
    res,
    { user, accessToken, refreshToken, mockVerificationCode: code },
    'Registration successful. Email verification code generated.',
    201
  );
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password) throw CustomError.unauthorized('Invalid credentials');
  if (!user.isActive) throw CustomError.unauthorized('Account is deactivated');

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) throw CustomError.unauthorized('Invalid credentials');

  const accessToken = generateAccessToken({ id: user.id, email: user.email, name: user.name, role: user.role });
  const refreshToken = generateRefreshToken({ id: user.id, email: user.email, name: user.name, role: user.role });

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const { password: _pw, ...safeUser } = user;
  sendSuccess(res, { user: safeUser, accessToken, refreshToken }, 'Login successful');
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken: token } = req.body;
  if (!token) throw CustomError.unauthorized('Refresh token required');

  const storedToken = await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!storedToken || storedToken.expiresAt < new Date()) {
    throw CustomError.unauthorized('Invalid or expired refresh token');
  }

  const decoded = verifyRefreshToken(token);
  const newAccessToken = generateAccessToken({
    id: decoded.id,
    email: decoded.email,
    name: decoded.name,
    role: decoded.role,
  });

  sendSuccess(res, { accessToken: newAccessToken }, 'Token refreshed');
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken: token } = req.body;
  if (token) {
    await prisma.refreshToken.deleteMany({ where: { token } });
  }
  sendSuccess(res, null, 'Logged out successfully');
});

export const getMe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
      bio: true,
      phone: true,
      isVerified: true,
      createdAt: true,
    },
  });
  if (!user) throw CustomError.notFound('User not found');
  sendSuccess(res, user, 'User fetched');
});

export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, bio, phone, avatar } = req.body;
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { name, bio, phone, avatar },
    select: { id: true, email: true, name: true, role: true, avatar: true, bio: true, phone: true },
  });
  sendSuccess(res, user, 'Profile updated');
});

export const changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user?.password) throw CustomError.badRequest('No password set');

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) throw CustomError.badRequest('Current password is incorrect');

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: req.user!.id }, data: { password: hashed } });
  await prisma.refreshToken.deleteMany({ where: { userId: req.user!.id } });
  sendSuccess(res, null, 'Password changed successfully');
});

// In-memory token storage (in a production app, use Redis or a DB table)
// Note: resetTokens and verificationCodes are declared at the top of this file

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // For security, don't confirm or deny user existence
    return sendSuccess(res, null, 'If an account exists with this email, a reset token has been generated.');
  }

  // Generate a simple 6-character token
  const token = Math.random().toString(36).substring(2, 8).toUpperCase();
  resetTokens.set(email, { token, expires: Date.now() + 15 * 60 * 1000 }); // Valid for 15 minutes

  // Log token for local testing/developer visibility
  console.log(`\n🔑 [PASSWORD RESET TOKEN] Email: ${email} | Token: ${token}\n`);

  return sendSuccess(res, { token }, 'Reset token generated successfully. In production, this would be sent to your email.');
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, token, newPassword } = req.body;

  const record = resetTokens.get(email);
  if (!record || record.token !== token || record.expires < Date.now()) {
    throw CustomError.badRequest('Invalid or expired reset token');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { email },
    data: { password: hashedPassword },
  });

  resetTokens.delete(email);

  return sendSuccess(res, null, 'Password reset successfully');
});

export const googleLogin = asyncHandler(async (req: Request, res: Response) => {
  const { email, name, googleId, avatar } = req.body;

  let user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: user.googleId || googleId,
        avatar: user.avatar || avatar,
        isVerified: true, // Google account emails are verified
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        email,
        name,
        googleId,
        avatar,
        isVerified: true,
        role: 'ATTENDEE',
      },
    });
  }

  if (!user.isActive) throw CustomError.unauthorized('Account is deactivated');

  const accessToken = generateAccessToken({ id: user.id, email: user.email, name: user.name, role: user.role });
  const refreshToken = generateRefreshToken({ id: user.id, email: user.email, name: user.name, role: user.role });

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const { password: _pw, ...safeUser } = user;
  return sendSuccess(res, { user: safeUser, accessToken, refreshToken }, 'Google Sign-in successful');
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email, code } = req.body;

  const record = verificationCodes.get(email);
  if (!record || record.code !== code || record.expires < Date.now()) {
    throw CustomError.badRequest('Invalid or expired verification code');
  }

  await prisma.user.update({
    where: { email },
    data: { isVerified: true },
  });

  verificationCodes.delete(email);

  return sendSuccess(res, null, 'Email verified successfully');
});

export const resendVerification = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw CustomError.notFound('User not found');
  }
  if (user.isVerified) {
    throw CustomError.badRequest('Email is already verified');
  }

  const code = Math.random().toString().substring(2, 8);
  verificationCodes.set(email, { code, expires: Date.now() + 24 * 60 * 60 * 1000 });

  console.log(`\n📧 [EMAIL VERIFICATION CODE] Email: ${email} | Code: ${code}\n`);

  return sendSuccess(
    res,
    { code },
    'Verification code resent successfully. In production, this would be sent to your email.'
  );
});

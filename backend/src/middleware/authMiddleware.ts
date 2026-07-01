import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { verifyAccessToken } from '../utils/tokenUtils';
import { CustomError } from '../utils/customError';

export const authenticate = (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw CustomError.unauthorized('Authentication token required');
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role as 'ATTENDEE' | 'ORGANIZER' | 'ADMIN',
    };
    next();
  } catch (error) {
    if (error instanceof CustomError) {
      next(error);
    } else {
      next(CustomError.unauthorized('Invalid or expired token'));
    }
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(CustomError.unauthorized());
    }
    if (!roles.includes(req.user.role)) {
      return next(CustomError.forbidden('Insufficient privileges'));
    }
    next();
  };
};

export const optionalAuth = (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyAccessToken(token);
      req.user = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role as 'ATTENDEE' | 'ORGANIZER' | 'ADMIN',
      };
    }
  } catch {
    // Ignore auth errors for optional auth
  }
  next();
};

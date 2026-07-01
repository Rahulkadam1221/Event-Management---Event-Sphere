import { Request, Response, NextFunction } from 'express';
import { CustomError } from '../utils/customError';
import { logger } from '../utils/logger';

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof CustomError) {
    if (err.statusCode >= 500) {
      logger.error(`${req.method} ${req.url}`, { message: err.message, stack: err.stack });
    } else {
      logger.warn(`${req.method} ${req.url} - ${err.message}`);
    }
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    });
    return;
  }

  // Unhandled error
  logger.error('Unhandled Error', { message: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export const notFoundMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  next(CustomError.notFound(`Route ${req.url} not found`));
};

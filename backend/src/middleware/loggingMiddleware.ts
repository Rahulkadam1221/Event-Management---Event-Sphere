import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const loggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.request(req, res.statusCode, duration);
  });

  next();
};

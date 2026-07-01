import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodObject } from 'zod';
import { CustomError } from '../utils/customError';

export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      let strictSchema = schema;
      
      // Automatically enforce strict mode for ZodObjects to reject unexpected input properties
      if (schema instanceof ZodObject) {
        strictSchema = schema.strict();
      }

      const data = strictSchema.parse(req[source]);
      req[source] = data;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors: Record<string, string[]> = {};
        error.errors.forEach((err) => {
          const field = err.path.join('.') || 'root';
          if (!fieldErrors[field]) fieldErrors[field] = [];
          fieldErrors[field].push(err.message);
        });
        next(CustomError.badRequest('Validation failed', fieldErrors));
      } else {
        next(error);
      }
    }
  };
};

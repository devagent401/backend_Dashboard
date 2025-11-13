import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import ApiError from '@utils/ApiError.js';

/**
 * Validate request data against Zod schema
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        const errorMessage = errors.map(e => `${e.field}: ${e.message}`).join(', ');
        next(ApiError.badRequest(errorMessage));
      } else {
        next(error);
      }
    }
  };
};

/**
 * Validate request params
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        const errorMessage = errors.map(e => `${e.field}: ${e.message}`).join(', ');
        next(ApiError.badRequest(errorMessage));
      } else {
        next(error);
      }
    }
  };
};

/**
 * Validate request query
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        const errorMessage = errors.map(e => `${e.field}: ${e.message}`).join(', ');
        next(ApiError.badRequest(errorMessage));
      } else {
        next(error);
      }
    }
  };
};


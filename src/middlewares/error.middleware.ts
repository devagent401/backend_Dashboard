import { Request, Response, NextFunction } from 'express';
import ApiError from '@utils/ApiError.js';
import logger from '@config/logger.js';

/**
 * Global error handler
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = err;

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map((e: any) => e.message)
      .join(', ');
    error = ApiError.badRequest(message);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const message = `${field} already exists`;
    error = ApiError.conflict(message);
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    const message = `Invalid ${err.path}: ${err.value}`;
    error = ApiError.badRequest(message);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized('Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('Token expired');
  }

  // Default to ApiError if not already
  if (!(error instanceof ApiError)) {
    error = new ApiError(err.statusCode || 500, err.message || 'Internal Server Error', false);
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Log error
  if (!error.isOperational) {
    logger.error('Unhandled Error:', {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      body: req.body,
    });
  }

  // Send response
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      error: err,
    }),
  });
};

/**
 * Handle 404 errors
 */
export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = ApiError.notFound(`Route ${req.originalUrl} not found`);
  next(error);
};


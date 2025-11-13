import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware.js';
import ApiError from '@utils/ApiError.js';

/**
 * Check if user has required role
 * Simplified role-based access control with three roles: admin, staff, user
 */
export const checkRole = (...allowedRoles: Array<'admin' | 'staff' | 'user'>) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        throw ApiError.unauthorized('Authentication required');
      }

      // Check if user's role is in the allowed roles
      if (!allowedRoles.includes(authReq.user.role as 'admin' | 'staff' | 'user')) {
        throw ApiError.forbidden('You do not have permission to access this resource');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};


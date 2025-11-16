import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '@utils/jwt.js';
import ApiError from '@utils/ApiError.js';
import User from '@models/User.js';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

/**
 * Authenticate user with JWT token
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    // Get token from header or cookie
    let token = req.headers.authorization?.split(' ')[1];

    if (!token && req.cookies) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw ApiError.unauthorized('No token provided. Please login.');
    }

    // Verify token
    const decoded: TokenPayload = verifyAccessToken(token);

    // Check if user still exists
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('User no longer exists or is inactive');
    }

    // Attach user to request
    authReq.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      next(ApiError.unauthorized('Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      next(ApiError.unauthorized('Token expired'));
    } else {
      next(error);
    }
  }
};

/**
 * Optional authentication - doesn't throw error if no token
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    let token = req.headers.authorization?.split(' ')[1];

    if (!token && req.cookies) {
      token = req.cookies.accessToken;
    }

    if (token) {
      const decoded: TokenPayload = verifyAccessToken(token);
      const user = await User.findById(decoded.userId);

      if (user && user.isActive) {
        authReq.user = {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
        };
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Restrict access to specific roles
 */
export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      return next(ApiError.unauthorized('Please login to access this resource'));
    }

    if (!roles.includes(authReq.user.role)) {
      return next(
        ApiError.forbidden('You do not have permission to perform this action')
      );
    }

    next();
  };
};


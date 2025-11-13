import { Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import User from '@models/User.js';
import ApiError from '@utils/ApiError.js';
import ApiResponse from '@utils/ApiResponse.js';
import {
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  verifyRefreshToken,
} from '@utils/jwt.js';
import { generateUsername, generatePassword } from '@utils/generators.js';
import { AuthRequest } from '@middlewares/auth.middleware.js';

/**
 * Register new user
 * POST /api/v1/auth/register
 */
export const register = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { email, password, firstName, lastName } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw ApiError.conflict('Email already registered');
    }

    // Generate username
    const username = await generateUsername(firstName || email.split('@')[0]);

    // Create user
    const user = await User.create({
      email,
      username,
      password,
      firstName,
      lastName,
      role: 'user',
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    // Set cookies
    setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json(
      ApiResponse.created(
        {
          user: {
            id: user._id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          },
          accessToken,
          refreshToken,
        },
        'Registration successful'
      )
    );
  }
);

/**
 * Login user
 * POST /api/v1/auth/login
 */
export const login = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { email, password } = req.body;

    // Find user with password
    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    // Check password
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    // Set cookies
    setAuthCookies(res, accessToken, refreshToken);

    res.json(
      ApiResponse.success(
        {
          user: {
            id: user._id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            avatar: user.avatar,
          },
          accessToken,
          refreshToken,
        },
        'Login successful'
      )
    );
  }
);

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
export const refreshToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { refreshToken: token } = req.body;

    if (!token) {
      throw ApiError.unauthorized('Refresh token required');
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(token);

    // Find user
    const user = await User.findById(decoded.userId).select('+refreshToken');
    if (!user || !user.isActive || user.refreshToken !== token) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    // Generate new tokens
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const newRefreshToken = generateRefreshToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Update refresh token
    user.refreshToken = newRefreshToken;
    await user.save();

    // Set cookies
    setAuthCookies(res, accessToken, newRefreshToken);

    res.json(
      ApiResponse.success({
        accessToken,
        refreshToken: newRefreshToken,
      })
    );
  }
);

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
export const logout = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (req.user) {
      // Clear refresh token from database
      await User.findByIdAndUpdate(req.user.userId, {
        $unset: { refreshToken: 1 },
      });
    }

    // Clear cookies
    clearAuthCookies(res);

    res.json(ApiResponse.success(null, 'Logout successful'));
  }
);

/**
 * Get current user
 * GET /api/v1/auth/me
 */
export const getCurrentUser = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const user = await User.findById(req.user?.userId);

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    res.json(ApiResponse.success(user));
  }
);

/**
 * Google OAuth callback
 * GET /api/v1/auth/google/callback
 */
export const googleCallback = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as any;

    if (!user) {
      throw ApiError.unauthorized('Google authentication failed');
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    // Set cookies
    setAuthCookies(res, accessToken, refreshToken);

    // Redirect to frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/success?token=${accessToken}`);
  }
);


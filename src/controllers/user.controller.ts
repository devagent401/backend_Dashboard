import { Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import User from '@models/User.js';
import ApiError from '@utils/ApiError.js';
import ApiResponse from '@utils/ApiResponse.js';
import { AuthRequest } from '@middlewares/auth.middleware.js';

/**
 * Get all users
 * GET /api/v1/users
 */
export const getUsers = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { page = 1, limit = 20, search, role, isActive } = req.query;

    const query: any = {};

    if (search) {
      query.$text = { $search: search as string };
    }

    if (role) {
      query.role = role;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(query),
    ]);

    res.json(
      ApiResponse.successWithMeta(users, {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      })
    );
  }
);

/**
 * Get user by ID
 * GET /api/v1/users/:id
 */
export const getUserById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = await User.findById(req.params.id);

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    res.json(ApiResponse.success(user));
  }
);

/**
 * Update user
 * PUT /api/v1/users/:id
 */
export const updateUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = await User.findById(req.params.id);

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const { password, role, ...updateData } = req.body;

    // Update allowed fields
    Object.assign(user, updateData);

    // Only admins can change roles
    if (role) {
      user.role = role;
    }

    // Update password if provided
    if (password) {
      user.password = password;
    }

    await user.save();

    res.json(ApiResponse.updated(user, 'User updated successfully'));
  }
);

/**
 * Delete user
 * DELETE /api/v1/users/:id
 */
export const deleteUser = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const user = await User.findById(req.params.id);

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Prevent deleting own account
    if (user._id.toString() === req.user?.userId) {
      throw ApiError.badRequest('Cannot delete your own account');
    }

    await user.deleteOne();

    res.json(ApiResponse.deleted('User deleted successfully'));
  }
);

/**
 * Toggle user active status
 * PATCH /api/v1/users/:id/toggle-status
 */
export const toggleUserStatus = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const user = await User.findById(req.params.id);

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Prevent disabling own account
    if (user._id.toString() === req.user?.userId) {
      throw ApiError.badRequest('Cannot disable your own account');
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json(
      ApiResponse.success(user, `User ${user.isActive ? 'activated' : 'deactivated'} successfully`)
    );
  }
);

/**
 * Get user statistics
 * GET /api/v1/users/stats
 */
export const getUserStats = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]);

    const total = await User.countDocuments();
    const active = await User.countDocuments({ isActive: true });
    const inactive = await User.countDocuments({ isActive: false });

    res.json(
      ApiResponse.success({
        total,
        active,
        inactive,
        byRole: stats,
      })
    );
  }
);

/**
 * Update user profile (by user themselves)
 * PUT /api/v1/users/profile
 */
export const updateProfile = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const user = await User.findById(req.user?.userId);

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const { firstName, lastName, phone, avatar, address } = req.body;

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (avatar) user.avatar = avatar;
    if (address) user.address = address;

    await user.save();

    res.json(ApiResponse.updated(user, 'Profile updated successfully'));
  }
);

/**
 * Change password
 * POST /api/v1/users/change-password
 */
export const changePassword = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user?.userId).select('+password');

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Verify current password
    const isPasswordCorrect = await user.comparePassword(currentPassword);
    if (!isPasswordCorrect) {
      throw ApiError.unauthorized('Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json(ApiResponse.success(null, 'Password changed successfully'));
  }
);


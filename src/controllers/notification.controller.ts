import { Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import Notification from '@models/Notification.js';
import ApiError from '@utils/ApiError.js';
import ApiResponse from '@utils/ApiResponse.js';
import { AuthRequest } from '@middlewares/auth.middleware.js';
import { emitNotification } from '@config/socket.js';

/**
 * Get user notifications
 * GET /api/v1/notifications
 */
export const getNotifications = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { page = 1, limit = 20, isRead, type } = req.query;

    const query: any = { recipientId: req.user?.userId };

    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    if (type) {
      query.type = type;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipientId: req.user?.userId, isRead: false }),
    ]);

    res.json(
      ApiResponse.successWithMeta(
        { notifications, unreadCount },
        {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        }
      )
    );
  }
);

/**
 * Get notification by ID
 * GET /api/v1/notifications/:id
 */
export const getNotificationById = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      throw ApiError.notFound('Notification not found');
    }

    // Check if notification belongs to user
    if (notification.recipientId.toString() !== req.user?.userId) {
      throw ApiError.forbidden('Access denied');
    }

    res.json(ApiResponse.success(notification));
  }
);

/**
 * Mark notification as read
 * PATCH /api/v1/notifications/:id/read
 */
export const markAsRead = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      throw ApiError.notFound('Notification not found');
    }

    if (notification.recipientId.toString() !== req.user?.userId) {
      throw ApiError.forbidden('Access denied');
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json(ApiResponse.success(notification, 'Notification marked as read'));
  }
);

/**
 * Mark all notifications as read
 * PATCH /api/v1/notifications/read-all
 */
export const markAllAsRead = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    await Notification.updateMany(
      { recipientId: req.user?.userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json(ApiResponse.success(null, 'All notifications marked as read'));
  }
);

/**
 * Delete notification
 * DELETE /api/v1/notifications/:id
 */
export const deleteNotification = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      throw ApiError.notFound('Notification not found');
    }

    if (notification.recipientId.toString() !== req.user?.userId) {
      throw ApiError.forbidden('Access denied');
    }

    await notification.deleteOne();

    res.json(ApiResponse.deleted('Notification deleted successfully'));
  }
);

/**
 * Create notification (admin only)
 * POST /api/v1/notifications
 */
export const createNotification = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const notification = await Notification.create(req.body);

    // Emit socket notification
    emitNotification(notification.recipientId.toString(), notification);

    res.status(201).json(ApiResponse.created(notification, 'Notification sent'));
  }
);

/**
 * Get unread count
 * GET /api/v1/notifications/unread/count
 */
export const getUnreadCount = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const count = await Notification.countDocuments({
      recipientId: req.user?.userId,
      isRead: false,
    });

    res.json(ApiResponse.success({ count }));
  }
);


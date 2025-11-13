import { Router } from 'express';
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  getOrderStats,
} from '@controllers/order.controller.js';
import { authenticate, restrictTo } from '@middlewares/auth.middleware.js';
import { validate } from '@middlewares/validation.middleware.js';
import { createOrderSchema, updateOrderStatusSchema } from '@utils/validators.js';
import { createOrderLimiter } from '@middlewares/rateLimit.middleware.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// All authenticated users can view orders
router.get('/stats', restrictTo('admin', 'staff'), getOrderStats);
router.get('/', getOrders);
router.get('/:id', getOrderById);

// All authenticated users can create orders
router.post(
  '/',
  createOrderLimiter,
  validate(createOrderSchema),
  createOrder
);

// Admin and staff can update orders
router.patch(
  '/:id/status',
  restrictTo('admin', 'staff'),
  validate(updateOrderStatusSchema),
  updateOrderStatus
);

// Only admin can delete orders
router.delete('/:id', restrictTo('admin'), deleteOrder);

export default router;


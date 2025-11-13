import { Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import Order from '@models/Order.js';
import Product from '@models/Product.js';
import Transaction from '@models/Transaction.js';
import Notification from '@models/Notification.js';
import ApiError from '@utils/ApiError.js';
import ApiResponse from '@utils/ApiResponse.js';
import { generateOrderNumber, generateTransactionRef } from '@utils/generators.js';
import { AuthRequest } from '@middlewares/auth.middleware.js';
import { emitNotification, emitAdminNotification, emitOrderUpdate } from '@config/socket.js';

/**
 * Get all orders
 * GET /api/v1/orders
 */
export const getOrders = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      customerId,
      startDate,
      endDate,
    } = req.query;

    const query: any = {};

    // Customers can only see their own orders
    if (req.user?.role === 'customer') {
      query.customerId = req.user.userId;
    } else if (customerId) {
      query.customerId = customerId;
    }

    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('customerId', 'firstName lastName email phone')
        .populate('processedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Order.countDocuments(query),
    ]);

    res.json(
      ApiResponse.successWithMeta(orders, {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      })
    );
  }
);

/**
 * Get order by ID
 * GET /api/v1/orders/:id
 */
export const getOrderById = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const order = await Order.findById(req.params.id)
      .populate('customerId', 'firstName lastName email phone')
      .populate('processedBy', 'firstName lastName')
      .populate('items.productId');

    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    // Customers can only view their own orders
    if (
      req.user?.role === 'customer' &&
      order.customerId?._id.toString() !== req.user.userId
    ) {
      throw ApiError.forbidden('Access denied');
    }

    res.json(ApiResponse.success(order));
  }
);

/**
 * Create order
 * POST /api/v1/orders
 */
export const createOrder = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { customerId, items, shippingAddress, paymentMethod, notes, customerInfo } = req.body;

    if (!items || items.length === 0) {
      throw ApiError.badRequest('Order must have at least one item');
    }

    // Verify products and calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        throw ApiError.badRequest(`Product ${item.productId} not found`);
      }

      if (product.status !== 'active') {
        throw ApiError.badRequest(`Product ${product.name} is not available`);
      }

      if (product.stockQuantity < item.quantity) {
        throw ApiError.badRequest(`Insufficient stock for product ${product.name}`);
      }

      const itemSubtotal = product.price * item.quantity;
      subtotal += itemSubtotal;

      orderItems.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        subtotal: itemSubtotal,
      });
    }

    const taxAmount = 0; // Calculate based on settings
    const shippingAmount = 0;
    const discountAmount = 0;
    const totalAmount = subtotal + taxAmount + shippingAmount - discountAmount;

    // Create order
    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      customerId: customerId || req.user?.userId,
      customerInfo,
      items: orderItems,
      subtotal,
      taxAmount,
      shippingAmount,
      discountAmount,
      totalAmount,
      paymentMethod,
      shippingAddress,
      notes,
      status: 'pending',
    });

    // Reduce stock quantities
    for (const item of items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stockQuantity: -item.quantity },
      });
    }

    // Create notification for admin
    const notification = await Notification.create({
      recipientId: req.user?.userId,
      title: 'New Order',
      message: `New order ${order.orderNumber} has been placed`,
      type: 'order',
      priority: 'high',
      relatedEntity: {
        entityType: 'order',
        entityId: order._id,
      },
    });

    // Emit socket notification to admin
    emitAdminNotification(notification);

    res.status(201).json(ApiResponse.created(order, 'Order created successfully'));
  }
);

/**
 * Update order status
 * PATCH /api/v1/orders/:id/status
 */
export const updateOrderStatus = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { status, notes } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    const oldStatus = order.status;
    order.status = status;
    order.processedBy = req.user?.userId as any;
    order.processedAt = new Date();

    if (notes) {
      order.notes = notes;
    }

    // Handle specific status changes
    if (status === 'delivered' && oldStatus !== 'delivered') {
      // Mark as paid
      order.paymentStatus = 'paid';

      // Update sold quantities
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { soldQuantity: item.quantity },
        });
      }

      // Create transaction
      await Transaction.create({
        reference: generateTransactionRef(),
        type: 'income',
        category: 'sale',
        amount: order.totalAmount,
        description: `Sale from order ${order.orderNumber}`,
        date: new Date(),
        relatedEntity: {
          entityType: 'order',
          entityId: order._id,
        },
        createdBy: req.user?.userId,
        paymentMethod: order.paymentMethod,
        status: 'completed',
      });
    }

    if (status === 'cancelled' || status === 'rejected') {
      // Return stock
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stockQuantity: item.quantity },
        });
      }

      if (status === 'rejected') {
        order.cancelReason = notes;
      }
    }

    await order.save();

    // Create notification for customer
    if (order.customerId) {
      const notification = await Notification.create({
        recipientId: order.customerId,
        title: `Order ${status}`,
        message: `Your order ${order.orderNumber} has been ${status}`,
        type: status === 'rejected' ? 'reject' : 'order',
        priority: 'high',
        relatedEntity: {
          entityType: 'order',
          entityId: order._id,
        },
      });

      // Emit socket notification
      emitNotification(order.customerId.toString(), notification);
      emitOrderUpdate(order.customerId.toString(), order);
    }

    res.json(ApiResponse.updated(order, 'Order status updated'));
  }
);

/**
 * Delete order
 * DELETE /api/v1/orders/:id
 */
export const deleteOrder = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const order = await Order.findById(req.params.id);

    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    // Can only delete pending orders
    if (order.status !== 'pending') {
      throw ApiError.badRequest('Can only delete pending orders');
    }

    // Return stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stockQuantity: item.quantity },
      });
    }

    await order.deleteOne();

    res.json(ApiResponse.deleted('Order deleted successfully'));
  }
);

/**
 * Get order statistics
 * GET /api/v1/orders/stats
 */
export const getOrderStats = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const stats = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
        },
      },
    ]);

    const total = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    res.json(
      ApiResponse.success({
        stats,
        total,
        totalRevenue: totalRevenue[0]?.total || 0,
      })
    );
  }
);


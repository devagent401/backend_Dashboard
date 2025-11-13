import { Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import Transaction from '@models/Transaction.js';
import ApiError from '@utils/ApiError.js';
import ApiResponse from '@utils/ApiResponse.js';
import { generateTransactionRef } from '@utils/generators.js';
import { AuthRequest } from '@middlewares/auth.middleware.js';

/**
 * Get all transactions
 * GET /api/v1/transactions
 */
export const getTransactions = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const {
      page = 1,
      limit = 20,
      type,
      category,
      startDate,
      endDate,
      status,
    } = req.query;

    const query: any = {};

    if (type) query.type = type;
    if (category) query.category = category;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate as string);
      if (endDate) query.date.$lte = new Date(endDate as string);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .populate('createdBy', 'firstName lastName')
        .sort({ date: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Transaction.countDocuments(query),
    ]);

    res.json(
      ApiResponse.successWithMeta(transactions, {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      })
    );
  }
);

/**
 * Get transaction by ID
 * GET /api/v1/transactions/:id
 */
export const getTransactionById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const transaction = await Transaction.findById(req.params.id).populate(
      'createdBy',
      'firstName lastName'
    );

    if (!transaction) {
      throw ApiError.notFound('Transaction not found');
    }

    res.json(ApiResponse.success(transaction));
  }
);

/**
 * Create transaction
 * POST /api/v1/transactions
 */
export const createTransaction = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const data = req.body;
    data.reference = generateTransactionRef();
    data.createdBy = req.user?.userId;
    data.date = data.date || new Date();

    const transaction = await Transaction.create(data);

    res.status(201).json(ApiResponse.created(transaction, 'Transaction created successfully'));
  }
);

/**
 * Update transaction
 * PUT /api/v1/transactions/:id
 */
export const updateTransaction = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      throw ApiError.notFound('Transaction not found');
    }

    // Can only update pending transactions
    if (transaction.status !== 'pending') {
      throw ApiError.badRequest('Can only update pending transactions');
    }

    Object.assign(transaction, req.body);
    await transaction.save();

    res.json(ApiResponse.updated(transaction));
  }
);

/**
 * Delete transaction
 * DELETE /api/v1/transactions/:id
 */
export const deleteTransaction = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      throw ApiError.notFound('Transaction not found');
    }

    await transaction.deleteOne();

    res.json(ApiResponse.deleted('Transaction deleted successfully'));
  }
);

/**
 * Get transaction summary
 * GET /api/v1/transactions/summary
 */
export const getTransactionSummary = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { startDate, endDate } = req.query;

    const query: any = { status: 'completed' };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate as string);
      if (endDate) query.date.$lte = new Date(endDate as string);
    }

    const summary = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const income = summary.find(s => s._id === 'income')?.total || 0;
    const expense = summary.find(s => s._id === 'expense')?.total || 0;
    const profit = income - expense;

    const byCategory = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: { type: '$type', category: '$category' },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json(
      ApiResponse.success({
        income,
        expense,
        profit,
        profitMargin: income > 0 ? (profit / income) * 100 : 0,
        byCategory,
      })
    );
  }
);


import { Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import Transaction from '@models/Transaction.js';
import Order from '@models/Order.js';
import Product from '@models/Product.js';
import ApiResponse from '@utils/ApiResponse.js';

/**
 * Get daily report
 * GET /api/v1/accounting/reports/daily
 */
export const getDailyReport = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get transactions
    const transactions = await Transaction.find({
      date: { $gte: startOfDay, $lte: endOfDay },
      status: 'completed',
    });

    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Get orders
    const orders = await Order.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const orderStats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      completed: orders.filter(o => o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      revenue: orders
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + o.totalAmount, 0),
    };

    res.json(
      ApiResponse.success({
        date: targetDate,
        transactions: {
          income,
          expense,
          profit: income - expense,
          count: transactions.length,
        },
        orders: orderStats,
      })
    );
  }
);

/**
 * Get monthly report
 * GET /api/v1/accounting/reports/monthly
 */
export const getMonthlyReport = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { year, month } = req.query;
    const targetYear = year ? Number(year) : new Date().getFullYear();
    const targetMonth = month ? Number(month) - 1 : new Date().getMonth();

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    // Get transactions
    const transactions = await Transaction.find({
      date: { $gte: startOfMonth, $lte: endOfMonth },
      status: 'completed',
    });

    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Group by category
    const byCategory = transactions.reduce((acc: any, t) => {
      const key = `${t.type}_${t.category}`;
      if (!acc[key]) {
        acc[key] = { type: t.type, category: t.category, total: 0, count: 0 };
      }
      acc[key].total += t.amount;
      acc[key].count += 1;
      return acc;
    }, {});

    // Get orders
    const orders = await Order.find({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
    });

    // Daily breakdown
    const dailyStats = await Transaction.aggregate([
      {
        $match: {
          date: { $gte: startOfMonth, $lte: endOfMonth },
          status: 'completed',
        },
      },
      {
        $group: {
          _id: {
            day: { $dayOfMonth: '$date' },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.day': 1 } },
    ]);

    res.json(
      ApiResponse.success({
        period: {
          year: targetYear,
          month: targetMonth + 1,
          startDate: startOfMonth,
          endDate: endOfMonth,
        },
        summary: {
          income,
          expense,
          profit: income - expense,
          profitMargin: income > 0 ? ((income - expense) / income) * 100 : 0,
        },
        byCategory: Object.values(byCategory),
        orders: {
          total: orders.length,
          revenue: orders
            .filter(o => o.status === 'delivered')
            .reduce((sum, o) => sum + o.totalAmount, 0),
        },
        dailyStats,
      })
    );
  }
);

/**
 * Get yearly report
 * GET /api/v1/accounting/reports/yearly
 */
export const getYearlyReport = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { year } = req.query;
    const targetYear = year ? Number(year) : new Date().getFullYear();

    const startOfYear = new Date(targetYear, 0, 1);
    const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59, 999);

    // Get transactions
    const transactions = await Transaction.find({
      date: { $gte: startOfYear, $lte: endOfYear },
      status: 'completed',
    });

    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Monthly breakdown
    const monthlyStats = await Transaction.aggregate([
      {
        $match: {
          date: { $gte: startOfYear, $lte: endOfYear },
          status: 'completed',
        },
      },
      {
        $group: {
          _id: {
            month: { $month: '$date' },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]);

    // Get orders
    const orders = await Order.find({
      createdAt: { $gte: startOfYear, $lte: endOfYear },
    });

    res.json(
      ApiResponse.success({
        year: targetYear,
        summary: {
          income,
          expense,
          profit: income - expense,
          profitMargin: income > 0 ? ((income - expense) / income) * 100 : 0,
        },
        orders: {
          total: orders.length,
          revenue: orders
            .filter(o => o.status === 'delivered')
            .reduce((sum, o) => sum + o.totalAmount, 0),
        },
        monthlyStats,
      })
    );
  }
);

/**
 * Get profit/loss statement
 * GET /api/v1/accounting/profit-loss
 */
export const getProfitLossStatement = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { startDate, endDate } = req.query;

    const query: any = { status: 'completed' };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate as string);
      if (endDate) query.date.$lte = new Date(endDate as string);
    }

    const transactions = await Transaction.find(query);

    const revenue = {
      sales: transactions
        .filter(t => t.type === 'income' && t.category === 'sale')
        .reduce((sum, t) => sum + t.amount, 0),
      other: transactions
        .filter(t => t.type === 'income' && t.category !== 'sale')
        .reduce((sum, t) => sum + t.amount, 0),
    };

    const expenses = {
      purchases: transactions
        .filter(t => t.type === 'expense' && t.category === 'purchase')
        .reduce((sum, t) => sum + t.amount, 0),
      damage: transactions
        .filter(t => t.type === 'expense' && t.category === 'damage')
        .reduce((sum, t) => sum + t.amount, 0),
      salary: transactions
        .filter(t => t.type === 'expense' && t.category === 'salary')
        .reduce((sum, t) => sum + t.amount, 0),
      rent: transactions
        .filter(t => t.type === 'expense' && t.category === 'rent')
        .reduce((sum, t) => sum + t.amount, 0),
      utility: transactions
        .filter(t => t.type === 'expense' && t.category === 'utility')
        .reduce((sum, t) => sum + t.amount, 0),
      other: transactions
        .filter(
          t =>
            t.type === 'expense' &&
            !['purchase', 'damage', 'salary', 'rent', 'utility'].includes(t.category)
        )
        .reduce((sum, t) => sum + t.amount, 0),
    };

    const totalRevenue = revenue.sales + revenue.other;
    const totalExpenses = Object.values(expenses).reduce((sum, val) => sum + val, 0);
    const netProfit = totalRevenue - totalExpenses;

    res.json(
      ApiResponse.success({
        revenue,
        totalRevenue,
        expenses,
        totalExpenses,
        netProfit,
        profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
      })
    );
  }
);

/**
 * Get stock report
 * GET /api/v1/accounting/stock-report
 */
export const getStockReport = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const products = await Product.find().populate('categoryId', 'name');

    const totalValue = products.reduce((sum, p) => sum + p.stockQuantity * (p.costPrice || 0), 0);

    const lowStock = products.filter(p => p.stockQuantity <= p.minStockLevel);
    const outOfStock = products.filter(p => p.stockQuantity === 0);
    const damaged = products.filter(p => p.damagedQuantity > 0);

    const byCategory = products.reduce((acc: any, p) => {
      const catName = (p.categoryId as any)?.name || 'Uncategorized';
      if (!acc[catName]) {
        acc[catName] = { quantity: 0, value: 0, count: 0 };
      }
      acc[catName].quantity += p.stockQuantity;
      acc[catName].value += p.stockQuantity * (p.costPrice || 0);
      acc[catName].count += 1;
      return acc;
    }, {});

    res.json(
      ApiResponse.success({
        total: {
          products: products.length,
          quantity: products.reduce((sum, p) => sum + p.stockQuantity, 0),
          value: totalValue,
        },
        lowStock: {
          count: lowStock.length,
          products: lowStock.map(p => ({
            id: p._id,
            name: p.name,
            stock: p.stockQuantity,
            minLevel: p.minStockLevel,
          })),
        },
        outOfStock: {
          count: outOfStock.length,
          products: outOfStock.map(p => ({ id: p._id, name: p.name })),
        },
        damaged: {
          count: damaged.length,
          totalQuantity: damaged.reduce((sum, p) => sum + p.damagedQuantity, 0),
          products: damaged.map(p => ({
            id: p._id,
            name: p.name,
            damaged: p.damagedQuantity,
          })),
        },
        byCategory,
      })
    );
  }
);


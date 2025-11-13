import { Router } from 'express';
import {
  getDailyReport,
  getMonthlyReport,
  getYearlyReport,
  getProfitLossStatement,
  getStockReport,
} from '@controllers/accounting.controller.js';
import { authenticate, restrictTo } from '@middlewares/auth.middleware.js';

const router = Router();

// All routes require authentication - only admin and staff can access
router.use(authenticate);
router.use(restrictTo('admin', 'staff'));

router.get('/reports/daily', getDailyReport);
router.get('/reports/monthly', getMonthlyReport);
router.get('/reports/yearly', getYearlyReport);
router.get('/profit-loss', getProfitLossStatement);
router.get('/stock-report', getStockReport);

export default router;


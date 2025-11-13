import { Router } from 'express';
import {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionSummary,
} from '@controllers/transaction.controller.js';
import { authenticate, restrictTo } from '@middlewares/auth.middleware.js';
import { validate } from '@middlewares/validation.middleware.js';
import { createTransactionSchema } from '@utils/validators.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Admin and staff can view transactions
router.get('/summary', restrictTo('admin', 'staff'), getTransactionSummary);
router.get('/', restrictTo('admin', 'staff'), getTransactions);
router.get('/:id', restrictTo('admin', 'staff'), getTransactionById);

// Admin and staff can create/update transactions
router.post(
  '/',
  restrictTo('admin', 'staff'),
  validate(createTransactionSchema),
  createTransaction
);

router.put('/:id', restrictTo('admin', 'staff'), updateTransaction);

// Only admin can delete transactions
router.delete('/:id', restrictTo('admin'), deleteTransaction);

export default router;


import { Router } from 'express';
import {
  getSellers,
  getSellerById,
  createSeller,
  updateSeller,
  deleteSeller,
} from '@controllers/seller.controller.js';
import { authenticate, optionalAuth, restrictTo } from '@middlewares/auth.middleware.js';
import { validate } from '@middlewares/validation.middleware.js';
import { createSellerSchema, updateSellerSchema } from '@utils/validators.js';

const router = Router();

// Public routes
router.get('/', optionalAuth, getSellers);
router.get('/:id', optionalAuth, getSellerById);

// Protected routes - admin and staff can manage sellers
router.post(
  '/',
  authenticate,
  restrictTo('admin', 'staff'),
  validate(createSellerSchema),
  createSeller
);

router.put(
  '/:id',
  authenticate,
  restrictTo('admin', 'staff'),
  validate(updateSellerSchema),
  updateSeller
);

router.delete('/:id', authenticate, restrictTo('admin'), deleteSeller);

export default router;



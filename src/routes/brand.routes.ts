import { Router } from 'express';
import {
  getBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
} from '@controllers/brand.controller.js';
import { authenticate, optionalAuth, restrictTo } from '@middlewares/auth.middleware.js';
import { validate } from '@middlewares/validation.middleware.js';
import { createBrandSchema, updateBrandSchema } from '@utils/validators.js';

const router = Router();

// Public routes
router.get('/', optionalAuth, getBrands);
router.get('/:id', optionalAuth, getBrandById);

// Protected routes - admin and staff can manage brands
router.post(
  '/',
  authenticate,
  restrictTo('admin', 'staff'),
  validate(createBrandSchema),
  createBrand
);

router.put(
  '/:id',
  authenticate,
  restrictTo('admin', 'staff'),
  validate(updateBrandSchema),
  updateBrand
);

router.delete('/:id', authenticate, restrictTo('admin'), deleteBrand);

export default router;



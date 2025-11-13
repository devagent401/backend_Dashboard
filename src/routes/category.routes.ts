import { Router } from 'express';
import {
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryProducts,
} from '@controllers/category.controller.js';
import { authenticate, optionalAuth, restrictTo } from '@middlewares/auth.middleware.js';
import { validate } from '@middlewares/validation.middleware.js';
import { createCategorySchema, updateCategorySchema } from '@utils/validators.js';

const router = Router();

// Public routes
router.get('/', getCategories);
router.get('/slug/:slug', getCategoryBySlug);
router.get('/:id', getCategoryById);
router.get('/:id/products', optionalAuth, getCategoryProducts);

// Protected routes - admin and staff can manage categories
router.post(
  '/',
  authenticate,
  restrictTo('admin', 'staff'),
  validate(createCategorySchema),
  createCategory
);

router.put(
  '/:id',
  authenticate,
  restrictTo('admin', 'staff'),
  validate(updateCategorySchema),
  updateCategory
);

router.delete('/:id', authenticate, restrictTo('admin'), deleteCategory);

export default router;


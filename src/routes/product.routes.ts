import { Router } from 'express';
import {
  getProducts,
  getProductById,
  getProductBySlug,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  getLowStockProducts,
} from '@controllers/product.controller.js';
import { authenticate, optionalAuth, restrictTo } from '@middlewares/auth.middleware.js';
import { validate } from '@middlewares/validation.middleware.js';
import { createProductSchema, updateProductSchema, adjustStockSchema } from '@utils/validators.js';

const router = Router();

// Public routes
router.get('/', optionalAuth, getProducts);
router.get('/barcode/:barcode', getProductByBarcode);
router.get('/slug/:slug', getProductBySlug);
router.get('/stock/low', authenticate, restrictTo('admin', 'staff'), getLowStockProducts);
router.get('/:id', optionalAuth, getProductById);

// Protected routes - admin and staff can manage products
router.post(
  '/',
  authenticate,
  restrictTo('admin', 'staff'),
  validate(createProductSchema),
  createProduct
);

router.put(
  '/:id',
  authenticate,
  restrictTo('admin', 'staff'),
  validate(updateProductSchema),
  updateProduct
);

router.delete('/:id', authenticate, restrictTo('admin'), deleteProduct);

router.post(
  '/:id/stock',
  authenticate,
  restrictTo('admin', 'staff'),
  validate(adjustStockSchema),
  adjustStock
);

export default router;

import { Router } from 'express';
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  addPurchaseHistory,
  getSupplierPurchases,
} from '@controllers/supplier.controller.js';
import { authenticate, restrictTo } from '@middlewares/auth.middleware.js';
import { validate } from '@middlewares/validation.middleware.js';
import { createSupplierSchema, updateSupplierSchema } from '@utils/validators.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Admin and staff can view suppliers
router.get('/', restrictTo('admin', 'staff'), getSuppliers);
router.get('/:id', restrictTo('admin', 'staff'), getSupplierById);
router.get('/:id/purchases', restrictTo('admin', 'staff'), getSupplierPurchases);

// Admin and staff can manage suppliers
router.post(
  '/',
  restrictTo('admin', 'staff'),
  validate(createSupplierSchema),
  createSupplier
);

router.post('/:id/purchases', restrictTo('admin', 'staff'), addPurchaseHistory);

router.put(
  '/:id',
  restrictTo('admin', 'staff'),
  validate(updateSupplierSchema),
  updateSupplier
);

// Only admin can delete suppliers
router.delete('/:id', restrictTo('admin'), deleteSupplier);

export default router;


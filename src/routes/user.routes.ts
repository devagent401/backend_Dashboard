import { Router } from 'express';
import {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getUserStats,
  updateProfile,
  changePassword,
} from '@controllers/user.controller.js';
import { authenticate, restrictTo } from '@middlewares/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// User's own profile routes (all authenticated users)
router.put('/profile', updateProfile);
router.post('/change-password', changePassword);

// Admin only routes
router.get('/stats', restrictTo('admin'), getUserStats);
router.get('/', restrictTo('admin'), getUsers);
router.get('/:id', restrictTo('admin'), getUserById);
router.put('/:id', restrictTo('admin'), updateUser);
router.patch('/:id/toggle-status', restrictTo('admin'), toggleUserStatus);
router.delete('/:id', restrictTo('admin'), deleteUser);

export default router;


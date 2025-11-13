import { Router } from 'express';
import { uploadImage, uploadVideo } from '@controllers/upload.controller.js';
import { authenticate, restrictTo } from '@middlewares/auth.middleware.js';

const router = Router();

// Protected routes - admin and staff can upload files
router.post(
  '/image',
  authenticate,
  restrictTo('admin', 'staff'),
  uploadImage
);

router.post(
  '/video',
  authenticate,
  restrictTo('admin', 'staff'),
  uploadVideo
);

export default router;



import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  updateCompanyInfo,
  updateSocialMedia,
  toggleMaintenance,
} from '@controllers/settings.controller.js';
import { authenticate, restrictTo } from '@middlewares/auth.middleware.js';
import { validate } from '@middlewares/validation.middleware.js';
import { updateCompanySettingsSchema } from '@utils/validators.js';

const router = Router();

// Public route
router.get('/', getSettings);

// Protected routes - only admin can update settings
router.use(authenticate);
router.use(restrictTo('admin'));

router.put('/', updateSettings);
router.patch('/company', validate(updateCompanySettingsSchema), updateCompanyInfo);
router.patch('/social', updateSocialMedia);
router.patch('/maintenance', toggleMaintenance);

export default router;


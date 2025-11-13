import { Router } from 'express';
import passport from 'passport';
import {
  register,
  login,
  logout,
  refreshToken,
  getCurrentUser,
  googleCallback,
} from '@controllers/auth.controller.js';
import { authenticate } from '@middlewares/auth.middleware.js';
import { validate } from '@middlewares/validation.middleware.js';
import { registerSchema, loginSchema } from '@utils/validators.js';
import { authLimiter } from '@middlewares/rateLimit.middleware.js';

const router = Router();

// Public routes
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', refreshToken);

// Google OAuth - only if configured
const isGoogleOAuthConfigured =
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id';

if (isGoogleOAuthConfigured) {
  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/auth/login' }),
    googleCallback
  );
} else {
  // Return error if Google OAuth is not configured
  router.get('/google', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Google OAuth is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to environment variables.',
    });
  });
  router.get('/google/callback', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Google OAuth is not configured.',
    });
  });
}

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getCurrentUser);

export default router;


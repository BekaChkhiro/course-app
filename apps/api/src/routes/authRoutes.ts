import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import {
  validateRegistration,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateEmailVerification,
  validateDeviceNaming,
  handleValidationErrors,
} from '../middleware/validation';
import {
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
} from '../middleware/rateLimiter';

const router = Router();

/**
 * Public routes (no authentication required)
 */

// POST /api/auth/register - Register a new user
router.post(
  '/register',
  registerLimiter,
  validateRegistration,
  handleValidationErrors,
  AuthController.register
);

// POST /api/auth/login - Login user
router.post(
  '/login',
  loginLimiter,
  validateLogin,
  handleValidationErrors,
  AuthController.login
);

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', AuthController.refresh);

// POST /api/auth/verify-email - Verify email address
router.post(
  '/verify-email',
  emailVerificationLimiter,
  validateEmailVerification,
  handleValidationErrors,
  AuthController.verifyEmail
);

// POST /api/auth/forgot-password - Request password reset
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validateForgotPassword,
  handleValidationErrors,
  AuthController.forgotPassword
);

// POST /api/auth/reset-password - Reset password with token
router.post(
  '/reset-password',
  validateResetPassword,
  handleValidationErrors,
  AuthController.resetPassword
);

/**
 * Protected routes (authentication required)
 */

// POST /api/auth/logout - Logout user
router.post('/logout', requireAuth, AuthController.logout);

// GET /api/auth/me - Get current user profile
router.get('/me', requireAuth, AuthController.getProfile);

// GET /api/auth/devices - Get all active devices for current user
router.get('/devices', requireAuth, AuthController.getDevices);

// PATCH /api/auth/devices/:id - Update device name
router.patch(
  '/devices/:id',
  requireAuth,
  validateDeviceNaming,
  handleValidationErrors,
  AuthController.updateDeviceName
);

// DELETE /api/auth/devices/:id - Remove a device session
router.delete('/devices/:id', requireAuth, AuthController.removeDevice);

export default router;

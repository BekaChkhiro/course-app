import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import {
  getPublicSettings,
  getSettings,
  updateSettings
} from '../controllers/siteSettingsController';

const router = express.Router();

// Public routes
router.get('/public', getPublicSettings);

// Admin routes
router.use(requireAuth, requireAdmin);

router.get('/', getSettings);
router.put('/', updateSettings);

export default router;

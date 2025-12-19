import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import {
  getConsolidatedAnalytics,
  getDashboardStats,
  getRevenueAnalytics,
  getStudentAnalytics,
  getCourseAnalytics
} from '../controllers/analyticsController';

const router = express.Router();

// All analytics routes require authentication and admin role
router.use(requireAuth, requireAdmin);

// Consolidated analytics endpoint (new unified dashboard)
router.get('/consolidated', getConsolidatedAnalytics);

router.get('/dashboard', getDashboardStats);
router.get('/revenue', getRevenueAnalytics);
router.get('/students', getStudentAnalytics);
router.get('/course/:courseId', getCourseAnalytics);

export default router;

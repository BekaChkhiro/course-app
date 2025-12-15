import express from 'express';
import {
  updateProgress,
  getProgress,
  getCourseProgress,
  markAsCompleted,
  resetProgress,
  resetCourseProgress,
  getUserStats,
} from '../controllers/progressController';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Progress tracking routes
router.put('/chapters/:chapterId', updateProgress);
router.get('/chapters/:chapterId', getProgress);
router.post('/chapters/:chapterId/complete', markAsCompleted);
router.post('/chapters/:chapterId/reset', resetProgress);

// Course progress routes
router.get('/courses/:courseId', getCourseProgress);
router.delete('/courses/:courseId/reset', resetCourseProgress);

// User statistics
router.get('/stats', getUserStats);

export default router;

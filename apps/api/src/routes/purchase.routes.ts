import express from 'express';
import {
  enrollInCourse,
  enrollBySlug,
  checkEnrollment,
} from '../controllers/purchaseController';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Enroll in a course (by courseId in body)
router.post('/enroll', enrollInCourse);

// Enroll in a course (by slug in URL)
router.post('/enroll/:slug', enrollBySlug);

// Check enrollment status
router.get('/check/:courseId', checkEnrollment);

export default router;

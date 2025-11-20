import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  duplicateCourse,
  bulkUpdateStatus,
  exportCoursesToCSV,
  getCourseStats
} from '../controllers/courseController';

const router = express.Router();

// Public routes
router.get('/', getAllCourses);
router.get('/:id', getCourseById);
router.get('/:id/stats', getCourseStats);

// Admin routes
router.use(requireAuth, requireAdmin);

router.post('/', createCourse);
router.put('/:id', updateCourse);
router.delete('/:id', deleteCourse);
router.post('/:id/duplicate', duplicateCourse);
router.post('/bulk/update-status', bulkUpdateStatus);
router.get('/export/csv', exportCoursesToCSV);

export default router;

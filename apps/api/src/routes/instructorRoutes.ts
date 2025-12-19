import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import {
  getAllInstructors,
  getActiveInstructors,
  getInstructorById,
  getInstructorBySlug,
  createInstructor,
  updateInstructor,
  deleteInstructor,
  reorderInstructors,
  toggleInstructorStatus
} from '../controllers/instructorController';

const router = express.Router();

// Public routes
router.get('/public', getActiveInstructors);
router.get('/public/:slug', getInstructorBySlug);

// Admin routes
router.use(requireAuth, requireAdmin);

router.get('/', getAllInstructors);
router.get('/:id', getInstructorById);
router.post('/', createInstructor);
router.put('/:id', updateInstructor);
router.delete('/:id', deleteInstructor);
router.post('/reorder', reorderInstructors);
router.patch('/:id/toggle', toggleInstructorStatus);

export default router;

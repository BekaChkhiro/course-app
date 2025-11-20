import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import {
  getVersionsByCourse,
  getVersionById,
  createVersion,
  updateVersion,
  deleteVersion,
  setActiveVersion,
  compareVersions
} from '../controllers/versionController';

const router = express.Router();

// Public routes
router.get('/course/:courseId', getVersionsByCourse);
router.get('/:id', getVersionById);
router.get('/compare', compareVersions);

// Admin routes
router.use(requireAuth, requireAdmin);

router.post('/', createVersion);
router.put('/:id', updateVersion);
router.delete('/:id', deleteVersion);
router.post('/:id/activate', setActiveVersion);

export default router;

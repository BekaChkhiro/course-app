import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import {
  getChaptersByVersion,
  getChapterById,
  createChapter,
  updateChapter,
  deleteChapter,
  reorderChapters,
  bulkDeleteChapters,
  toggleChapterFree
} from '../controllers/chapterController';

const router = express.Router();

// Public routes (for students viewing courses)
router.get('/version/:versionId', getChaptersByVersion);
router.get('/:id', getChapterById);

// Admin routes
router.use(requireAuth, requireAdmin);

router.post('/', createChapter);
router.put('/:id', updateChapter);
router.delete('/:id', deleteChapter);
router.post('/reorder', reorderChapters);
router.post('/bulk/delete', bulkDeleteChapters);
router.patch('/:id/toggle-free', toggleChapterFree);

export default router;

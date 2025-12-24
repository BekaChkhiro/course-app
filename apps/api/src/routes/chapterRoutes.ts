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
  toggleChapterFree,
  getChapterVideos,
  linkChapter,
  getVersionChaptersWithLinks,
  autoLinkVersionChapters
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
router.get('/:id/videos', getChapterVideos);

// Chapter linking routes (for progress transfer between versions)
router.put('/:id/link', linkChapter);
router.get('/version/:versionId/links', getVersionChaptersWithLinks);
router.post('/version/:versionId/auto-link', autoLinkVersionChapters);

export default router;

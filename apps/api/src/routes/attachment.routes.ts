import express from 'express';
import {
  uploadAttachment,
  uploadMiddleware,
  getChapterAttachments,
  updateAttachment,
  deleteAttachment,
  reorderAttachments,
} from '../controllers/attachmentController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Protected routes (authenticated users can view)
router.use(requireAuth);
router.get('/chapter/:chapterId', getChapterAttachments);

// Admin routes
router.use(requireAdmin);
router.post('/upload', uploadMiddleware, uploadAttachment);
router.put('/:attachmentId', updateAttachment);
router.delete('/:attachmentId', deleteAttachment);
router.put('/chapter/:chapterId/reorder', reorderAttachments);

export default router;

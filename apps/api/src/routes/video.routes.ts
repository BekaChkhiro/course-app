import express from 'express';
import {
  uploadVideo,
  uploadMiddleware,
  getProcessingStatus,
  generateVideoAccessToken,
  streamVideo,
  trackAnalytics,
  getVideoThumbnails,
  deleteVideo,
  replaceVideo,
} from '../controllers/videoController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Public routes (with token validation)
router.get('/stream', streamVideo);

// Protected routes (authenticated users)
router.use(requireAuth);
router.get('/:videoId/status', getProcessingStatus);
router.get('/:videoId/access-token', generateVideoAccessToken);
router.post('/:videoId/analytics', trackAnalytics);
router.get('/:videoId/thumbnails', getVideoThumbnails);

// Admin routes
router.use(requireAdmin);
router.post('/upload', uploadMiddleware, uploadVideo);
router.delete('/:videoId', deleteVideo);
router.put('/:videoId/replace', uploadMiddleware, replaceVideo);

export default router;

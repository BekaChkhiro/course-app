import express from 'express';
import {
  uploadVideo,
  uploadMiddleware,
  getProcessingStatus,
  generateVideoAccessToken,
  streamVideo,
  streamVideoFile,
  trackAnalytics,
  getVideoThumbnails,
  deleteVideo,
  replaceVideo,
  getSecureVideoUrl,
  proxyStreamVideo,
} from '../controllers/videoController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Public routes (with token validation)
router.get('/stream', streamVideo);
router.get('/file/:videoId', streamVideoFile);
router.get('/proxy-stream/:streamToken', proxyStreamVideo); // Proxied video stream (no auth needed, token validates)

// Protected routes (authenticated users)
router.use(requireAuth);
router.get('/:videoId/status', getProcessingStatus);
router.get('/:videoId/access-token', generateVideoAccessToken);
router.get('/:videoId/secure-url', getSecureVideoUrl);
router.post('/:videoId/analytics', trackAnalytics);
router.get('/:videoId/thumbnails', getVideoThumbnails);

// Admin routes
router.use(requireAdmin);
router.post('/upload', uploadMiddleware, uploadVideo);
router.delete('/:videoId', deleteVideo);
router.put('/:videoId/replace', uploadMiddleware, replaceVideo);

export default router;

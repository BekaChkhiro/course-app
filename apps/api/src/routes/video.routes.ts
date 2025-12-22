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
  getPresignedUploadUrl,
  confirmVideoUpload,
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
router.post('/presigned-upload', getPresignedUploadUrl); // Get presigned URL for direct R2 upload
router.post('/confirm-upload', confirmVideoUpload); // Confirm upload after direct R2 upload
router.delete('/:videoId', deleteVideo);
router.put('/:videoId/replace', uploadMiddleware, replaceVideo);

export default router;

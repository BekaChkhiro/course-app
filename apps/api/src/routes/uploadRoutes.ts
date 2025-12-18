import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import {
  uploadThumbnail,
  uploadVideo,
  uploadAssignment,
  uploadAnswer,
  uploadMedia,
  uploadQuizImage,
  uploadSliderImage
} from '../services/uploadService';
import {
  uploadThumbnailHandler,
  uploadVideoHandler,
  uploadAssignmentHandler,
  uploadAnswerHandler,
  uploadMediaHandler,
  uploadQuizImageHandler,
  uploadSliderImageHandler
} from '../controllers/uploadController';

const router = express.Router();

// All upload routes require authentication and admin role
router.use(requireAuth, requireAdmin);

// Upload endpoints
router.post('/thumbnail', uploadThumbnail.single('file'), uploadThumbnailHandler);
router.post('/video', uploadVideo.single('file'), uploadVideoHandler);
router.post('/assignment', uploadAssignment.single('file'), uploadAssignmentHandler);
router.post('/answer', uploadAnswer.single('file'), uploadAnswerHandler);
router.post('/media', uploadMedia.single('file'), uploadMediaHandler);
router.post('/quiz-image', uploadQuizImage.single('file'), uploadQuizImageHandler);
router.post('/slider-image', uploadSliderImage.single('file'), uploadSliderImageHandler);

export default router;

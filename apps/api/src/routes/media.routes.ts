import express from 'express';
import {
  getVideos,
  getAttachments,
  getImages,
  getStorageStats,
  scanOrphanFiles,
  deleteOrphanFiles,
  bulkDeleteVideos,
  bulkDeleteAttachments,
  getVideoPreviewUrl,
  getCoursesForFilter,
} from '../controllers/mediaController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = express.Router();

// All routes require admin authentication
const adminAuth = [requireAuth, requireAdmin];

// ==========================================
// MEDIA LISTING ROUTES
// ==========================================

// Get all videos with pagination and filters
router.get('/admin/media/videos', ...adminAuth, getVideos);

// Get all attachments with pagination and filters
router.get('/admin/media/attachments', ...adminAuth, getAttachments);

// Get all images with pagination and filters
router.get('/admin/media/images', ...adminAuth, getImages);

// ==========================================
// STATISTICS ROUTES
// ==========================================

// Get storage statistics
router.get('/admin/media/stats', ...adminAuth, getStorageStats);

// Get courses list for filter dropdown
router.get('/admin/media/courses', ...adminAuth, getCoursesForFilter);

// ==========================================
// ORPHAN FILE ROUTES
// ==========================================

// Scan for orphan files in R2
router.get('/admin/media/orphans', ...adminAuth, scanOrphanFiles);

// Delete orphan files
router.post('/admin/media/orphans/delete', ...adminAuth, deleteOrphanFiles);

// ==========================================
// BULK OPERATIONS
// ==========================================

// Bulk delete videos
router.post('/admin/media/videos/bulk-delete', ...adminAuth, bulkDeleteVideos);

// Bulk delete attachments
router.post('/admin/media/attachments/bulk-delete', ...adminAuth, bulkDeleteAttachments);

// ==========================================
// VIDEO PREVIEW
// ==========================================

// Get presigned URL for video preview
router.get('/admin/media/videos/:videoId/preview', ...adminAuth, getVideoPreviewUrl);

export default router;

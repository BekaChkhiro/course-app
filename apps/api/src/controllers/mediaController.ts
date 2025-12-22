import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { MediaService } from '../services/mediaService';
import { VideoProcessingStatus } from '@prisma/client';

/**
 * Get all videos with pagination and filters
 */
export const getVideos = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      status,
      courseId,
      search,
      sortBy = 'newest',
    } = req.query;

    const result = await MediaService.getVideos({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      status: status as VideoProcessingStatus | undefined,
      courseId: courseId as string | undefined,
      search: search as string | undefined,
      sortBy: sortBy as 'newest' | 'oldest' | 'largest' | 'smallest',
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error getting videos:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all attachments with pagination and filters
 */
export const getAttachments = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      type,
      search,
    } = req.query;

    const result = await MediaService.getAttachments({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      type: type as 'material' | 'assignment' | 'answer' | undefined,
      search: search as string | undefined,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error getting attachments:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all images with pagination and filters
 */
export const getImages = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      type,
    } = req.query;

    const result = await MediaService.getImages({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      type: type as 'slider' | 'course-thumbnail' | 'quiz-image' | 'video-thumbnail' | undefined,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error getting images:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get storage statistics
 */
export const getStorageStats = async (req: AuthRequest, res: Response) => {
  try {
    const stats = await MediaService.getStorageStats();

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Error getting storage stats:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Scan for orphan files in R2
 */
export const scanOrphanFiles = async (req: AuthRequest, res: Response) => {
  try {
    const { prefix } = req.query;

    const result = await MediaService.findOrphanFiles(prefix as string | undefined);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error scanning orphan files:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete orphan files from R2
 */
export const deleteOrphanFiles = async (req: AuthRequest, res: Response) => {
  try {
    const { keys } = req.body;

    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Keys array is required',
      });
    }

    const result = await MediaService.deleteOrphanFiles(keys);

    return res.json({
      success: true,
      data: result,
      message: `Successfully deleted ${result.deletedCount} orphan files`,
    });
  } catch (error: any) {
    console.error('Error deleting orphan files:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Bulk delete videos
 */
export const bulkDeleteVideos = async (req: AuthRequest, res: Response) => {
  try {
    const { videoIds } = req.body;

    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Video IDs array is required',
      });
    }

    const result = await MediaService.bulkDeleteVideos(videoIds);

    return res.json({
      success: true,
      data: result,
      message: `Successfully deleted ${result.deletedCount} videos`,
    });
  } catch (error: any) {
    console.error('Error bulk deleting videos:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Bulk delete attachments
 */
export const bulkDeleteAttachments = async (req: AuthRequest, res: Response) => {
  try {
    const { attachmentIds } = req.body;

    if (!Array.isArray(attachmentIds) || attachmentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Attachment IDs array is required',
      });
    }

    const result = await MediaService.bulkDeleteAttachments(attachmentIds);

    return res.json({
      success: true,
      data: result,
      message: `Successfully deleted ${result.deletedCount} attachments`,
    });
  } catch (error: any) {
    console.error('Error bulk deleting attachments:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get video preview URL (presigned URL)
 */
export const getVideoPreviewUrl = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;

    const url = await MediaService.getVideoPreviewUrl(videoId);

    if (!url) {
      return res.status(404).json({
        success: false,
        message: 'Video not found or unable to generate preview URL',
      });
    }

    return res.json({
      success: true,
      data: { url },
    });
  } catch (error: any) {
    console.error('Error getting video preview URL:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get courses list for filter dropdown
 */
export const getCoursesForFilter = async (req: AuthRequest, res: Response) => {
  try {
    const courses = await MediaService.getCoursesForFilter();

    return res.json({
      success: true,
      data: courses,
    });
  } catch (error: any) {
    console.error('Error getting courses for filter:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import r2Service from '../services/r2.service';
import queueService from '../services/queue.service';
import videoAccessService from '../services/videoAccess.service';
import videoService from '../services/video.service';

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'temp', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2GB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
    const allowedExts = ['.mp4', '.mov', '.avi', '.mkv'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP4, MOV, AVI, and MKV are allowed.'));
    }
  },
});

export const uploadMiddleware = upload.single('video');

/**
 * Upload video
 */
export const uploadVideo = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video file provided',
      });
    }

    const { chapterId } = req.body;
    const userId = req.user?.id;

    if (!chapterId) {
      await fs.unlink(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Chapter ID is required',
      });
    }

    // Get chapter and course info
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        courseVersion: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!chapter) {
      await fs.unlink(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Chapter not found',
      });
    }

    const courseId = chapter.courseVersion.courseId;

    // Upload original file to R2
    const r2Key = r2Service.generateVideoKey(
      courseId,
      chapterId,
      req.file.originalname
    );

    const fileBuffer = await fs.readFile(req.file.path);
    await r2Service.uploadFile(r2Key, fileBuffer, req.file.mimetype);

    // Create video record
    const video = await prisma.video.create({
      data: {
        chapterId,
        originalName: req.file.originalname,
        originalSize: req.file.size,
        mimeType: req.file.mimetype,
        r2Key,
        r2Bucket: process.env.R2_BUCKET_NAME || 'course-platform-videos',
        processingStatus: 'PENDING',
      },
    });

    // Add to processing queue
    await queueService.addVideoProcessingJob(
      {
        videoId: video.id,
        chapterId,
        courseId,
        originalFilePath: req.file.path,
        r2Key,
        userId: userId || '',
      },
      1 // High priority
    );

    // Clean up local file
    await fs.unlink(req.file.path);

    res.json({
      success: true,
      message: 'Video uploaded successfully and queued for processing',
      data: {
        videoId: video.id,
        status: video.processingStatus,
      },
    });
  } catch (error) {
    console.error('Upload video error:', error);

    // Clean up file if it exists
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload video',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get video processing status
 */
export const getProcessingStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        processingStatus: true,
        processingProgress: true,
        processingError: true,
        hlsMasterUrl: true,
        hls480pUrl: true,
        hls720pUrl: true,
        hls1080pUrl: true,
        duration: true,
        width: true,
        height: true,
      },
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    res.json({
      success: true,
      data: video,
    });
  } catch (error) {
    console.error('Get processing status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get processing status',
    });
  }
};

/**
 * Generate video access token
 */
export const generateVideoAccessToken = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?.id;
    const ipAddress = (req.ip || req.socket.remoteAddress || '').replace('::ffff:', '');

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get video and chapter info
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        chapter: {
          include: {
            courseVersion: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    const courseId = video.chapter.courseVersion.courseId;
    const chapterId = video.chapterId;

    // Check if chapter is free or user has access
    const isFree = await videoAccessService.isChapterFree(chapterId);
    if (!isFree) {
      // Verify user access
      const hasAccess = await videoAccessService['verifyUserAccess'](userId, courseId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this video',
        });
      }
    }

    // Generate access token
    const { token, expiresAt } = await videoAccessService.generateAccessToken({
      videoId,
      userId,
      chapterId,
      courseId,
      ipAddress,
    });

    res.json({
      success: true,
      data: {
        token,
        expiresAt,
        hlsMasterUrl: video.hlsMasterUrl,
        variants: {
          '480p': video.hls480pUrl,
          '720p': video.hls720pUrl,
          '1080p': video.hls1080pUrl,
        },
      },
    });
  } catch (error) {
    console.error('Generate video access token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate access token',
    });
  }
};

/**
 * Stream video with token validation
 */
export const streamVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.query;
    const ipAddress = (req.ip || req.socket.remoteAddress || '').replace('::ffff:', '');

    if (!token || typeof token !== 'string') {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
      });
    }

    // Validate token
    const validation = await videoAccessService.validateAccessToken(token, ipAddress);

    if (!validation.valid) {
      return res.status(403).json({
        success: false,
        message: validation.message || 'Invalid or expired token',
      });
    }

    // Get video info
    const video = await prisma.video.findUnique({
      where: { id: validation.videoId },
    });

    if (!video || !video.hlsMasterUrl) {
      return res.status(404).json({
        success: false,
        message: 'Video not available',
      });
    }

    res.json({
      success: true,
      data: {
        hlsMasterUrl: video.hlsMasterUrl,
        variants: {
          '480p': video.hls480pUrl,
          '720p': video.hls720pUrl,
          '1080p': video.hls1080pUrl,
        },
      },
    });
  } catch (error) {
    console.error('Stream video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stream video',
    });
  }
};

/**
 * Track video analytics
 */
export const trackAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    const { sessionId, watchDuration, completionRate, quality, bandwidthUsed } = req.body;
    const userId = req.user?.id;
    const ipAddress = (req.ip || req.socket.remoteAddress || '').replace('::ffff:', '');
    const userAgent = req.headers['user-agent'] || '';

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Create or update analytics record
    await prisma.videoAnalytics.upsert({
      where: {
        videoId_userId_sessionId: {
          videoId,
          userId,
          sessionId,
        },
      },
      create: {
        videoId,
        userId,
        sessionId,
        watchDuration,
        completionRate,
        quality,
        bandwidthUsed,
        ipAddress,
        userAgent,
      },
      update: {
        watchDuration,
        completionRate,
        quality,
        bandwidthUsed: {
          increment: bandwidthUsed || 0,
        },
      },
    });

    res.json({
      success: true,
      message: 'Analytics tracked successfully',
    });
  } catch (error) {
    console.error('Track analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track analytics',
    });
  }
};

/**
 * Get video thumbnails
 */
export const getVideoThumbnails = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;

    const thumbnails = await prisma.videoThumbnail.findMany({
      where: { videoId },
      orderBy: { timeOffset: 'asc' },
      select: {
        id: true,
        url: true,
        timeOffset: true,
        width: true,
        height: true,
      },
    });

    res.json({
      success: true,
      data: thumbnails,
    });
  } catch (error) {
    console.error('Get video thumbnails error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get thumbnails',
    });
  }
};

/**
 * Delete video
 */
export const deleteVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;

    // Get video info
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        thumbnails: true,
      },
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    // Delete from R2
    const keysToDelete = [video.r2Key];

    // Add HLS keys if they exist
    if (video.hlsMasterUrl) {
      // List and delete all HLS segments
      const hlsPrefix = video.r2Key.replace(/\/[^/]+$/, '/hls/');
      const hlsFiles = await r2Service.listFiles(hlsPrefix);
      keysToDelete.push(...hlsFiles.map(f => f.key));
    }

    // Add thumbnail keys
    keysToDelete.push(...video.thumbnails.map(t => t.r2Key));

    await r2Service.deleteFiles(keysToDelete);

    // Delete from database (cascades to thumbnails, tokens, analytics)
    await prisma.video.delete({
      where: { id: videoId },
    });

    res.json({
      success: true,
      message: 'Video deleted successfully',
    });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete video',
    });
  }
};

/**
 * Replace video (keeps progress data)
 */
export const replaceVideo = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video file provided',
      });
    }

    const { videoId } = req.params;
    const userId = req.user?.id;

    // Get existing video
    const existingVideo = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        chapter: {
          include: {
            courseVersion: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!existingVideo) {
      await fs.unlink(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    const courseId = existingVideo.chapter.courseVersion.courseId;
    const chapterId = existingVideo.chapterId;

    // Upload new file to R2
    const r2Key = r2Service.generateVideoKey(
      courseId,
      chapterId,
      req.file.originalname
    );

    const fileBuffer = await fs.readFile(req.file.path);
    await r2Service.uploadFile(r2Key, fileBuffer, req.file.mimetype);

    // Delete old files from R2
    const keysToDelete = [existingVideo.r2Key];
    if (existingVideo.hlsMasterUrl) {
      const hlsPrefix = existingVideo.r2Key.replace(/\/[^/]+$/, '/hls/');
      const hlsFiles = await r2Service.listFiles(hlsPrefix);
      keysToDelete.push(...hlsFiles.map(f => f.key));
    }
    await r2Service.deleteFiles(keysToDelete);

    // Update video record
    await prisma.video.update({
      where: { id: videoId },
      data: {
        originalName: req.file.originalname,
        originalSize: req.file.size,
        mimeType: req.file.mimetype,
        r2Key,
        processingStatus: 'PENDING',
        processingProgress: 0,
        processingError: null,
        hlsMasterUrl: null,
        hls480pUrl: null,
        hls720pUrl: null,
        hls1080pUrl: null,
      },
    });

    // Revoke all existing access tokens
    await videoAccessService.revokeAllVideoTokens(videoId);

    // Add to processing queue
    await queueService.addVideoProcessingJob(
      {
        videoId,
        chapterId,
        courseId,
        originalFilePath: req.file.path,
        r2Key,
        userId: userId || '',
      },
      1
    );

    // Clean up local file
    await fs.unlink(req.file.path);

    res.json({
      success: true,
      message: 'Video replaced successfully and queued for processing',
      data: {
        videoId,
        status: 'PENDING',
      },
    });
  } catch (error) {
    console.error('Replace video error:', error);

    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    res.status(500).json({
      success: false,
      message: 'Failed to replace video',
    });
  }
};

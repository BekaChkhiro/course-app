import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { createReadStream, statSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import videoAccessService from '../services/videoAccess.service';
import r2Service from '../services/r2.service';

// Configure multer for video uploads - save directly to uploads folder
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'videos');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
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
 * Upload video - R2 storage version
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

    // Generate R2 key for the video
    const r2Key = r2Service.generateVideoKey(courseId, chapterId, req.file.originalname);

    // Read file and upload to R2
    const fileBuffer = await fs.readFile(req.file.path);
    const uploadResult = await r2Service.uploadFile(r2Key, fileBuffer, req.file.mimetype, {
      originalName: req.file.originalname,
      courseId,
      chapterId,
    });

    // Delete local temp file after successful R2 upload
    await fs.unlink(req.file.path).catch(() => {});

    // Create video record
    const video = await prisma.video.create({
      data: {
        chapterId,
        originalName: req.file.originalname,
        originalSize: req.file.size,
        mimeType: req.file.mimetype,
        r2Key: r2Key,
        r2Bucket: process.env.R2_BUCKET_NAME || 'course-videos',
        processingStatus: 'COMPLETED',
        hlsMasterUrl: uploadResult.url,
      },
    });

    // Update chapter with video URL
    await prisma.chapter.update({
      where: { id: chapterId },
      data: { videoUrl: uploadResult.url },
    });

    res.json({
      success: true,
      message: 'Video uploaded successfully',
      data: {
        videoId: video.id,
        status: video.processingStatus,
        url: uploadResult.url,
      },
    });
  } catch (error) {
    console.error('Upload video error:', error);

    // Clean up local temp file if it exists
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
 * Stream video file directly with range support
 */
export const streamVideoFile = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;

    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    const videoPath = path.join(process.cwd(), 'uploads', video.r2Key);

    try {
      const stat = statSync(videoPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        const stream = createReadStream(videoPath, { start, end });

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': video.mimeType,
        });

        stream.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': video.mimeType,
        });

        createReadStream(videoPath).pipe(res);
      }
    } catch (err) {
      return res.status(404).json({
        success: false,
        message: 'Video file not found',
      });
    }
  } catch (error) {
    console.error('Stream video file error:', error);
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

    // Delete from R2 if stored there
    if (video.r2Bucket !== 'local' && video.r2Key) {
      await r2Service.deleteFile(video.r2Key).catch((err) => {
        console.error('Failed to delete video from R2:', err);
      });

      // Delete thumbnails from R2
      for (const thumb of video.thumbnails) {
        await r2Service.deleteFile(thumb.r2Key).catch(() => {});
      }
    } else {
      // Delete local file (legacy)
      const videoPath = path.join(process.cwd(), 'uploads', video.r2Key);
      await fs.unlink(videoPath).catch(() => {});

      for (const thumb of video.thumbnails) {
        const thumbPath = path.join(process.cwd(), 'uploads', thumb.r2Key);
        await fs.unlink(thumbPath).catch(() => {});
      }
    }

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

    // Delete old file from R2 or local
    if (existingVideo.r2Bucket !== 'local' && existingVideo.r2Key) {
      await r2Service.deleteFile(existingVideo.r2Key).catch(() => {});
    } else {
      const oldVideoPath = path.join(process.cwd(), 'uploads', existingVideo.r2Key);
      await fs.unlink(oldVideoPath).catch(() => {});
    }

    // Generate R2 key for the new video
    const r2Key = r2Service.generateVideoKey(courseId, chapterId, req.file.originalname);

    // Read file and upload to R2
    const fileBuffer = await fs.readFile(req.file.path);
    const uploadResult = await r2Service.uploadFile(r2Key, fileBuffer, req.file.mimetype, {
      originalName: req.file.originalname,
      courseId,
      chapterId,
    });

    // Delete local temp file
    await fs.unlink(req.file.path).catch(() => {});

    // Update video record
    await prisma.video.update({
      where: { id: videoId },
      data: {
        originalName: req.file.originalname,
        originalSize: req.file.size,
        mimeType: req.file.mimetype,
        r2Key: r2Key,
        r2Bucket: process.env.R2_BUCKET_NAME || 'course-videos',
        processingStatus: 'COMPLETED',
        processingProgress: 100,
        processingError: null,
        hlsMasterUrl: uploadResult.url,
        hls480pUrl: null,
        hls720pUrl: null,
        hls1080pUrl: null,
      },
    });

    // Update chapter with video URL
    await prisma.chapter.update({
      where: { id: chapterId },
      data: { videoUrl: uploadResult.url },
    });

    // Revoke all existing access tokens
    await videoAccessService.revokeAllVideoTokens(videoId);

    res.json({
      success: true,
      message: 'Video replaced successfully',
      data: {
        videoId,
        status: 'COMPLETED',
        url: uploadResult.url,
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

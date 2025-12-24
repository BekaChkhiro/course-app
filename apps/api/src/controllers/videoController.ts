import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { createReadStream, statSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import videoAccessService from '../services/videoAccess.service';
import r2Service from '../services/r2.service';

// In-memory store for stream tokens (in production, use Redis)
const streamTokens = new Map<string, {
  videoId: string;
  userId: string;
  expiresAt: Date;
  watermark: { text: string; visibleText: string };
  externalUrl?: string; // For proxying external videos (YouTube, etc.)
  r2Key?: string; // For R2 videos
  fileSize?: number; // Cached file size for faster streaming
  mimeType?: string; // Cached mime type
}>();

// Cache for R2 file metadata (5 minute TTL)
const metadataCache = new Map<string, { size: number; mimeType: string; cachedAt: number }>();
const METADATA_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Clean expired tokens periodically
setInterval(() => {
  const now = new Date();
  for (const [token, data] of streamTokens.entries()) {
    if (data.expiresAt < now) {
      streamTokens.delete(token);
    }
  }
}, 60000); // Clean every minute

// Helper to decode filename with proper UTF-8 encoding
const decodeFilename = (filename: string): string => {
  try {
    // Try to decode as UTF-8 (handles cases where filename is incorrectly encoded)
    return Buffer.from(filename, 'latin1').toString('utf8');
  } catch {
    return filename;
  }
};

// Configure multer for video uploads - save directly to uploads folder
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'videos');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Decode the original filename properly
    file.originalname = decodeFilename(file.originalname);
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
    // Decode filename for proper extension check
    const decodedName = decodeFilename(file.originalname);
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
    const allowedExts = ['.mp4', '.mov', '.avi', '.mkv'];
    const ext = path.extname(decodedName).toLowerCase();

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

    // Use stream upload instead of reading entire file to memory
    // This prevents memory issues and timeouts with large video files
    const fileStream = createReadStream(req.file.path);
    const uploadResult = await r2Service.uploadStream(r2Key, fileStream, req.file.mimetype, {
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
 * Get presigned URL for direct upload to R2 (bypasses server)
 * This is the recommended way for large video files
 */
export const getPresignedUploadUrl = async (req: AuthRequest, res: Response) => {
  try {
    const { chapterId, fileName, fileSize, mimeType } = req.body;

    if (!chapterId || !fileName || !mimeType) {
      return res.status(400).json({
        success: false,
        message: 'chapterId, fileName, and mimeType are required',
      });
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'];
    if (!allowedTypes.includes(mimeType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only MP4, MOV, AVI, MKV, and WebM are allowed.',
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
      return res.status(404).json({
        success: false,
        message: 'Chapter not found',
      });
    }

    const courseId = chapter.courseVersion.courseId;

    // Generate R2 key for the video
    const r2Key = r2Service.generateVideoKey(courseId, chapterId, fileName);

    // Generate presigned upload URL (valid for 1 hour)
    const uploadUrl = await r2Service.getUploadPresignedUrl(r2Key, mimeType, 3600);

    res.json({
      success: true,
      data: {
        uploadUrl,
        r2Key,
        expiresIn: 3600,
      },
    });
  } catch (error) {
    console.error('Get presigned upload URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get upload URL',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Confirm video upload after client uploaded directly to R2
 */
export const confirmVideoUpload = async (req: AuthRequest, res: Response) => {
  try {
    const { chapterId, r2Key, fileName, fileSize, mimeType } = req.body;

    if (!chapterId || !r2Key || !fileName) {
      return res.status(400).json({
        success: false,
        message: 'chapterId, r2Key, and fileName are required',
      });
    }

    // Verify the file exists in R2
    try {
      await r2Service.getFileMetadata(r2Key);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Video file not found in storage. Upload may have failed.',
      });
    }

    // Get chapter info
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
    });

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found',
      });
    }

    // Delete existing video if any
    const existingVideo = await prisma.video.findFirst({
      where: { chapterId },
    });

    if (existingVideo && existingVideo.r2Key) {
      await r2Service.deleteFile(existingVideo.r2Key).catch(() => {});
      await prisma.video.delete({ where: { id: existingVideo.id } });
    }

    // Generate public URL
    const publicUrl = `${process.env.R2_PUBLIC_URL || ''}/${r2Key}`;

    // Create video record
    const video = await prisma.video.create({
      data: {
        chapterId,
        originalName: fileName,
        originalSize: fileSize || 0,
        mimeType: mimeType || 'video/mp4',
        r2Key: r2Key,
        r2Bucket: process.env.R2_BUCKET_NAME || 'course-videos',
        processingStatus: 'COMPLETED',
        hlsMasterUrl: publicUrl,
      },
    });

    // Update chapter with video URL
    await prisma.chapter.update({
      where: { id: chapterId },
      data: { videoUrl: publicUrl },
    });

    res.json({
      success: true,
      message: 'Video upload confirmed',
      data: {
        videoId: video.id,
        status: video.processingStatus,
      },
    });
  } catch (error) {
    console.error('Confirm video upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm video upload',
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
 * Get secure video URL (returns proxied stream URL - no R2 URL exposed)
 */
export const getSecureVideoUrl = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get video info
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

    // Check if user has access (purchased or free chapter)
    if (!video.chapter.isFree) {
      // Check for any completed purchase on the course
      const purchase = await prisma.purchase.findFirst({
        where: {
          userId,
          courseId,
          status: 'COMPLETED',
        },
      });

      // Also check UserVersionAccess for this specific version
      const versionAccess = await prisma.userVersionAccess.findUnique({
        where: {
          userId_courseVersionId: {
            userId,
            courseVersionId: video.chapter.courseVersionId,
          },
        },
      });

      console.log('[getSecureVideoUrl] Access check:', {
        userId,
        courseId,
        courseVersionId: video.chapter.courseVersionId,
        hasPurchase: !!purchase,
        hasVersionAccess: !!versionAccess,
        isFree: video.chapter.isFree,
      });

      if (!purchase && !versionAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this video',
        });
      }
    }

    // Get user info for watermark
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    const watermark = {
      text: user?.email || userId,
      visibleText: user?.email || userId,
    };

    // Generate secure stream token (expires in 2 hours)
    const streamToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    // Determine video source and store in token
    let hasR2Source = false;
    let hasExternalSource = false;
    let cachedFileSize: number | undefined;
    let cachedMimeType: string | undefined;

    // Check if video file exists in R2 and cache metadata
    if (video.r2Key) {
      try {
        // Check metadata cache first
        const cached = metadataCache.get(video.r2Key);
        if (cached && (Date.now() - cached.cachedAt) < METADATA_CACHE_TTL) {
          hasR2Source = true;
          cachedFileSize = cached.size;
          cachedMimeType = cached.mimeType;
        } else {
          // Fetch and cache metadata
          const metadata = await r2Service.getFileMetadata(video.r2Key);
          hasR2Source = true;
          cachedFileSize = metadata.size;
          cachedMimeType = metadata.contentType || video.mimeType || 'video/mp4';
          metadataCache.set(video.r2Key, {
            size: cachedFileSize,
            mimeType: cachedMimeType,
            cachedAt: Date.now(),
          });
        }
      } catch (err) {
        console.error('R2 file not found:', video.r2Key, err);
        hasR2Source = false;
      }
    }

    // Check for external URL fallback
    if (!hasR2Source && video.hlsMasterUrl) {
      hasExternalSource = true;
    }

    // No video source available
    if (!hasR2Source && !hasExternalSource) {
      return res.status(404).json({
        success: false,
        message: 'Video file not available',
      });
    }

    // Store token with source info and cached metadata (NEVER expose actual URLs to client)
    streamTokens.set(streamToken, {
      videoId,
      userId,
      expiresAt,
      watermark,
      r2Key: hasR2Source ? video.r2Key! : undefined,
      externalUrl: hasExternalSource ? video.hlsMasterUrl! : undefined,
      fileSize: cachedFileSize,
      mimeType: cachedMimeType,
    });

    // ALWAYS return proxied URL (no real URL exposed in browser)
    const apiUrl = process.env.API_URL || 'http://localhost:4000';
    const proxyUrl = `${apiUrl}/api/videos/proxy-stream/${streamToken}`;

    res.json({
      success: true,
      data: {
        url: proxyUrl,
        expiresAt: expiresAt.toISOString(),
        watermark,
        isExternal: hasExternalSource,
      },
    });
  } catch (error) {
    console.error('Get secure video URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get secure video URL',
    });
  }
};

/**
 * Proxy stream video - hides real R2 URL from client
 */
export const proxyStreamVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { streamToken } = req.params;
    const range = req.headers.range;
    const referer = req.headers.referer || req.headers.origin || '';
    const userAgent = req.headers['user-agent'] || '';

    // Validate stream token
    const tokenData = streamTokens.get(streamToken);
    if (!tokenData) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired stream token',
      });
    }

    // Check if token expired
    if (tokenData.expiresAt < new Date()) {
      streamTokens.delete(streamToken);
      return res.status(401).json({
        success: false,
        message: 'Stream token expired',
      });
    }

    // Security checks
    const allowedOrigins = [
      'http://localhost:3000',
      'https://localhost:3000',
      process.env.CORS_ORIGIN || '',
      process.env.FRONTEND_URL || '',
    ].filter(Boolean);

    // Check referer - MUST come from our site (required for video requests)
    const isValidReferer = referer && allowedOrigins.some(origin => referer.startsWith(origin));

    // Check user-agent - block common download tools
    const blockedAgents = ['wget', 'curl', 'python', 'java', 'libwww', 'httpclient', 'okhttp', 'postman', 'insomnia', 'download', 'idm'];
    const isBlockedAgent = blockedAgents.some(agent => userAgent.toLowerCase().includes(agent));

    // Check Accept header - direct browser navigation starts with text/html
    const acceptHeader = req.headers.accept || '';
    const isDirectBrowserNavigation = acceptHeader.startsWith('text/html');

    // Check Sec-Fetch headers (modern browsers send these)
    const secFetchDest = req.headers['sec-fetch-dest'] || '';

    // Block if:
    // 1. Blocked user agent
    // 2. Direct browser navigation (typing URL in address bar)
    // 3. No valid referer from our site
    // 4. Sec-Fetch-Dest indicates document navigation
    const isDocumentNavigation = secFetchDest === 'document';

    // Helper function to render error page
    const renderErrorPage = (title: string, message: string, icon: string) => {
      const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';
      return `
<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #091e33 0%, #0e3355 50%, #1e3d63 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      padding: 20px;
    }
    .card {
      background: rgba(255, 255, 255, 0.98);
      border-radius: 24px;
      padding: 48px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      animation: slideUp 0.5s ease-out;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 24px;
      background: linear-gradient(135deg, #ff4d40 0%, #ed3124 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 30px -5px rgba(255, 77, 64, 0.4);
    }
    .icon svg {
      width: 40px;
      height: 40px;
      color: white;
    }
    h1 {
      font-size: 24px;
      color: #0e3355;
      margin-bottom: 12px;
      font-weight: 700;
    }
    p {
      color: #5a88b8;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 32px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 14px 28px;
      background: linear-gradient(135deg, #0e3355 0%, #1e3d63 100%);
      color: white;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      transition: all 0.2s;
      box-shadow: 0 4px 15px -3px rgba(14, 51, 85, 0.4);
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px -5px rgba(14, 51, 85, 0.5);
      background: linear-gradient(135deg, #1e3d63 0%, #2d5280 100%);
    }
    .btn svg {
      width: 20px;
      height: 20px;
    }
    .logo {
      width: 120px;
      margin-bottom: 24px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      ${icon}
    </div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="${frontendUrl}/dashboard" class="btn">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
      </svg>
      პლატფორმაზე დაბრუნება
    </a>
  </div>
</body>
</html>`;
    };

    const shieldIcon = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>`;
    const blockIcon = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>`;

    if (isBlockedAgent) {
      console.log(`Blocked download tool - User-Agent: ${userAgent}`);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(403).send(renderErrorPage(
        'ჩამოტვირთვა აკრძალულია',
        'ვიდეოს ჩამოტვირთვა მესამე მხარის პროგრამებით შეუძლებელია. ვიდეოები დაცულია საავტორო უფლებებით.',
        blockIcon
      ));
    }

    if (isDocumentNavigation || isDirectBrowserNavigation) {
      console.log(`Blocked direct navigation - Accept: ${acceptHeader}, Sec-Fetch-Dest: ${secFetchDest}`);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(403).send(renderErrorPage(
        'წვდომა შეზღუდულია',
        'ვიდეო კონტენტი ხელმისაწვდომია მხოლოდ პლატფორმის ფარგლებში. გთხოვთ, დაუბრუნდეთ სასწავლო გვერდს ვიდეოს სანახავად.',
        shieldIcon
      ));
    }

    if (!isValidReferer) {
      console.log(`Blocked - invalid referer: ${referer}`);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(403).send(renderErrorPage(
        'არასწორი წვდომა',
        'ვიდეოზე წვდომა შესაძლებელია მხოლოდ პლატფორმიდან. გთხოვთ, შედით თქვენს ანგარიშში და გახსენით კურსი.',
        shieldIcon
      ));
    }

    // Common CORS headers for video streaming
    const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
    const corsHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Credentials': 'true',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    };

    // Handle external URL streaming (proxy the external video)
    if (tokenData.externalUrl) {
      try {
        // Fetch external video and proxy it
        const https = await import('https');
        const http = await import('http');
        const url = await import('url');

        const parsedUrl = new url.URL(tokenData.externalUrl);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        const options: any = {
          hostname: parsedUrl.hostname,
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        };

        // Add range header if present
        if (range) {
          options.headers['Range'] = range;
        }

        const proxyReq = protocol.request(options, (proxyRes: any) => {
          // Forward status and headers
          const responseHeaders: Record<string, string> = {
            'Content-Type': proxyRes.headers['content-type'] || 'video/mp4',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            ...corsHeaders,
          };

          if (proxyRes.headers['content-length']) {
            responseHeaders['Content-Length'] = proxyRes.headers['content-length'];
          }
          if (proxyRes.headers['content-range']) {
            responseHeaders['Content-Range'] = proxyRes.headers['content-range'];
          }
          if (proxyRes.headers['accept-ranges']) {
            responseHeaders['Accept-Ranges'] = proxyRes.headers['accept-ranges'];
          }

          res.writeHead(proxyRes.statusCode || 200, responseHeaders);
          proxyRes.pipe(res);
        });

        proxyReq.on('error', (err: Error) => {
          console.error('External video proxy error:', err);
          res.status(500).json({
            success: false,
            message: 'Failed to stream external video',
          });
        });

        proxyReq.end();
        return;
      } catch (err) {
        console.error('External video stream error:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to stream external video',
        });
      }
    }

    // Handle R2 video streaming
    if (!tokenData.r2Key) {
      return res.status(404).json({
        success: false,
        message: 'Video source not found',
      });
    }

    // Get file from R2 and stream it
    try {
      const video = await prisma.video.findUnique({
        where: { id: tokenData.videoId },
        select: { mimeType: true },
      });

      const fileStream = await r2Service.getFile(tokenData.r2Key);
      const metadata = await r2Service.getFileMetadata(tokenData.r2Key);
      const fileSize = metadata.size;

      // Handle range requests for video seeking
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': video?.mimeType || 'video/mp4',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          ...corsHeaders,
        });

        // For range requests, we need to fetch a specific range from R2
        // S3/R2 GetObjectCommand supports Range header
        const rangeStream = await r2Service.getFileRange(tokenData.r2Key, start, end);
        rangeStream.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': video?.mimeType || 'video/mp4',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          ...corsHeaders,
        });

        fileStream.pipe(res);
      }
    } catch (err) {
      console.error('R2 stream error:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to stream video',
      });
    }
  } catch (error) {
    console.error('Proxy stream video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stream video',
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

    // Use stream upload instead of reading entire file to memory
    const fileStream = createReadStream(req.file.path);
    const uploadResult = await r2Service.uploadStream(r2Key, fileStream, req.file.mimetype, {
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

import { Job } from 'bull';
import { prisma } from '../config/database';
import queueService from '../services/queue.service';
import videoService from '../services/video.service';
import r2Service from '../services/r2.service';
import path from 'path';
import { promises as fs } from 'fs';

interface VideoProcessingJobData {
  videoId: string;
  chapterId: string;
  courseId: string;
  originalFilePath: string;
  r2Key: string;
  userId: string;
}

interface ThumbnailGenerationJobData {
  videoId: string;
  videoPath: string;
  chapterId: string;
  courseId: string;
  interval: number;
}

interface VideoMetadataJobData {
  videoId: string;
  videoPath: string;
}

class VideoProcessor {
  constructor() {
    this.setupProcessors();
  }

  /**
   * Set up queue processors
   */
  private setupProcessors(): void {
    // Video processing queue processor
    queueService.getVideoProcessingQueue().process(async (job: Job<VideoProcessingJobData>) => {
      return this.processVideo(job);
    });

    // Thumbnail generation queue processor
    queueService.getThumbnailQueue().process(async (job: Job<ThumbnailGenerationJobData>) => {
      return this.generateThumbnails(job);
    });

    // Metadata extraction queue processor
    queueService.getMetadataQueue().process(async (job: Job<VideoMetadataJobData>) => {
      return this.extractMetadata(job);
    });
  }

  /**
   * Process video: convert to HLS with multiple qualities
   */
  private async processVideo(job: Job<VideoProcessingJobData>): Promise<any> {
    const { videoId, chapterId, courseId, originalFilePath, r2Key } = job.data;

    try {
      console.log(`Starting video processing for video ${videoId}`);

      // Update status to processing
      await prisma.video.update({
        where: { id: videoId },
        data: {
          processingStatus: 'PROCESSING',
          processingProgress: 0,
        },
      });

      // Download video from R2 to temp location
      const tempDir = path.join(process.cwd(), 'temp');
      await fs.mkdir(tempDir, { recursive: true });
      const localVideoPath = path.join(tempDir, `${videoId}_original.mp4`);

      console.log(`Downloading video from R2: ${r2Key}`);
      const videoStream = await r2Service.getFile(r2Key);
      const writeStream = require('fs').createWriteStream(localVideoPath);

      await new Promise((resolve, reject) => {
        videoStream.pipe(writeStream);
        videoStream.on('error', reject);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      // Generate encryption key
      console.log('Generating encryption key');
      const { key: encryptionKey, iv: encryptionIv } = videoService.generateEncryptionKey();

      // Update video with encryption info
      await prisma.video.update({
        where: { id: videoId },
        data: {
          encryptionKey,
          encryptionIv,
          keyRotationAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      // Convert to HLS
      console.log('Converting video to HLS');
      const hlsResult = await videoService.convertToHLS(
        videoId,
        localVideoPath,
        courseId,
        chapterId,
        encryptionKey,
        (progress) => {
          job.progress(progress);
          prisma.video.update({
            where: { id: videoId },
            data: { processingProgress: Math.floor(progress) },
          });
        }
      );

      // Update video record with HLS URLs
      const variant480p = hlsResult.variants.find(v => v.quality === '480p');
      const variant720p = hlsResult.variants.find(v => v.quality === '720p');
      const variant1080p = hlsResult.variants.find(v => v.quality === '1080p');

      await prisma.video.update({
        where: { id: videoId },
        data: {
          hlsMasterUrl: r2Service.getPublicUrl(hlsResult.masterPlaylistKey),
          hls480pUrl: variant480p?.url,
          hls720pUrl: variant720p?.url,
          hls1080pUrl: variant1080p?.url,
          processingStatus: 'COMPLETED',
          processingProgress: 100,
          processedAt: new Date(),
        },
      });

      // Queue thumbnail generation
      await queueService.addThumbnailGenerationJob({
        videoId,
        videoPath: localVideoPath,
        chapterId,
        courseId,
        interval: 10,
      });

      // Queue metadata extraction
      await queueService.addMetadataExtractionJob({
        videoId,
        videoPath: localVideoPath,
      });

      console.log(`Video processing completed for ${videoId}`);

      return {
        success: true,
        videoId,
        hlsMasterUrl: r2Service.getPublicUrl(hlsResult.masterPlaylistKey),
        variants: hlsResult.variants,
      };
    } catch (error) {
      console.error(`Video processing failed for ${videoId}:`, error);

      // Update status to failed
      await prisma.video.update({
        where: { id: videoId },
        data: {
          processingStatus: 'FAILED',
          processingError: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    } finally {
      // Clean up temp files
      try {
        const tempDir = path.join(process.cwd(), 'temp');
        const localVideoPath = path.join(tempDir, `${videoId}_original.mp4`);
        await fs.unlink(localVideoPath).catch(() => {});
        await videoService.cleanup(videoId);
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }
  }

  /**
   * Generate thumbnails for video
   */
  private async generateThumbnails(job: Job<ThumbnailGenerationJobData>): Promise<any> {
    const { videoId, videoPath, chapterId, courseId, interval } = job.data;

    try {
      console.log(`Generating thumbnails for video ${videoId}`);

      const thumbnails = await videoService.generateThumbnails(
        videoId,
        videoPath,
        courseId,
        chapterId,
        interval
      );

      console.log(`Generated ${thumbnails.length} thumbnails for video ${videoId}`);

      return {
        success: true,
        videoId,
        thumbnailCount: thumbnails.length,
        thumbnails,
      };
    } catch (error) {
      console.error(`Thumbnail generation failed for ${videoId}:`, error);
      throw error;
    }
  }

  /**
   * Extract video metadata
   */
  private async extractMetadata(job: Job<VideoMetadataJobData>): Promise<any> {
    const { videoId, videoPath } = job.data;

    try {
      console.log(`Extracting metadata for video ${videoId}`);

      const metadata = await videoService.extractMetadata(videoPath);

      // Update video record with metadata
      await prisma.video.update({
        where: { id: videoId },
        data: {
          duration: Math.floor(metadata.duration),
          width: metadata.width,
          height: metadata.height,
          metadata: {
            bitrate: metadata.bitrate,
            codec: metadata.codec,
            fps: metadata.fps,
          },
        },
      });

      console.log(`Metadata extracted for video ${videoId}`);

      return {
        success: true,
        videoId,
        metadata,
      };
    } catch (error) {
      console.error(`Metadata extraction failed for ${videoId}:`, error);
      throw error;
    }
  }
}

// Initialize video processor
export default new VideoProcessor();

import ffmpeg from 'fluent-ffmpeg';
import { createReadStream, createWriteStream, promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import r2Service from './r2.service';
import { prisma } from '../config/database';

// Set FFmpeg paths - prefer system-installed ffmpeg (Homebrew) over static binaries
// Static binaries don't work on Apple Silicon Macs
const getSystemPath = (binary: string): string | null => {
  try {
    return execSync(`which ${binary}`, { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
};

const systemFfmpeg = getSystemPath('ffmpeg');
const systemFfprobe = getSystemPath('ffprobe');

if (systemFfmpeg) {
  ffmpeg.setFfmpegPath(systemFfmpeg);
  console.log(`📹 Using system FFmpeg: ${systemFfmpeg}`);
} else {
  // Fallback to static (might not work on Apple Silicon)
  try {
    const ffmpegStatic = require('ffmpeg-static');
    if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic);
  } catch {
    console.warn('⚠️ FFmpeg not found');
  }
}

if (systemFfprobe) {
  ffmpeg.setFfprobePath(systemFfprobe);
  console.log(`📹 Using system FFprobe: ${systemFfprobe}`);
} else {
  // Fallback to static
  try {
    const ffprobeStatic = require('ffprobe-static');
    if (ffprobeStatic?.path) ffmpeg.setFfprobePath(ffprobeStatic.path);
  } catch {
    console.warn('⚠️ FFprobe not found');
  }
}

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  bitrate: number;
  codec: string;
  fps: number;
  size: number;
}

interface HLSQuality {
  name: string;
  width: number;
  height: number;
  videoBitrate: string;
  audioBitrate: string;
}

const HLS_QUALITIES: HLSQuality[] = [
  {
    name: '480p',
    width: 854,
    height: 480,
    videoBitrate: '1000k',
    audioBitrate: '128k',
  },
  {
    name: '720p',
    width: 1280,
    height: 720,
    videoBitrate: '2500k',
    audioBitrate: '128k',
  },
  {
    name: '1080p',
    width: 1920,
    height: 1080,
    videoBitrate: '5000k',
    audioBitrate: '192k',
  },
];

class VideoService {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp');
    this.ensureTempDir();
  }

  /**
   * Ensure temp directory exists
   */
  private async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Error creating temp directory:', error);
    }
  }

  /**
   * Extract video metadata
   */
  async extractMetadata(videoPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          return reject(err);
        }

        const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
        if (!videoStream) {
          return reject(new Error('No video stream found'));
        }

        resolve({
          duration: metadata.format.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          bitrate: metadata.format.bit_rate || 0,
          codec: videoStream.codec_name || '',
          fps: eval(videoStream.r_frame_rate || '0') as number,
          size: metadata.format.size || 0,
        });
      });
    });
  }

  /**
   * Generate encryption key and IV for HLS
   */
  generateEncryptionKey(): { key: string; iv: string } {
    const key = crypto.randomBytes(16).toString('hex');
    const iv = crypto.randomBytes(16).toString('hex');
    return { key, iv };
  }

  /**
   * Convert video to HLS with multiple quality levels
   */
  async convertToHLS(
    videoId: string,
    inputPath: string,
    courseId: string,
    chapterId: string,
    encryptionKey?: string,
    onProgress?: (progress: number) => void
  ): Promise<{
    masterPlaylistKey: string;
    variants: Array<{ quality: string; playlistKey: string; url: string }>;
  }> {
    try {
      const metadata = await this.extractMetadata(inputPath);
      const outputDir = path.join(this.tempDir, videoId);
      await fs.mkdir(outputDir, { recursive: true });

      // Determine which qualities to generate based on input resolution
      const qualitiesToGenerate = HLS_QUALITIES.filter(
        (q) => q.height <= metadata.height
      );

      if (qualitiesToGenerate.length === 0) {
        qualitiesToGenerate.push(HLS_QUALITIES[0]); // At least 480p
      }

      const variants: Array<{ quality: string; playlistKey: string; url: string }> = [];

      // Generate HLS for each quality
      for (const quality of qualitiesToGenerate) {
        const qualityDir = path.join(outputDir, quality.name);
        await fs.mkdir(qualityDir, { recursive: true });

        const playlistName = 'playlist.m3u8';
        const playlistPath = path.join(qualityDir, playlistName);

        await this.generateHLSForQuality(
          inputPath,
          qualityDir,
          quality,
          encryptionKey,
          metadata.duration,
          onProgress
        );

        // Upload playlist and segments to R2
        const playlistKey = r2Service.generateHLSKey(
          courseId,
          chapterId,
          videoId,
          quality.name,
          playlistName
        );

        console.log(`📤 Uploading HLS playlist: ${playlistKey}`);
        const playlistBuffer = await fs.readFile(playlistPath);
        await r2Service.uploadFile(
          playlistKey,
          playlistBuffer,
          'application/vnd.apple.mpegurl'
        );
        console.log(`✅ Uploaded playlist for ${quality.name}`);

        // Upload segments
        const segmentFiles = await fs.readdir(qualityDir);
        for (const file of segmentFiles) {
          if (file.endsWith('.ts') || file.endsWith('.key')) {
            const segmentPath = path.join(qualityDir, file);
            const segmentBuffer = await fs.readFile(segmentPath);
            const segmentKey = r2Service.generateHLSKey(
              courseId,
              chapterId,
              videoId,
              quality.name,
              file
            );

            await r2Service.uploadFile(
              segmentKey,
              segmentBuffer,
              file.endsWith('.ts') ? 'video/MP2T' : 'application/octet-stream'
            );
          }
        }

        variants.push({
          quality: quality.name,
          playlistKey,
          url: r2Service.getPublicUrl(playlistKey),
        });
      }

      // Create master playlist
      const masterPlaylistContent = this.generateMasterPlaylist(
        variants,
        qualitiesToGenerate
      );
      const masterPlaylistKey = r2Service.generateHLSKey(
        courseId,
        chapterId,
        videoId,
        'master',
        'master.m3u8'
      );

      await r2Service.uploadFile(
        masterPlaylistKey,
        Buffer.from(masterPlaylistContent),
        'application/vnd.apple.mpegurl'
      );

      // Clean up temp files
      await fs.rm(outputDir, { recursive: true, force: true });

      return {
        masterPlaylistKey,
        variants,
      };
    } catch (error) {
      console.error('HLS conversion error:', error);
      throw error;
    }
  }

  /**
   * Generate HLS for a specific quality
   */
  private async generateHLSForQuality(
    inputPath: string,
    outputDir: string,
    quality: HLSQuality,
    encryptionKey?: string,
    duration?: number,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const segmentDuration = 6; // 6 seconds per segment
      const playlistPath = path.join(outputDir, 'playlist.m3u8');

      let command = ffmpeg(inputPath)
        .outputOptions([
          '-c:v libx264',
          '-c:a aac',
          `-b:v ${quality.videoBitrate}`,
          `-b:a ${quality.audioBitrate}`,
          '-preset fast',
          '-g 48',
          '-sc_threshold 0',
          '-keyint_min 48',
          `-s ${quality.width}x${quality.height}`,
          '-f hls',
          `-hls_time ${segmentDuration}`,
          '-hls_playlist_type vod',
          '-hls_segment_filename',
          path.join(outputDir, 'segment_%03d.ts'),
        ]);

      // Add encryption if key provided
      if (encryptionKey) {
        const keyPath = path.join(outputDir, 'encryption.key');
        const ivHex = crypto.randomBytes(16).toString('hex');

        // Write key file
        require('fs').writeFileSync(keyPath, Buffer.from(encryptionKey, 'hex'));

        command = command.outputOptions([
          '-hls_key_info_file',
          this.createKeyInfoFile(outputDir, keyPath, ivHex),
        ]);
      }

      command
        .output(playlistPath)
        .on('start', (cmdLine) => {
          console.log('FFmpeg command:', cmdLine);
        })
        .on('progress', (progress) => {
          if (onProgress && duration && progress.percent) {
            onProgress(Math.min(progress.percent, 100));
          }
        })
        .on('end', () => {
          console.log(`HLS generation completed for ${quality.name}`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`HLS generation error for ${quality.name}:`, err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Create key info file for HLS encryption
   */
  private createKeyInfoFile(
    outputDir: string,
    keyPath: string,
    iv: string
  ): string {
    const keyInfoPath = path.join(outputDir, 'key_info.txt');
    const keyUri = path.basename(keyPath);
    const content = `${keyUri}\n${keyPath}\n${iv}`;

    require('fs').writeFileSync(keyInfoPath, content);
    return keyInfoPath;
  }

  /**
   * Generate master playlist
   */
  private generateMasterPlaylist(
    variants: Array<{ quality: string; playlistKey: string; url: string }>,
    qualities: HLSQuality[]
  ): string {
    let playlist = '#EXTM3U\n#EXT-X-VERSION:3\n\n';

    variants.forEach((variant, index) => {
      const quality = qualities.find((q) => q.name === variant.quality);
      if (quality) {
        const bandwidth = parseInt(quality.videoBitrate) * 1000;
        playlist += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${quality.width}x${quality.height}\n`;
        playlist += `../${variant.quality}/playlist.m3u8\n\n`;
      }
    });

    return playlist;
  }

  /**
   * Generate video thumbnails
   */
  async generateThumbnails(
    videoId: string,
    videoPath: string,
    courseId: string,
    chapterId: string,
    interval: number = 10 // Generate thumbnail every 10 seconds
  ): Promise<
    Array<{
      key: string;
      url: string;
      timeOffset: number;
    }>
  > {
    try {
      const metadata = await this.extractMetadata(videoPath);
      const thumbnailCount = Math.floor(metadata.duration / interval);
      const outputDir = path.join(this.tempDir, `${videoId}_thumbs`);
      await fs.mkdir(outputDir, { recursive: true });

      const thumbnails: Array<{ key: string; url: string; timeOffset: number }> =
        [];

      for (let i = 0; i < thumbnailCount; i++) {
        const timeOffset = i * interval;
        const thumbnailPath = path.join(outputDir, `thumb_${i}.jpg`);

        await this.generateSingleThumbnail(videoPath, thumbnailPath, timeOffset);

        // Upload to R2
        const thumbnailKey = r2Service.generateThumbnailKey(
          courseId,
          chapterId,
          videoId,
          i
        );
        const thumbnailBuffer = await fs.readFile(thumbnailPath);
        const { url } = await r2Service.uploadFile(
          thumbnailKey,
          thumbnailBuffer,
          'image/jpeg'
        );

        thumbnails.push({
          key: thumbnailKey,
          url,
          timeOffset,
        });

        // Save to database
        await prisma.videoThumbnail.create({
          data: {
            videoId,
            r2Key: thumbnailKey,
            url,
            timeOffset,
            width: 320,
            height: 180,
          },
        });
      }

      // Clean up
      await fs.rm(outputDir, { recursive: true, force: true });

      return thumbnails;
    } catch (error) {
      console.error('Thumbnail generation error:', error);
      throw error;
    }
  }

  /**
   * Generate a single thumbnail
   */
  private async generateSingleThumbnail(
    videoPath: string,
    outputPath: string,
    timeOffset: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: [timeOffset],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: '320x180',
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });
  }

  /**
   * Clean up temp files
   */
  async cleanup(videoId: string): Promise<void> {
    try {
      const videoDir = path.join(this.tempDir, videoId);
      await fs.rm(videoDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

export default new VideoService();

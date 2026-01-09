/**
 * Script to fix remaining stretched videos after partial reprocessing
 *
 * Video 2 (cmjtqdw3t0007ov05b44vgfmm): Update database with existing HLS URLs
 * Video 3 (cmjtwpoz4000eov05d60a7gv0): Full reprocessing
 *
 * Run with: cd apps/api && npx tsx src/scripts/fixRemainingVideos.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

// R2 configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

// Set FFmpeg path
const getSystemPath = (binary: string): string | null => {
  try {
    return execSync(`which ${binary}`, { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
};

const systemFfmpeg = getSystemPath('ffmpeg');
const systemFfprobe = getSystemPath('ffprobe');

if (systemFfmpeg) ffmpeg.setFfmpegPath(systemFfmpeg);
if (systemFfprobe) ffmpeg.setFfprobePath(systemFfprobe);

// Import AWS SDK for R2
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID!,
    secretAccessKey: R2_SECRET_ACCESS_KEY!,
  },
});

interface HLSQuality {
  name: string;
  height: number;
  videoBitrate: string;
  audioBitrate: string;
}

const HLS_QUALITIES: HLSQuality[] = [
  { name: '480p', height: 480, videoBitrate: '1000k', audioBitrate: '128k' },
  { name: '720p', height: 720, videoBitrate: '2500k', audioBitrate: '128k' },
  { name: '1080p', height: 1080, videoBitrate: '5000k', audioBitrate: '192k' },
];

async function downloadFromR2(key: string, localPath: string): Promise<void> {
  console.log(`   📥 Downloading from R2: ${key}`);

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });

  const response = await s3Client.send(command);
  const stream = response.Body as Readable;

  const writeStream = require('fs').createWriteStream(localPath);

  await new Promise((resolve, reject) => {
    stream.pipe(writeStream);
    stream.on('error', reject);
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });

  console.log(`   ✅ Downloaded to: ${localPath}`);
}

async function uploadToR2(localPath: string, key: string, contentType: string): Promise<string> {
  const fileBuffer = await fs.readFile(localPath);

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return `${R2_PUBLIC_URL}/${key}`;
}

async function deleteOldHLSFiles(videoId: string, courseId: string, chapterId: string): Promise<void> {
  console.log(`   🗑️  Deleting old HLS files...`);

  const prefix = `courses/${courseId}/chapters/${chapterId}/videos/${videoId}/`;

  const listCommand = new ListObjectsV2Command({
    Bucket: R2_BUCKET,
    Prefix: prefix,
  });

  const response = await s3Client.send(listCommand);

  if (response.Contents) {
    for (const object of response.Contents) {
      if (object.Key) {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: R2_BUCKET,
          Key: object.Key,
        });
        await s3Client.send(deleteCommand);
      }
    }
    console.log(`   ✅ Deleted ${response.Contents.length} old HLS files`);
  }
}

async function getVideoMetadata(videoPath: string): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      if (!videoStream) return reject(new Error('No video stream found'));

      resolve({
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        duration: metadata.format.duration || 0,
      });
    });
  });
}

async function generateHLSForQuality(
  inputPath: string,
  outputDir: string,
  quality: HLSQuality,
  isPortrait: boolean,
  originalHeight: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const playlistPath = path.join(outputDir, 'playlist.m3u8');

    // Only generate this quality if original video is tall enough
    if (originalHeight < quality.height) {
      console.log(`   ⏭️  Skipping ${quality.name} (original height ${originalHeight} < ${quality.height})`);
      resolve();
      return;
    }

    // Calculate scale filter maintaining aspect ratio
    const scaleFilter = isPortrait
      ? `scale=-2:${quality.height}`  // For portrait: height fixed, width auto
      : `scale=-2:${quality.height}`; // For landscape: also scale by height to maintain ratio

    console.log(`   🎬 Generating ${quality.name}...`);

    ffmpeg(inputPath)
      .outputOptions([
        '-c:v libx264',
        '-c:a aac',
        `-b:v ${quality.videoBitrate}`,
        `-b:a ${quality.audioBitrate}`,
        '-preset fast',
        '-g 48',
        '-sc_threshold 0',
        '-keyint_min 48',
        `-vf ${scaleFilter}`,
        '-f hls',
        '-hls_time 6',
        '-hls_playlist_type vod',
        '-hls_segment_filename',
        path.join(outputDir, 'segment_%03d.ts'),
      ])
      .output(playlistPath)
      .on('progress', (progress) => {
        if (progress.percent) {
          process.stdout.write(`\r   Progress: ${Math.floor(progress.percent)}%   `);
        }
      })
      .on('end', () => {
        console.log(`\n   ✅ ${quality.name} completed`);
        resolve();
      })
      .on('error', (err) => {
        console.error(`\n   ❌ ${quality.name} failed:`, err.message);
        reject(err);
      })
      .run();
  });
}

// Fix Video 2: Just update database (HLS files already exist in R2)
async function fixVideo2() {
  console.log('\n' + '='.repeat(60));
  console.log('Fixing Video 2: ბუღალტერია (Database update only)');
  console.log('='.repeat(60));

  const videoId = 'cmjtqdw3t0007ov05b44vgfmm';
  const courseId = 'cmjqsqe9d004s6bsikcgqpnp3';
  const chapterId = 'cmjrd1kmo00071jpgmgtq159l';

  const baseUrl = `${R2_PUBLIC_URL}/courses/${courseId}/chapters/${chapterId}/videos/${videoId}`;

  const masterUrl = `${baseUrl}/master/master.m3u8`;
  const hls480pUrl = `${baseUrl}/480p/playlist.m3u8`;
  const hls720pUrl = `${baseUrl}/720p/playlist.m3u8`;
  const hls1080pUrl = `${baseUrl}/1080p/playlist.m3u8`;

  console.log(`   📝 Updating database with HLS URLs...`);
  console.log(`   Master: ${masterUrl}`);
  console.log(`   480p: ${hls480pUrl}`);
  console.log(`   720p: ${hls720pUrl}`);
  console.log(`   1080p: ${hls1080pUrl}`);

  try {
    await prisma.video.update({
      where: { id: videoId },
      data: {
        hlsMasterUrl: masterUrl,
        hls480pUrl: hls480pUrl,
        hls720pUrl: hls720pUrl,
        hls1080pUrl: hls1080pUrl,
        processingStatus: 'COMPLETED',
        processedAt: new Date(),
      },
    });
    console.log(`   ✅ Database updated for video 2`);
  } catch (error) {
    console.error(`   ❌ Failed to update database:`, error);
    throw error;
  }
}

// Fix Video 3: Full reprocessing
async function fixVideo3() {
  console.log('\n' + '='.repeat(60));
  console.log('Fixing Video 3: მოზარდთა ფსიქოლოგია (Full reprocessing)');
  console.log('='.repeat(60));

  const videoId = 'cmjtwpoz4000eov05d60a7gv0';

  // Get video from database
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
    console.log(`   ❌ Video not found: ${videoId}`);
    return;
  }

  const r2Key = video.r2Key;
  const chapterId = video.chapter?.id || '';
  const courseId = video.chapter?.courseVersion?.course?.id || '';

  if (!r2Key || !courseId) {
    console.log(`   ❌ Missing r2Key or courseId`);
    return;
  }

  console.log(`   Video ID: ${videoId}`);
  console.log(`   Original: ${video.width}x${video.height}`);
  console.log(`   R2 Key: ${r2Key}`);

  const tempDir = path.join(process.cwd(), 'temp', videoId);
  await fs.mkdir(tempDir, { recursive: true });

  try {
    // 1. Download original video from R2
    const localVideoPath = path.join(tempDir, 'original.mp4');
    await downloadFromR2(r2Key, localVideoPath);

    // 2. Get metadata
    const metadata = await getVideoMetadata(localVideoPath);
    const isPortrait = metadata.height > metadata.width;
    console.log(`   📐 Video: ${metadata.width}x${metadata.height} (${isPortrait ? 'Portrait' : 'Landscape'})`);

    // 3. Delete old HLS files from R2
    await deleteOldHLSFiles(videoId, courseId, chapterId);

    // 4. Generate HLS for each quality
    const variants: { quality: string; url: string }[] = [];

    for (const quality of HLS_QUALITIES) {
      if (metadata.height < quality.height) continue;

      const qualityDir = path.join(tempDir, quality.name);
      await fs.mkdir(qualityDir, { recursive: true });

      await generateHLSForQuality(
        localVideoPath,
        qualityDir,
        quality,
        isPortrait,
        metadata.height
      );

      // 5. Upload HLS files to R2
      console.log(`   📤 Uploading ${quality.name} to R2...`);

      const files = await fs.readdir(qualityDir);
      for (const file of files) {
        const filePath = path.join(qualityDir, file);
        const r2Path = `courses/${courseId}/chapters/${chapterId}/videos/${videoId}/${quality.name}/${file}`;
        const contentType = file.endsWith('.m3u8')
          ? 'application/vnd.apple.mpegurl'
          : 'video/MP2T';

        await uploadToR2(filePath, r2Path, contentType);
      }

      const playlistUrl = `${R2_PUBLIC_URL}/courses/${courseId}/chapters/${chapterId}/videos/${videoId}/${quality.name}/playlist.m3u8`;
      variants.push({ quality: quality.name, url: playlistUrl });
      console.log(`   ✅ Uploaded ${quality.name}`);
    }

    // 6. Generate and upload master playlist
    let masterPlaylist = '#EXTM3U\n#EXT-X-VERSION:3\n\n';
    for (const variant of variants) {
      const quality = HLS_QUALITIES.find(q => q.name === variant.quality);
      if (quality) {
        const bandwidth = parseInt(quality.videoBitrate) * 1000;
        const width = Math.round(quality.height * (metadata.width / metadata.height));
        masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${width}x${quality.height}\n`;
        masterPlaylist += `../${variant.quality}/playlist.m3u8\n\n`;
      }
    }

    const masterPath = path.join(tempDir, 'master.m3u8');
    await fs.writeFile(masterPath, masterPlaylist);
    const masterR2Path = `courses/${courseId}/chapters/${chapterId}/videos/${videoId}/master/master.m3u8`;
    await uploadToR2(masterPath, masterR2Path, 'application/vnd.apple.mpegurl');
    const masterUrl = `${R2_PUBLIC_URL}/${masterR2Path}`;

    // 7. Update database
    const variant480 = variants.find(v => v.quality === '480p');
    const variant720 = variants.find(v => v.quality === '720p');
    const variant1080 = variants.find(v => v.quality === '1080p');

    await prisma.video.update({
      where: { id: videoId },
      data: {
        hlsMasterUrl: masterUrl,
        hls480pUrl: variant480?.url || null,
        hls720pUrl: variant720?.url || null,
        hls1080pUrl: variant1080?.url || null,
        processingStatus: 'COMPLETED',
        processedAt: new Date(),
      },
    });

    console.log(`   ✅ Database updated`);
    console.log(`\n✅ Successfully reprocessed video 3`);

  } finally {
    // Cleanup temp files
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function main() {
  console.log('🔄 Fixing remaining stretched videos...\n');

  // Check R2 configuration
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) {
    console.error('❌ Missing R2 configuration. Please set:');
    console.error('   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL');
    process.exit(1);
  }

  try {
    // Fix Video 2 (just DB update)
    await fixVideo2();
  } catch (error) {
    console.error('Failed to fix video 2:', error);
  }

  try {
    // Fix Video 3 (full reprocessing)
    await fixVideo3();
  } catch (error) {
    console.error('Failed to fix video 3:', error);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Fix script complete!');
  console.log('='.repeat(60));

  await prisma.$disconnect();
}

main().catch(console.error);

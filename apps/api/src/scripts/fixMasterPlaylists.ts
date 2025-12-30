/**
 * Fix Master Playlists Script
 *
 * Updates master playlists with correct relative paths.
 * Run with: npx tsx src/scripts/fixMasterPlaylists.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Load .env from api directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { prisma } from '../config/database';

// R2 configuration
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

interface QualityConfig {
  width: number;
  height: number;
  bandwidth: number;
}

const QUALITIES: Record<string, QualityConfig> = {
  '480p': { width: 854, height: 480, bandwidth: 1000000 },
  '720p': { width: 1280, height: 720, bandwidth: 2500000 },
  '1080p': { width: 1920, height: 1080, bandwidth: 5000000 },
};

function generateMasterPlaylist(variants: string[]): string {
  let playlist = '#EXTM3U\n#EXT-X-VERSION:3\n\n';

  for (const quality of variants) {
    const q = QUALITIES[quality];
    if (q) {
      playlist += `#EXT-X-STREAM-INF:BANDWIDTH=${q.bandwidth},RESOLUTION=${q.width}x${q.height}\n`;
      playlist += `../${quality}/playlist.m3u8\n\n`;
    }
  }
  return playlist;
}

async function fixMasterPlaylists() {
  console.log('🔧 Fixing master playlists with correct relative paths...\n');

  // Find all completed videos with HLS URLs
  const videos = await prisma.video.findMany({
    where: {
      processingStatus: 'COMPLETED',
      hlsMasterUrl: { not: null },
    },
    select: {
      id: true,
      hlsMasterUrl: true,
      hls480pUrl: true,
      hls720pUrl: true,
      hls1080pUrl: true,
    },
  });

  console.log(`📹 Found ${videos.length} videos to fix\n`);

  let fixedCount = 0;
  let errorCount = 0;

  for (const video of videos) {
    try {
      // Determine available qualities
      const variants: string[] = [];
      if (video.hls480pUrl) variants.push('480p');
      if (video.hls720pUrl) variants.push('720p');
      if (video.hls1080pUrl) variants.push('1080p');

      if (variants.length === 0) {
        console.log(`⏭️ Skipping ${video.id} - no quality URLs`);
        continue;
      }

      // Generate correct master playlist
      const masterContent = generateMasterPlaylist(variants);

      // Extract R2 key from URL
      // URL format: https://pub-xxx.r2.dev/courses/...
      const url = new URL(video.hlsMasterUrl!);
      const masterKey = url.pathname.slice(1); // Remove leading slash

      console.log(`🔄 Fixing ${video.id}...`);
      console.log(`   Qualities: ${variants.join(', ')}`);
      console.log(`   Key: ${masterKey}`);
      console.log(`   Content:\n${masterContent}`);
      console.log(`   Bucket: ${process.env.R2_BUCKET_NAME}`);

      // Upload to R2
      const result = await r2Client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: masterKey,
        Body: masterContent,
        ContentType: 'application/vnd.apple.mpegurl',
      }));

      console.log(`   Upload result:`, JSON.stringify(result.$metadata));
      console.log(`   ✅ Fixed!\n`);
      fixedCount++;
    } catch (error) {
      console.error(`   ❌ Error fixing ${video.id}:`, error);
      errorCount++;
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Summary:`);
  console.log(`   Fixed: ${fixedCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await prisma.$disconnect();
  process.exit(0);
}

// Run the script
fixMasterPlaylists().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});

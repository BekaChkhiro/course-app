/**
 * Reprocess Existing Videos Script
 *
 * This script finds all videos that haven't been converted to HLS
 * and adds them to the processing queue.
 *
 * Run with: npx tsx src/scripts/reprocessVideos.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env from api directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { prisma } from '../config/database';
import queueService from '../services/queue.service';

async function reprocessVideos() {
  console.log('🔍 Finding videos to reprocess...\n');

  // Find videos that need processing:
  // - hlsMasterUrl doesn't end with .m3u8 (not HLS)
  // - OR processingStatus is not COMPLETED
  // - OR hlsMasterUrl is null
  const videos = await prisma.video.findMany({
    where: {
      OR: [
        { hlsMasterUrl: null },
        { processingStatus: { not: 'COMPLETED' } },
        {
          AND: [
            { hlsMasterUrl: { not: null } },
            { NOT: { hlsMasterUrl: { endsWith: '.m3u8' } } }
          ]
        }
      ]
    },
    include: {
      chapter: {
        include: {
          courseVersion: {
            include: {
              course: true
            }
          }
        }
      }
    }
  });

  console.log(`📹 Found ${videos.length} videos to reprocess\n`);

  if (videos.length === 0) {
    console.log('✅ All videos are already processed!');
    await prisma.$disconnect();
    process.exit(0);
  }

  // Check if queue service is available
  if (!queueService.isAvailable()) {
    console.error('❌ Redis/Queue service not available. Make sure Redis is running.');
    console.log('   Run: brew services start redis');
    await prisma.$disconnect();
    process.exit(1);
  }

  // Add each video to the processing queue
  let addedCount = 0;
  let skippedCount = 0;

  for (const video of videos) {
    const courseId = video.chapter?.courseVersion?.course?.id;
    const chapterId = video.chapterId;

    if (!courseId || !chapterId || !video.r2Key) {
      console.log(`⏭️ Skipping video ${video.id} - missing courseId, chapterId, or r2Key`);
      skippedCount++;
      continue;
    }

    try {
      // Reset video status
      await prisma.video.update({
        where: { id: video.id },
        data: {
          processingStatus: 'PENDING',
          processingProgress: 0,
          processingError: null,
        }
      });

      // Get the original file URL from R2
      const originalFilePath = video.hlsMasterUrl || `https://${process.env.R2_PUBLIC_DOMAIN}/${video.r2Key}`;

      // Add to queue
      const job = await queueService.addVideoProcessingJob({
        videoId: video.id,
        chapterId,
        courseId,
        originalFilePath,
        r2Key: video.r2Key,
        userId: 'system-reprocess',
      });

      console.log(`✅ Added video to queue: ${video.id}`);
      console.log(`   Original: ${video.originalName}`);
      console.log(`   Size: ${(video.originalSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Job ID: ${job?.id}\n`);
      addedCount++;
    } catch (error) {
      console.error(`❌ Failed to add video ${video.id} to queue:`, error);
      skippedCount++;
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Summary:`);
  console.log(`   Added to queue: ${addedCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (addedCount > 0) {
    console.log('🎬 Videos have been added to the processing queue.');
    console.log('   Make sure the worker is running: npm run worker:video');
  }

  await prisma.$disconnect();
  process.exit(0);
}

// Run the script
reprocessVideos().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});

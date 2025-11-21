/**
 * Video System Health Check Script
 * Run: npx ts-node src/scripts/test-video-system.ts
 */

import { prisma } from '../config/database';
import r2Service from '../services/r2.service';
import queueService from '../services/queue.service';
import Redis from 'ioredis';

async function testVideoSystem() {
  console.log('🔍 Testing Video Streaming System...\n');

  let allPassed = true;

  // Test 1: Database Connection
  console.log('1️⃣  Testing Database Connection...');
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('   ✅ Database connected\n');
  } catch (error) {
    console.error('   ❌ Database connection failed:', error);
    allPassed = false;
  }

  // Test 2: Redis Connection
  console.log('2️⃣  Testing Redis Connection...');
  try {
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
    await redis.ping();
    console.log('   ✅ Redis connected');
    await redis.quit();
    console.log('');
  } catch (error) {
    console.error('   ❌ Redis connection failed:', error);
    allPassed = false;
  }

  // Test 3: Bull Queue
  console.log('3️⃣  Testing Bull Queue...');
  try {
    const queue = queueService.getVideoProcessingQueue();
    const isReady = await queue.isReady();
    if (isReady) {
      const counts = await queue.getJobCounts();
      console.log('   ✅ Queue is ready');
      console.log(`   📊 Jobs: ${counts.waiting} waiting, ${counts.active} active, ${counts.completed} completed, ${counts.failed} failed\n`);
    } else {
      throw new Error('Queue not ready');
    }
  } catch (error) {
    console.error('   ❌ Bull queue failed:', error);
    allPassed = false;
  }

  // Test 4: R2 Configuration
  console.log('4️⃣  Testing R2 Configuration...');
  try {
    const requiredVars = [
      'R2_ACCOUNT_ID',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'R2_BUCKET_NAME',
    ];

    const missing = requiredVars.filter((v) => !process.env[v]);

    if (missing.length > 0) {
      console.error(`   ❌ Missing R2 environment variables: ${missing.join(', ')}`);
      console.log('   ℹ️  Update apps/api/.env with R2 credentials\n');
      allPassed = false;
    } else {
      console.log('   ✅ R2 credentials configured');
      console.log(`   📦 Bucket: ${process.env.R2_BUCKET_NAME}\n`);
    }
  } catch (error) {
    console.error('   ❌ R2 configuration check failed:', error);
    allPassed = false;
  }

  // Test 5: Database Schema
  console.log('5️⃣  Testing Database Schema...');
  try {
    const tables = ['videos', 'video_thumbnails', 'video_processing_jobs', 'video_access_tokens', 'video_analytics'];

    for (const table of tables) {
      const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`   ✅ Table '${table}' exists`);
    }
    console.log('');
  } catch (error) {
    console.error('   ❌ Schema check failed:', error);
    console.log('   ℹ️  Run: npm run db:push\n');
    allPassed = false;
  }

  // Test 6: Check existing videos
  console.log('6️⃣  Checking Existing Videos...');
  try {
    const videos = await prisma.video.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        chapter: {
          select: {
            title: true,
          },
        },
      },
    });

    if (videos.length === 0) {
      console.log('   ℹ️  No videos uploaded yet\n');
    } else {
      console.log(`   📹 Found ${videos.length} recent videos:`);
      videos.forEach((v) => {
        console.log(`      - ${v.originalName} (${v.processingStatus})`);
      });
      console.log('');
    }
  } catch (error) {
    console.error('   ❌ Video check failed:', error);
    allPassed = false;
  }

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (allPassed) {
    console.log('✅ All systems operational!');
    console.log('🚀 Ready to upload and stream videos');
    console.log('\nNext steps:');
    console.log('1. Set up R2 if not done: cat CLOUDFLARE_R2_SETUP.md');
    console.log('2. Start services: npm run dev:api && npm run dev:web');
    console.log('3. Upload test video through admin interface');
    console.log('4. Follow testing guide: cat TESTING_GUIDE.md');
  } else {
    console.log('❌ Some checks failed');
    console.log('📖 Review error messages above and fix issues');
    console.log('📚 See documentation:');
    console.log('   - CLOUDFLARE_R2_SETUP.md');
    console.log('   - VIDEO_STREAMING_GUIDE.md');
    console.log('   - TESTING_GUIDE.md');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(allPassed ? 0 : 1);
}

// Run tests
testVideoSystem().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

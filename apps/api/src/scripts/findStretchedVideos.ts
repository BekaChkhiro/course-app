/**
 * Script to find videos that were stretched during HLS processing
 * Portrait videos (height > width) that got converted to landscape HLS
 *
 * Run with: npx tsx apps/api/src/scripts/findStretchedVideos.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findStretchedVideos() {
  console.log('🔍 Searching for stretched videos...\n');

  // Find all videos with HLS URLs
  const videos = await prisma.video.findMany({
    where: {
      OR: [
        { hls480pUrl: { not: null } },
        { hls720pUrl: { not: null } },
        { hls1080pUrl: { not: null } },
      ],
    },
    include: {
      chapter: {
        select: {
          id: true,
          title: true,
          courseVersion: {
            select: {
              course: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      },
    },
  });

  console.log(`📊 Total videos with HLS: ${videos.length}\n`);

  // Find videos that are portrait (height > width)
  const stretchedVideos = videos.filter(video => {
    if (video.width && video.height) {
      // Original video is portrait if height > width
      return video.height > video.width;
    }
    return false;
  });

  // Also find videos that might be portrait but don't have metadata
  const unknownVideos = videos.filter(video => !video.width || !video.height);

  console.log('=' .repeat(60));
  console.log('🔴 STRETCHED VIDEOS (Portrait originals processed as landscape):');
  console.log('=' .repeat(60));

  if (stretchedVideos.length === 0) {
    console.log('✅ No stretched portrait videos found!\n');
  } else {
    stretchedVideos.forEach((video, index) => {
      const courseName = video.chapter?.courseVersion?.course?.title || 'Unknown Course';
      const chapterName = video.chapter?.title || 'Unknown Chapter';

      console.log(`\n${index + 1}. Video ID: ${video.id}`);
      console.log(`   📚 Course: ${courseName}`);
      console.log(`   📖 Chapter: ${chapterName}`);
      console.log(`   📐 Original dimensions: ${video.width}x${video.height} (Portrait)`);
      console.log(`   🔗 HLS 480p: ${video.hls480pUrl ? 'Yes' : 'No'}`);
      console.log(`   🔗 HLS 720p: ${video.hls720pUrl ? 'Yes' : 'No'}`);
      console.log(`   🔗 HLS 1080p: ${video.hls1080pUrl ? 'Yes' : 'No'}`);
    });
  }

  if (unknownVideos.length > 0) {
    console.log('\n' + '=' .repeat(60));
    console.log('⚠️  VIDEOS WITHOUT METADATA (may or may not be stretched):');
    console.log('=' .repeat(60));

    unknownVideos.forEach((video, index) => {
      const courseName = video.chapter?.courseVersion?.course?.title || 'Unknown Course';
      const chapterName = video.chapter?.title || 'Unknown Chapter';

      console.log(`\n${index + 1}. Video ID: ${video.id}`);
      console.log(`   📚 Course: ${courseName}`);
      console.log(`   📖 Chapter: ${chapterName}`);
      console.log(`   📐 Dimensions: Not recorded`);
    });
  }

  // Check demo videos too
  const coursesWithDemoVideo = await prisma.course.findMany({
    where: {
      demoVideoId: { not: null },
    },
    include: {
      demoVideo: true,
    },
  });

  const stretchedDemoVideos = coursesWithDemoVideo.filter(course => {
    if (course.demoVideo?.width && course.demoVideo?.height) {
      return course.demoVideo.height > course.demoVideo.width;
    }
    return false;
  });

  const unknownDemoVideos = coursesWithDemoVideo.filter(course => {
    return course.demoVideo && (!course.demoVideo.width || !course.demoVideo.height);
  });

  console.log('\n' + '=' .repeat(60));
  console.log('🎬 DEMO VIDEOS:');
  console.log('=' .repeat(60));

  if (stretchedDemoVideos.length > 0) {
    console.log('\n🔴 Stretched demo videos (Portrait):');
    stretchedDemoVideos.forEach((course, index) => {
      console.log(`\n${index + 1}. Course: ${course.title}`);
      console.log(`   Video ID: ${course.demoVideo?.id}`);
      console.log(`   📐 Original: ${course.demoVideo?.width}x${course.demoVideo?.height}`);
    });
  } else {
    console.log('\n✅ No stretched demo videos found!');
  }

  if (unknownDemoVideos.length > 0) {
    console.log('\n⚠️  Demo videos without metadata:');
    unknownDemoVideos.forEach((course, index) => {
      console.log(`\n${index + 1}. Course: ${course.title}`);
      console.log(`   Video ID: ${course.demoVideo?.id}`);
    });
  }

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 SUMMARY:');
  console.log('=' .repeat(60));
  console.log(`Total HLS videos: ${videos.length}`);
  console.log(`Stretched portrait videos: ${stretchedVideos.length}`);
  console.log(`Videos without metadata: ${unknownVideos.length}`);
  console.log(`Stretched demo videos: ${stretchedDemoVideos.length}`);
  console.log(`Demo videos without metadata: ${unknownDemoVideos.length}`);
  console.log('\n');

  await prisma.$disconnect();
}

findStretchedVideos().catch(console.error);

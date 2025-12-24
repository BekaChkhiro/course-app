/**
 * Script to auto-link chapters across course versions by title matching
 *
 * This helps transfer student progress when upgrading to new versions.
 * Chapters with matching titles across versions will be linked.
 *
 * Run with: npx ts-node packages/database/prisma/scripts/auto-link-chapters.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\u10D0-\u10FF]/g, ''); // Keep Georgian letters
}

async function autoLinkChapters() {
  console.log('Starting chapter auto-linking...');

  try {
    // Get all courses with multiple versions
    const coursesWithVersions = await prisma.course.findMany({
      include: {
        versions: {
          orderBy: { version: 'asc' },
          include: {
            chapters: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    let totalLinked = 0;
    let totalCourses = 0;

    for (const course of coursesWithVersions) {
      if (course.versions.length < 2) continue;

      totalCourses++;
      console.log(`\nProcessing course: ${course.title}`);

      // For each version (except the first), link to previous version
      for (let i = 1; i < course.versions.length; i++) {
        const currentVersion = course.versions[i];
        const previousVersion = course.versions[i - 1];

        console.log(`  Linking v${currentVersion.version} to v${previousVersion.version}`);

        // Create a map of normalized titles to chapter IDs for previous version
        const previousChapterMap = new Map<string, string>();
        for (const chapter of previousVersion.chapters) {
          const normalized = normalizeTitle(chapter.title);
          previousChapterMap.set(normalized, chapter.id);
        }

        let linkedInVersion = 0;

        // Link current version chapters to previous version
        for (const chapter of currentVersion.chapters) {
          // Skip if already linked
          if (chapter.originalChapterId) continue;

          const normalized = normalizeTitle(chapter.title);
          const matchingPreviousId = previousChapterMap.get(normalized);

          if (matchingPreviousId) {
            await prisma.chapter.update({
              where: { id: chapter.id },
              data: { originalChapterId: matchingPreviousId },
            });
            linkedInVersion++;
            console.log(`    Linked: "${chapter.title}"`);
          }
        }

        totalLinked += linkedInVersion;
        console.log(`  Linked ${linkedInVersion} chapters in v${currentVersion.version}`);
      }
    }

    console.log(`\nAuto-linking completed:`);
    console.log(`  - Processed ${totalCourses} courses with multiple versions`);
    console.log(`  - Linked ${totalLinked} chapters total`);

  } catch (error) {
    console.error('Auto-linking failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

autoLinkChapters()
  .then(() => {
    console.log('\nScript finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

/**
 * Migration script to populate UserVersionAccess from existing purchases
 *
 * This script should be run once after the schema migration to ensure
 * that all existing course purchases have corresponding UserVersionAccess records.
 *
 * Run with: npx ts-node packages/database/prisma/scripts/migrate-version-access.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateVersionAccess() {
  console.log('Starting UserVersionAccess migration...');

  try {
    // Get all completed purchases that have a course version
    const completedPurchases = await prisma.purchase.findMany({
      where: {
        status: 'COMPLETED',
        courseVersionId: { not: null },
      },
      select: {
        id: true,
        userId: true,
        courseVersionId: true,
        createdAt: true,
      },
    });

    console.log(`Found ${completedPurchases.length} completed purchases with course versions`);

    let created = 0;
    let skipped = 0;

    for (const purchase of completedPurchases) {
      if (!purchase.courseVersionId) continue;

      // Check if access record already exists
      const existingAccess = await prisma.userVersionAccess.findUnique({
        where: {
          userId_courseVersionId: {
            userId: purchase.userId,
            courseVersionId: purchase.courseVersionId,
          },
        },
      });

      if (existingAccess) {
        skipped++;
        continue;
      }

      // Create access record
      await prisma.userVersionAccess.create({
        data: {
          userId: purchase.userId,
          courseVersionId: purchase.courseVersionId,
          purchaseId: purchase.id,
          grantedAt: purchase.createdAt,
          isActive: true,
        },
      });

      created++;
    }

    console.log(`Migration completed:`);
    console.log(`  - Created: ${created} new access records`);
    console.log(`  - Skipped: ${skipped} (already existed)`);

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateVersionAccess()
  .then(() => {
    console.log('Migration finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

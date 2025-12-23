/**
 * Cleanup Excess Devices Script
 *
 * ეს სკრიპტი პოულობს ყველა მომხმარებელს 3-ზე მეტი აქტიური მოწყობილობით
 * და წაშლის ზედმეტებს, დატოვებს მხოლოდ 3 ყველაზე ახალს.
 *
 * გაშვება: npx ts-node src/scripts/cleanupExcessDevices.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const MAX_DEVICES = 3;

async function cleanupExcessDevices() {
  console.log('🔍 ვეძებთ მომხმარებლებს ზედმეტი მოწყობილობებით...\n');

  try {
    // Find all users with more than MAX_DEVICES active sessions
    const usersWithExcessDevices = await prisma.user.findMany({
      where: {
        deviceSessions: {
          some: {
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        surname: true,
        deviceSessions: {
          where: {
            isActive: true,
          },
          orderBy: {
            lastActiveAt: 'desc',
          },
          select: {
            id: true,
            deviceName: true,
            lastActiveAt: true,
          },
        },
      },
    });

    // Filter users with more than MAX_DEVICES
    const usersToClean = usersWithExcessDevices.filter(
      (user) => user.deviceSessions.length > MAX_DEVICES
    );

    if (usersToClean.length === 0) {
      console.log('✅ ყველა მომხმარებელს აქვს 3 ან ნაკლები მოწყობილობა. გასუფთავება არ არის საჭირო.\n');
      return;
    }

    console.log(`📊 ნაპოვნია ${usersToClean.length} მომხმარებელი ზედმეტი მოწყობილობებით:\n`);

    let totalDeleted = 0;

    for (const user of usersToClean) {
      const excessCount = user.deviceSessions.length - MAX_DEVICES;
      const sessionsToDelete = user.deviceSessions.slice(MAX_DEVICES); // Keep first 3 (most recent)

      console.log(`👤 ${user.name} ${user.surname} (${user.email})`);
      console.log(`   მოწყობილობები: ${user.deviceSessions.length} → ${MAX_DEVICES}`);
      console.log(`   წასაშლელი: ${excessCount}`);

      // Delete excess sessions
      const deleteResult = await prisma.deviceSession.deleteMany({
        where: {
          id: {
            in: sessionsToDelete.map((s) => s.id),
          },
        },
      });

      console.log(`   ✓ წაშლილია: ${deleteResult.count} მოწყობილობა\n`);
      totalDeleted += deleteResult.count;
    }

    console.log('═'.repeat(50));
    console.log(`\n🎉 დასრულებულია!`);
    console.log(`   გასუფთავებული მომხმარებლები: ${usersToClean.length}`);
    console.log(`   წაშლილი მოწყობილობები: ${totalDeleted}\n`);

  } catch (error) {
    console.error('❌ შეცდომა:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
cleanupExcessDevices()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

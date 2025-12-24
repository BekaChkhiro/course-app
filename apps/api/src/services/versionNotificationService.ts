import { prisma } from '../config/database';
import { EmailService } from './emailService';
import { NotificationType } from '@prisma/client';

interface NotifyResult {
  success: boolean;
  notifiedCount: number;
  emailsSent: number;
  errors: string[];
}

export class VersionNotificationService {
  /**
   * Notify existing students when a new course version is published
   * Creates in-app notifications and sends emails
   */
  static async notifyExistingStudents(
    courseId: string,
    newVersionId: string
  ): Promise<NotifyResult> {
    const result: NotifyResult = {
      success: true,
      notifiedCount: 0,
      emailsSent: 0,
      errors: [],
    };

    try {
      // Get the new version details
      const newVersion = await prisma.courseVersion.findUnique({
        where: { id: newVersionId },
        include: {
          course: true,
        },
      });

      if (!newVersion) {
        return { ...result, success: false, errors: ['Version not found'] };
      }

      // Get all users who have access to any previous version of this course
      // but NOT to the new version
      const usersWithAccess = await prisma.userVersionAccess.findMany({
        where: {
          courseVersion: {
            courseId,
            id: { not: newVersionId },
          },
          isActive: true,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              surname: true,
              preferences: true,
            },
          },
          courseVersion: {
            select: {
              version: true,
            },
          },
        },
        distinct: ['userId'],
      });

      // Filter out users who already have access to the new version
      const usersWithNewVersionAccess = await prisma.userVersionAccess.findMany({
        where: {
          courseVersionId: newVersionId,
          isActive: true,
        },
        select: { userId: true },
      });
      const usersWithNewVersionSet = new Set(usersWithNewVersionAccess.map((u) => u.userId));

      const eligibleUsers = usersWithAccess.filter(
        (access) => !usersWithNewVersionSet.has(access.userId)
      );

      // Calculate upgrade price
      const upgradePrice = this.calculateUpgradePrice(newVersion);
      const discountEndDate = newVersion.upgradeDiscountEndDate;

      // Create changelog summary from version description
      const changelogSummary = newVersion.description
        ? this.extractPlainText(newVersion.description).substring(0, 300)
        : 'ახალი მასალები და გაუმჯობესებები დაემატა.';

      // Process each eligible user
      for (const access of eligibleUsers) {
        const user = access.user;
        const userVersion = access.courseVersion.version;

        try {
          // Create in-app notification
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: NotificationType.VERSION_UPGRADE_AVAILABLE,
              title: `ახალი ვერსია: ${newVersion.course.title}`,
              message: `კურსის "${newVersion.course.title}" ახალი ვერსია (v${newVersion.version}) ხელმისაწვდომია განახლებისთვის.`,
              data: {
                courseId,
                courseSlug: newVersion.course.slug,
                newVersionId,
                newVersionNumber: newVersion.version,
                oldVersionNumber: userVersion,
                upgradePrice,
                discountEndDate: discountEndDate?.toISOString() || null,
              },
            },
          });

          result.notifiedCount++;

          // Send email notification (respecting user preferences)
          const shouldSendEmail = await this.shouldSendVersionEmail(user.id);
          if (shouldSendEmail) {
            try {
              await EmailService.sendVersionUpgradeAvailableEmail(
                user.email,
                `${user.name} ${user.surname}`,
                newVersion.course.title,
                newVersion.course.slug,
                userVersion,
                newVersion.version,
                upgradePrice,
                discountEndDate,
                changelogSummary,
                user.id
              );
              result.emailsSent++;
            } catch (emailError: any) {
              result.errors.push(`Email failed for ${user.email}: ${emailError.message}`);
            }
          }
        } catch (userError: any) {
          result.errors.push(`Failed to notify user ${user.id}: ${userError.message}`);
        }
      }

      return result;
    } catch (error: any) {
      console.error('Error notifying existing students:', error);
      return {
        ...result,
        success: false,
        errors: [error.message],
      };
    }
  }

  /**
   * Send discount expiration reminders (to be called by cron job)
   * Finds versions with discounts ending within specified hours
   */
  static async sendDiscountExpirationReminders(hoursBeforeExpiry: number = 24): Promise<NotifyResult> {
    const result: NotifyResult = {
      success: true,
      notifiedCount: 0,
      emailsSent: 0,
      errors: [],
    };

    try {
      const now = new Date();
      const futureTime = new Date(now.getTime() + hoursBeforeExpiry * 60 * 60 * 1000);

      // Find versions with discounts expiring in the specified timeframe
      const expiringVersions = await prisma.courseVersion.findMany({
        where: {
          isActive: true,
          upgradeDiscountEndDate: {
            gte: now,
            lte: futureTime,
          },
          upgradeDiscountValue: { not: null },
        },
        include: {
          course: true,
        },
      });

      for (const version of expiringVersions) {
        // Get users eligible for upgrade (have access to older versions)
        const eligibleUsers = await this.getEligibleUpgradeUsers(version.courseId, version.id);

        const discountPrice = this.calculateUpgradePrice(version);
        const regularPrice = this.calculateRegularUpgradePrice(version);
        const hoursRemaining = Math.ceil(
          (version.upgradeDiscountEndDate!.getTime() - now.getTime()) / (1000 * 60 * 60)
        );

        for (const userData of eligibleUsers) {
          try {
            // Check if we already sent a reminder for this version/user
            const existingReminder = await prisma.notification.findFirst({
              where: {
                userId: userData.userId,
                type: NotificationType.UPGRADE_DISCOUNT_ENDING,
                data: {
                  path: ['newVersionId'],
                  equals: version.id,
                },
                createdAt: {
                  gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Within last 24 hours
                },
              },
            });

            if (existingReminder) continue;

            // Create in-app notification
            await prisma.notification.create({
              data: {
                userId: userData.userId,
                type: NotificationType.UPGRADE_DISCOUNT_ENDING,
                title: `ფასდაკლება იწურება: ${version.course.title}`,
                message: `კურსის "${version.course.title}" განახლების ფასდაკლება იწურება ${hoursRemaining} საათში!`,
                data: {
                  courseId: version.courseId,
                  courseSlug: version.course.slug,
                  newVersionId: version.id,
                  newVersionNumber: version.version,
                  currentVersionNumber: userData.currentVersion,
                  discountPrice,
                  regularPrice,
                  hoursRemaining,
                },
              },
            });

            result.notifiedCount++;

            // Send email
            const shouldSendEmail = await this.shouldSendVersionEmail(userData.userId);
            if (shouldSendEmail) {
              try {
                await EmailService.sendUpgradeDiscountEndingEmail(
                  userData.email,
                  userData.name,
                  version.course.title,
                  version.course.slug,
                  userData.currentVersion,
                  version.version,
                  discountPrice,
                  regularPrice,
                  hoursRemaining,
                  userData.userId
                );
                result.emailsSent++;
              } catch (emailError: any) {
                result.errors.push(`Email failed for ${userData.email}: ${emailError.message}`);
              }
            }
          } catch (userError: any) {
            result.errors.push(`Failed to notify user ${userData.userId}: ${userError.message}`);
          }
        }
      }

      return result;
    } catch (error: any) {
      console.error('Error sending discount expiration reminders:', error);
      return {
        ...result,
        success: false,
        errors: [error.message],
      };
    }
  }

  /**
   * Get users eligible for upgrade (have older version but not new version)
   */
  private static async getEligibleUpgradeUsers(
    courseId: string,
    newVersionId: string
  ): Promise<{ userId: string; email: string; name: string; currentVersion: number }[]> {
    // Get all users with access to older versions
    const usersWithOlderVersions = await prisma.userVersionAccess.findMany({
      where: {
        courseVersion: {
          courseId,
          id: { not: newVersionId },
        },
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            surname: true,
          },
        },
        courseVersion: {
          select: {
            version: true,
          },
        },
      },
      orderBy: {
        courseVersion: {
          version: 'desc',
        },
      },
      distinct: ['userId'],
    });

    // Get users who already have new version
    const usersWithNewVersion = await prisma.userVersionAccess.findMany({
      where: {
        courseVersionId: newVersionId,
        isActive: true,
      },
      select: { userId: true },
    });
    const usersWithNewVersionSet = new Set(usersWithNewVersion.map((u) => u.userId));

    // Filter and map
    return usersWithOlderVersions
      .filter((access) => !usersWithNewVersionSet.has(access.userId))
      .map((access) => ({
        userId: access.user.id,
        email: access.user.email,
        name: `${access.user.name} ${access.user.surname}`,
        currentVersion: access.courseVersion.version,
      }));
  }

  /**
   * Calculate upgrade price considering discount period
   */
  private static calculateUpgradePrice(version: {
    upgradePriceType: string | null;
    upgradePriceValue: any;
    upgradeDiscountType: string | null;
    upgradeDiscountValue: any;
    upgradeDiscountStartDate: Date | null;
    upgradeDiscountEndDate: Date | null;
    course: { price: any };
  }): number {
    const now = new Date();
    const coursePrice = Number(version.course.price) || 0;

    // Check if discount is active
    if (
      version.upgradeDiscountEndDate &&
      version.upgradeDiscountStartDate &&
      now >= version.upgradeDiscountStartDate &&
      now <= version.upgradeDiscountEndDate &&
      version.upgradeDiscountValue
    ) {
      if (version.upgradeDiscountType === 'FIXED') {
        return Number(version.upgradeDiscountValue);
      } else {
        return (coursePrice * Number(version.upgradeDiscountValue)) / 100;
      }
    }

    // Regular upgrade price
    if (version.upgradePriceType === 'FIXED') {
      return Number(version.upgradePriceValue) || 0;
    } else if (version.upgradePriceType === 'PERCENTAGE') {
      return (coursePrice * Number(version.upgradePriceValue || 0)) / 100;
    }

    return 0;
  }

  /**
   * Calculate regular (non-discounted) upgrade price
   */
  private static calculateRegularUpgradePrice(version: {
    upgradePriceType: string | null;
    upgradePriceValue: any;
    course: { price: any };
  }): number {
    const coursePrice = Number(version.course.price) || 0;

    if (version.upgradePriceType === 'FIXED') {
      return Number(version.upgradePriceValue) || 0;
    } else if (version.upgradePriceType === 'PERCENTAGE') {
      return (coursePrice * Number(version.upgradePriceValue || 0)) / 100;
    }

    return 0;
  }

  /**
   * Check if user should receive version-related emails
   */
  private static async shouldSendVersionEmail(userId: string): Promise<boolean> {
    try {
      const preferences = await prisma.userPreferences.findUnique({
        where: { userId },
      });

      // Default to sending if no preferences set
      if (!preferences) return true;

      // Use emailNotifications preference
      return preferences.emailNotifications;
    } catch (error) {
      return true;
    }
  }

  /**
   * Extract plain text from HTML
   */
  private static extractPlainText(html: string): string {
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      await prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
      return result.count;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return 0;
    }
  }

  /**
   * Get user notifications with pagination
   */
  static async getUserNotifications(
    userId: string,
    options: { page?: number; limit?: number; unreadOnly?: boolean } = {}
  ) {
    const { page = 1, limit = 20, unreadOnly = false } = options;

    const where: any = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      await prisma.notification.deleteMany({
        where: {
          id: notificationId,
          userId,
        },
      });
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }
}

export default VersionNotificationService;

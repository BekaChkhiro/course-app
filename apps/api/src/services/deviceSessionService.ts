import { db } from '../config/database';
import { DeviceSession } from '@prisma/client';
import { TokenService } from './tokenService';

const MAX_DEVICES_STUDENT = 3;
const MAX_DEVICES_ADMIN = 10;
const INACTIVE_DEVICE_DAYS = 30;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // once a day

let cleanupIntervalId: NodeJS.Timeout | null = null;

const getInactiveDate = () => {
  const inactiveDate = new Date();
  inactiveDate.setDate(inactiveDate.getDate() - INACTIVE_DEVICE_DAYS);
  return inactiveDate;
};

/**
 * Sessions that still occupy a device slot: active, not expired and used recently.
 * Expired sessions stay isActive=true until cleanup, so isActive alone is not enough.
 */
function liveSessionWhere(userId: string) {
  return {
    userId,
    isActive: true,
    expiresAt: { gt: new Date() },
    lastActiveAt: { gte: getInactiveDate() },
  };
}

/**
 * Sessions unused for 30+ days whose refresh token is still valid ("Remember Me").
 * They don't count towards the limit, but stay signed in until a new device needs the slot.
 */
function staleSessionWhere(userId: string) {
  return {
    userId,
    isActive: true,
    expiresAt: { gt: new Date() },
    lastActiveAt: { lt: getInactiveDate() },
  };
}

export interface CreateDeviceSessionData {
  userId: string;
  deviceName: string;
  deviceType: string;
  deviceFingerprint: string;
  browser?: string;
  ipAddress: string;
  userAgent: string;
  userRole?: string;
  rememberMe?: boolean;
}

// Custom error for device limit
export class DeviceLimitError extends Error {
  code: string;
  activeDevices: number;
  maxDevices: number;
  sessions: DeviceSession[];

  constructor(sessions: DeviceSession[], maxDevices: number) {
    super('მოწყობილობების ლიმიტი ამოიწურა');
    this.name = 'DeviceLimitError';
    this.code = 'DEVICE_LIMIT_REACHED';
    this.activeDevices = sessions.length;
    this.maxDevices = maxDevices;
    this.sessions = sessions;
  }
}

export class DeviceSessionService {
  /**
   * Create a new device session, or reuse the one this device already has.
   * Throws DeviceLimitError when the user already has the max number of live devices.
   */
  static async createSession(data: CreateDeviceSessionData): Promise<{
    session: DeviceSession;
    refreshToken: string;
  }> {
    // Check if device already exists for this user
    const existingSession = await db.deviceSession.findFirst({
      where: {
        userId: data.userId,
        deviceFingerprint: data.deviceFingerprint,
      },
    });

    const liveSessions = await db.deviceSession.findMany({
      where: liveSessionWhere(data.userId),
      orderBy: { lastActiveAt: 'desc' },
    });

    // Generate refresh token with rememberMe option for extended expiry
    const rememberMe = data.rememberMe || false;
    const refreshToken = TokenService.generateRefreshToken(data.userId, undefined, rememberMe);
    const expiresAt = TokenService.getRefreshTokenExpiry(rememberMe);

    const refreshedSessionData = {
      deviceFingerprint: data.deviceFingerprint,
      refreshToken,
      expiresAt,
      lastActiveAt: new Date(),
      isActive: true,
      ipAddress: data.ipAddress,
    };

    // This device is already signed in - reuse its slot. Same browser on the same OS
    // with a new device ID (cleared storage, Safari ITP, in-app browsers) counts as
    // the same device too.
    const reusableSession =
      liveSessions.find((s) => s.id === existingSession?.id) ||
      liveSessions.find((s) => s.userAgent === data.userAgent);

    if (reusableSession) {
      // Free the fingerprint if a dead session of this device still holds it
      if (existingSession && existingSession.id !== reusableSession.id) {
        await db.deviceSession.delete({ where: { id: existingSession.id } });
      }

      const session = await db.deviceSession.update({
        where: { id: reusableSession.id },
        data: refreshedSessionData,
      });

      return { session, refreshToken };
    }

    // Determine max devices based on user role
    const maxDevices = data.userRole === 'ADMIN' ? MAX_DEVICES_ADMIN : MAX_DEVICES_STUDENT;

    // If max devices reached, throw error instead of auto-deleting
    if (liveSessions.length >= maxDevices) {
      throw new DeviceLimitError(liveSessions, maxDevices);
    }

    // Sign out the oldest long-unused devices only if they would push the user over the limit
    const staleSessions = (
      await db.deviceSession.findMany({
        where: staleSessionWhere(data.userId),
        orderBy: { lastActiveAt: 'asc' },
      })
    ).filter((s) => s.id !== existingSession?.id);
    const excess = liveSessions.length + staleSessions.length + 1 - maxDevices;
    if (excess > 0) {
      await db.deviceSession.deleteMany({
        where: { id: { in: staleSessions.slice(0, excess).map((s) => s.id) } },
      });
    }

    // Signed out or expired session of this device - reactivate it
    if (existingSession) {
      const session = await db.deviceSession.update({
        where: { id: existingSession.id },
        data: refreshedSessionData,
      });

      return { session, refreshToken };
    }

    // Create new session - exclude userRole and rememberMe as they're not DB fields
    const { userRole: _, rememberMe: __, ...sessionData } = data;
    const session = await db.deviceSession.create({
      data: {
        ...sessionData,
        refreshToken,
        expiresAt,
        lastActiveAt: new Date(),
      },
    });

    return { session, refreshToken };
  }

  /**
   * Remove one of the user's sessions and log in on the current device instead.
   * Used when the device limit is reached and the user picks a device to sign out.
   */
  static async replaceSession(
    sessionIdToRemove: string,
    data: CreateDeviceSessionData
  ): Promise<{ session: DeviceSession; refreshToken: string }> {
    const { count } = await db.deviceSession.deleteMany({
      where: { id: sessionIdToRemove, userId: data.userId },
    });

    if (count === 0) {
      throw new Error('Device session not found');
    }

    return this.createSession(data);
  }

  /**
   * Get all live sessions for a user
   */
  static async getUserSessions(userId: string): Promise<DeviceSession[]> {
    return db.deviceSession.findMany({
      where: liveSessionWhere(userId),
      orderBy: {
        lastActiveAt: 'desc',
      },
    });
  }

  /**
   * Update device name
   */
  static async updateDeviceName(
    sessionId: string,
    userId: string,
    deviceName: string
  ): Promise<DeviceSession> {
    // Verify the session belongs to the user
    const session = await db.deviceSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      throw new Error('Device session not found');
    }

    return db.deviceSession.update({
      where: { id: sessionId },
      data: { deviceName },
    });
  }

  /**
   * Remove a device session
   */
  static async removeSession(sessionId: string, userId: string): Promise<void> {
    const session = await db.deviceSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      throw new Error('Device session not found');
    }

    await db.deviceSession.delete({
      where: { id: sessionId },
    });
  }

  /**
   * Update last active time for a session
   */
  static async updateLastActive(sessionId: string): Promise<void> {
    await db.deviceSession.update({
      where: { id: sessionId },
      data: {
        lastActiveAt: new Date(),
      },
    });
  }

  /**
   * Verify refresh token and get session
   */
  static async verifyRefreshToken(
    refreshToken: string
  ): Promise<DeviceSession | null> {
    try {
      // Verify the token signature
      TokenService.verifyRefreshToken(refreshToken);

      // Find active session with this token
      const session = await db.deviceSession.findFirst({
        where: {
          refreshToken,
          isActive: true,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      return session;
    } catch (error) {
      return null;
    }
  }

  /**
   * Rotate refresh token for a session (prevents replay attacks)
   */
  static async rotateRefreshToken(
    oldRefreshToken: string,
    userId: string
  ): Promise<{ session: DeviceSession; newRefreshToken: string } | null> {
    const session = await this.verifyRefreshToken(oldRefreshToken);

    if (!session || session.userId !== userId) {
      return null;
    }

    // Generate new refresh token
    const newRefreshToken = TokenService.generateRefreshToken(userId);
    const expiresAt = TokenService.getRefreshTokenExpiry();

    // Update session
    const updatedSession = await db.deviceSession.update({
      where: { id: session.id },
      data: {
        refreshToken: newRefreshToken,
        expiresAt,
        lastActiveAt: new Date(),
      },
    });

    return { session: updatedSession, newRefreshToken };
  }

  /**
   * Deactivate all sessions for a user (used after password change)
   */
  static async deactivateAllUserSessions(userId: string): Promise<void> {
    await db.deviceSession.updateMany({
      where: { userId },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Deactivate a specific session
   */
  static async deactivateSession(refreshToken: string): Promise<void> {
    await db.deviceSession.updateMany({
      where: { refreshToken },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Cleanup expired and signed-out sessions (run as a cron job).
   * Sessions with a still valid refresh token are kept, so nobody gets signed out.
   */
  static async cleanupInactiveSessions(): Promise<number> {
    const result = await db.deviceSession.deleteMany({
      where: {
        OR: [
          {
            // Delete expired sessions
            expiresAt: {
              lt: new Date(),
            },
          },
          {
            // Delete signed-out sessions
            isActive: false,
          },
        ],
      },
    });

    return result.count;
  }

  /**
   * Get session by ID
   */
  static async getSessionById(sessionId: string): Promise<DeviceSession | null> {
    return db.deviceSession.findUnique({
      where: { id: sessionId },
    });
  }
}

/**
 * Start the daily cleanup of expired and inactive device sessions
 */
export function startDeviceSessionCleanupJob(): void {
  if (cleanupIntervalId) {
    return;
  }

  const run = async () => {
    try {
      const count = await DeviceSessionService.cleanupInactiveSessions();
      console.log(`[DeviceSessionCleanup] Removed ${count} expired/inactive sessions`);
    } catch (error) {
      console.error('[DeviceSessionCleanup] Failed:', error);
    }
  };

  run();
  cleanupIntervalId = setInterval(run, CLEANUP_INTERVAL_MS);
}

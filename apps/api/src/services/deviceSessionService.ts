import { db } from '../config/database';
import { DeviceSession } from '@prisma/client';
import { TokenService } from './tokenService';

const MAX_DEVICES_STUDENT = 3;
const MAX_DEVICES_ADMIN = 10;
const INACTIVE_DEVICE_DAYS = 30;

export interface CreateDeviceSessionData {
  userId: string;
  deviceName: string;
  deviceType: string;
  deviceFingerprint: string;
  browser?: string;
  ipAddress: string;
  userAgent: string;
  userRole?: string;
}

// Custom error for device limit
export class DeviceLimitError extends Error {
  code: string;
  activeDevices: number;
  maxDevices: number;

  constructor(activeDevices: number, maxDevices: number) {
    super('მოწყობილობების ლიმიტი ამოიწურა');
    this.name = 'DeviceLimitError';
    this.code = 'DEVICE_LIMIT_REACHED';
    this.activeDevices = activeDevices;
    this.maxDevices = maxDevices;
  }
}

export class DeviceSessionService {
  /**
   * Create a new device session
   * If max devices reached, remove the oldest inactive session
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

    // Generate refresh token
    const refreshToken = TokenService.generateRefreshToken(data.userId);
    const expiresAt = TokenService.getRefreshTokenExpiry();

    // If device exists, update it
    if (existingSession) {
      const session = await db.deviceSession.update({
        where: { id: existingSession.id },
        data: {
          refreshToken,
          expiresAt,
          lastActiveAt: new Date(),
          isActive: true,
          ipAddress: data.ipAddress,
        },
      });

      return { session, refreshToken };
    }

    // Check active device count
    const activeDeviceCount = await db.deviceSession.count({
      where: {
        userId: data.userId,
        isActive: true,
      },
    });

    // Determine max devices based on user role
    const maxDevices = data.userRole === 'ADMIN' ? MAX_DEVICES_ADMIN : MAX_DEVICES_STUDENT;

    // If max devices reached, throw error instead of auto-deleting
    if (activeDeviceCount >= maxDevices) {
      throw new DeviceLimitError(activeDeviceCount, maxDevices);
    }

    // Create new session
    const session = await db.deviceSession.create({
      data: {
        ...data,
        refreshToken,
        expiresAt,
        lastActiveAt: new Date(),
      },
    });

    return { session, refreshToken };
  }

  /**
   * Get all active sessions for a user
   */
  static async getUserSessions(userId: string): Promise<DeviceSession[]> {
    return db.deviceSession.findMany({
      where: {
        userId,
        isActive: true,
      },
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
   * Cleanup expired and inactive sessions (run as a cron job)
   */
  static async cleanupInactiveSessions(): Promise<number> {
    const inactiveDate = new Date();
    inactiveDate.setDate(inactiveDate.getDate() - INACTIVE_DEVICE_DAYS);

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
            // Delete sessions inactive for 30+ days
            lastActiveAt: {
              lt: inactiveDate,
            },
          },
          {
            // Delete inactive sessions
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

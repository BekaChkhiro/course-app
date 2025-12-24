import { prisma } from '../config/database';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

interface VideoAccessPayload {
  videoId: string;
  userId: string;
  chapterId: string;
  courseId: string;
  ipAddress: string;
}

interface VideoAccessToken {
  token: string;
  expiresAt: Date;
}

class VideoAccessService {
  private readonly JWT_SECRET: string;
  private readonly TOKEN_EXPIRY: number = 7200; // 2 hours in seconds

  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  }

  /**
   * Generate a secure video access token
   */
  async generateAccessToken(
    payload: VideoAccessPayload
  ): Promise<VideoAccessToken> {
    try {
      // Verify user has access to the course
      const hasAccess = await this.verifyUserAccess(
        payload.userId,
        payload.courseId
      );

      if (!hasAccess) {
        throw new Error('User does not have access to this course');
      }

      // Generate unique token
      const tokenString = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY * 1000);

      // Create JWT for additional security
      const jwtToken = jwt.sign(
        {
          tokenId: tokenString,
          ...payload,
        },
        this.JWT_SECRET,
        {
          expiresIn: this.TOKEN_EXPIRY,
        }
      );

      // Save token to database
      await prisma.videoAccessToken.create({
        data: {
          videoId: payload.videoId,
          userId: payload.userId,
          token: tokenString,
          ipAddress: payload.ipAddress,
          expiresAt,
        },
      });

      return {
        token: jwtToken,
        expiresAt,
      };
    } catch (error) {
      console.error('Generate access token error:', error);
      throw error;
    }
  }

  /**
   * Validate video access token
   */
  async validateAccessToken(
    token: string,
    ipAddress: string
  ): Promise<{
    valid: boolean;
    videoId?: string;
    userId?: string;
    message?: string;
  }> {
    try {
      // Verify JWT
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;

      // Check token in database
      const dbToken = await prisma.videoAccessToken.findUnique({
        where: {
          token: decoded.tokenId,
        },
      });

      if (!dbToken) {
        return { valid: false, message: 'Invalid token' };
      }

      // Check if revoked
      if (dbToken.isRevoked) {
        return { valid: false, message: 'Token has been revoked' };
      }

      // Check expiration
      if (dbToken.expiresAt < new Date()) {
        return { valid: false, message: 'Token has expired' };
      }

      // Verify IP address
      if (dbToken.ipAddress !== ipAddress) {
        return { valid: false, message: 'IP address mismatch' };
      }

      // Update access count and last accessed time
      await prisma.videoAccessToken.update({
        where: { id: dbToken.id },
        data: {
          accessCount: { increment: 1 },
          lastAccessedAt: new Date(),
        },
      });

      return {
        valid: true,
        videoId: dbToken.videoId,
        userId: dbToken.userId,
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return { valid: false, message: 'Invalid token signature' };
      }
      if (error instanceof jwt.TokenExpiredError) {
        return { valid: false, message: 'Token has expired' };
      }
      console.error('Validate access token error:', error);
      return { valid: false, message: 'Token validation failed' };
    }
  }

  /**
   * Revoke an access token
   */
  async revokeToken(token: string): Promise<void> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;

      await prisma.videoAccessToken.update({
        where: { token: decoded.tokenId },
        data: { isRevoked: true },
      });
    } catch (error) {
      console.error('Revoke token error:', error);
      throw error;
    }
  }

  /**
   * Revoke all tokens for a video
   */
  async revokeAllVideoTokens(videoId: string): Promise<void> {
    try {
      await prisma.videoAccessToken.updateMany({
        where: { videoId },
        data: { isRevoked: true },
      });
    } catch (error) {
      console.error('Revoke all video tokens error:', error);
      throw error;
    }
  }

  /**
   * Revoke all tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      await prisma.videoAccessToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });
    } catch (error) {
      console.error('Revoke all user tokens error:', error);
      throw error;
    }
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await prisma.videoAccessToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      return result.count;
    } catch (error) {
      console.error('Cleanup expired tokens error:', error);
      throw error;
    }
  }

  /**
   * Verify user has access to course
   */
  private async verifyUserAccess(
    userId: string,
    courseId: string
  ): Promise<boolean> {
    try {
      // Check if user is admin
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user?.role === 'ADMIN') {
        return true;
      }

      // Check if user has purchased the course
      const purchase = await prisma.purchase.findFirst({
        where: {
          userId,
          courseId,
          status: 'COMPLETED',
        },
      });

      if (purchase) {
        return true;
      }

      // Check if user has version access (via upgrade or other means)
      const versionAccess = await prisma.userVersionAccess.findFirst({
        where: {
          userId,
          courseVersion: { courseId },
          isActive: true,
        },
      });

      return !!versionAccess;
    } catch (error) {
      console.error('Verify user access error:', error);
      return false;
    }
  }

  /**
   * Check if chapter is free
   */
  async isChapterFree(chapterId: string): Promise<boolean> {
    try {
      const chapter = await prisma.chapter.findUnique({
        where: { id: chapterId },
        select: { isFree: true },
      });

      return chapter?.isFree || false;
    } catch (error) {
      console.error('Check chapter free error:', error);
      return false;
    }
  }

  /**
   * Get active tokens for a user
   */
  async getUserActiveTokens(userId: string): Promise<any[]> {
    return prisma.videoAccessToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        videoId: true,
        ipAddress: true,
        accessCount: true,
        createdAt: true,
        expiresAt: true,
        lastAccessedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Rotate encryption key for a video
   */
  async rotateVideoEncryptionKey(videoId: string): Promise<{
    key: string;
    iv: string;
    rotationAt: Date;
  }> {
    try {
      const newKey = crypto.randomBytes(16).toString('hex');
      const newIv = crypto.randomBytes(16).toString('hex');
      const rotationAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      await prisma.video.update({
        where: { id: videoId },
        data: {
          encryptionKey: newKey,
          encryptionIv: newIv,
          keyRotationAt: rotationAt,
        },
      });

      // Revoke all existing tokens to force re-authentication
      await this.revokeAllVideoTokens(videoId);

      return {
        key: newKey,
        iv: newIv,
        rotationAt,
      };
    } catch (error) {
      console.error('Rotate encryption key error:', error);
      throw error;
    }
  }

  /**
   * Check if key rotation is needed
   */
  async checkKeyRotation(videoId: string): Promise<boolean> {
    try {
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        select: { keyRotationAt: true },
      });

      if (!video?.keyRotationAt) {
        return true; // No rotation date set, should rotate
      }

      return video.keyRotationAt < new Date();
    } catch (error) {
      console.error('Check key rotation error:', error);
      return false;
    }
  }
}

export default new VideoAccessService();

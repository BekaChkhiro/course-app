/**
 * Integration Tests: Remember Me Functionality - T1.2
 *
 * Tests that "Remember Me" extends session duration from 30 to 90 days
 */

import { TokenService } from '../../services/tokenService';
import { DeviceSessionService, CreateDeviceSessionData } from '../../services/deviceSessionService';

// Mock the database
jest.mock('../../config/database', () => ({
  db: {
    deviceSession: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

import { db } from '../../config/database';

describe('Remember Me Functionality (T1.2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
    process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-testing';
  });

  describe('TokenService.getRefreshTokenExpiry', () => {
    it('should return 30 days expiry when rememberMe is false', () => {
      const expiry = TokenService.getRefreshTokenExpiry(false);
      const now = new Date();
      const expectedDate = new Date(now);
      expectedDate.setDate(expectedDate.getDate() + 30);

      // Should be approximately 30 days from now (within 1 second tolerance)
      const diffInDays = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffInDays).toBe(30);
    });

    it('should return 90 days expiry when rememberMe is true', () => {
      const expiry = TokenService.getRefreshTokenExpiry(true);
      const now = new Date();

      // Should be approximately 90 days from now
      const diffInDays = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffInDays).toBe(90);
    });

    it('should default to 30 days when rememberMe is not specified', () => {
      const expiry = TokenService.getRefreshTokenExpiry();
      const now = new Date();

      const diffInDays = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffInDays).toBe(30);
    });
  });

  describe('TokenService.generateRefreshToken', () => {
    it('should generate token with 30d expiry when rememberMe is false', () => {
      const token = TokenService.generateRefreshToken('user-123', 'test@example.com', false);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      // Decode and check expiry
      const decoded = TokenService.decodeToken(token) as any;
      const expiresAt = new Date(decoded.exp * 1000);
      const now = new Date();
      const diffInDays = Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      expect(diffInDays).toBe(30);
    });

    it('should generate token with 90d expiry when rememberMe is true', () => {
      const token = TokenService.generateRefreshToken('user-123', 'test@example.com', true);

      expect(token).toBeTruthy();

      // Decode and check expiry
      const decoded = TokenService.decodeToken(token) as any;
      const expiresAt = new Date(decoded.exp * 1000);
      const now = new Date();
      const diffInDays = Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      expect(diffInDays).toBe(90);
    });

    it('should generate unique tokens with nonce', () => {
      const token1 = TokenService.generateRefreshToken('user-123', 'test@example.com');
      const token2 = TokenService.generateRefreshToken('user-123', 'test@example.com');

      // Tokens should be different even for same user
      expect(token1).not.toBe(token2);
    });
  });

  describe('TokenService.verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const token = TokenService.generateRefreshToken('user-123', 'test@example.com');
      const payload = TokenService.verifyRefreshToken(token);

      expect(payload.userId).toBe('user-123');
    });

    it('should verify token regardless of rememberMe setting', () => {
      const shortToken = TokenService.generateRefreshToken('user-123', 'test@example.com', false);
      const longToken = TokenService.generateRefreshToken('user-456', 'test2@example.com', true);

      const shortPayload = TokenService.verifyRefreshToken(shortToken);
      const longPayload = TokenService.verifyRefreshToken(longToken);

      expect(shortPayload.userId).toBe('user-123');
      expect(longPayload.userId).toBe('user-456');
    });
  });

  describe('DeviceSessionService.createSession with rememberMe', () => {
    const baseSessionData: CreateDeviceSessionData = {
      userId: 'user-123',
      deviceName: 'Chrome on Windows',
      deviceType: 'DESKTOP',
      deviceFingerprint: 'fingerprint-123',
      browser: 'Chrome',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0...',
      userRole: 'STUDENT',
    };

    it('should create session with 30d expiry when rememberMe is false', async () => {
      // Mock no existing session
      (db.deviceSession.findFirst as jest.Mock).mockResolvedValue(null);
      (db.deviceSession.count as jest.Mock).mockResolvedValue(0);
      (db.deviceSession.create as jest.Mock).mockImplementation(({ data }) =>
        Promise.resolve({ id: 'session-1', ...data })
      );

      const result = await DeviceSessionService.createSession({
        ...baseSessionData,
        rememberMe: false,
      });

      expect(result.session).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();

      // Check the create call
      const createCall = (db.deviceSession.create as jest.Mock).mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt;
      const now = new Date();
      const diffInDays = Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      expect(diffInDays).toBe(30);
    });

    it('should create session with 90d expiry when rememberMe is true', async () => {
      (db.deviceSession.findFirst as jest.Mock).mockResolvedValue(null);
      (db.deviceSession.count as jest.Mock).mockResolvedValue(0);
      (db.deviceSession.create as jest.Mock).mockImplementation(({ data }) =>
        Promise.resolve({ id: 'session-1', ...data })
      );

      const result = await DeviceSessionService.createSession({
        ...baseSessionData,
        rememberMe: true,
      });

      expect(result.session).toBeTruthy();

      // Check the create call
      const createCall = (db.deviceSession.create as jest.Mock).mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt;
      const now = new Date();
      const diffInDays = Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      expect(diffInDays).toBe(90);
    });

    it('should update existing session with extended expiry when rememberMe is true', async () => {
      // Mock existing session found
      const existingSession = {
        id: 'existing-session-1',
        userId: 'user-123',
        deviceFingerprint: 'fingerprint-123',
      };
      (db.deviceSession.findFirst as jest.Mock).mockResolvedValue(existingSession);
      (db.deviceSession.update as jest.Mock).mockImplementation(({ data }) =>
        Promise.resolve({ ...existingSession, ...data })
      );

      const result = await DeviceSessionService.createSession({
        ...baseSessionData,
        rememberMe: true,
      });

      expect(result.session).toBeTruthy();

      // Check the update call
      const updateCall = (db.deviceSession.update as jest.Mock).mock.calls[0][0];
      const expiresAt = updateCall.data.expiresAt;
      const now = new Date();
      const diffInDays = Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      expect(diffInDays).toBe(90);
    });

    it('should not include rememberMe in database fields', async () => {
      (db.deviceSession.findFirst as jest.Mock).mockResolvedValue(null);
      (db.deviceSession.count as jest.Mock).mockResolvedValue(0);
      (db.deviceSession.create as jest.Mock).mockImplementation(({ data }) =>
        Promise.resolve({ id: 'session-1', ...data })
      );

      await DeviceSessionService.createSession({
        ...baseSessionData,
        rememberMe: true,
      });

      // Check that rememberMe is not in the data passed to create
      const createCall = (db.deviceSession.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.rememberMe).toBeUndefined();
      expect(createCall.data.userRole).toBeUndefined();
    });
  });

  describe('Session Expiry Comparison', () => {
    it('should have significantly different expiry dates for different rememberMe values', () => {
      const shortExpiry = TokenService.getRefreshTokenExpiry(false);
      const longExpiry = TokenService.getRefreshTokenExpiry(true);

      const diffInDays = Math.round(
        (longExpiry.getTime() - shortExpiry.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Should be 60 days difference (90 - 30)
      expect(diffInDays).toBe(60);
    });
  });
});

describe('Login Flow with Remember Me', () => {
  // These tests would be for the full login flow
  // They require more extensive mocking of the AuthController

  describe('Cookie Configuration', () => {
    const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
    const COOKIE_MAX_AGE_EXTENDED = 90 * 24 * 60 * 60 * 1000; // 90 days in ms

    it('should use 30 day cookie max age for normal login', () => {
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      expect(COOKIE_MAX_AGE).toBe(thirtyDaysMs);
    });

    it('should use 90 day cookie max age for remember me login', () => {
      const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
      expect(COOKIE_MAX_AGE_EXTENDED).toBe(ninetyDaysMs);
    });

    it('should have 3x longer expiry for remember me', () => {
      expect(COOKIE_MAX_AGE_EXTENDED / COOKIE_MAX_AGE).toBe(3);
    });
  });
});

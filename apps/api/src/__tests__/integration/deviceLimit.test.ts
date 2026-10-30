/**
 * Integration Tests: Device limit
 *
 * Only live sessions (active, not expired, used in the last 30 days) count towards
 * the limit, valid sessions are never cleaned up, the same browser with a new device ID reuses its session, and a user
 * at the limit can replace one of their devices.
 */

import { TokenService } from '../../services/tokenService';
import {
  DeviceSessionService,
  DeviceLimitError,
  CreateDeviceSessionData,
} from '../../services/deviceSessionService';

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

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0';

const sessionData: CreateDeviceSessionData = {
  userId: 'user-1',
  deviceName: 'Chrome on Windows',
  deviceType: 'desktop',
  deviceFingerprint: 'new-device-id',
  browser: 'Chrome 120',
  ipAddress: '127.0.0.1',
  userAgent: CHROME_UA,
  userRole: 'STUDENT',
};

const liveSession = (id: string, userAgent: string, fingerprint = `fp-${id}`) => ({
  id,
  userId: 'user-1',
  deviceFingerprint: fingerprint,
  userAgent,
  isActive: true,
  expiresAt: new Date(Date.now() + 86400000),
  lastActiveAt: new Date(),
});

const otherDevices = [
  liveSession('s1', 'Mozilla/5.0 (iPhone) Safari'),
  liveSession('s2', 'Mozilla/5.0 (Android) Chrome'),
  liveSession('s3', 'Mozilla/5.0 (Macintosh) Firefox'),
];

describe('Device limit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (db.deviceSession.update as jest.Mock).mockImplementation(({ where, data }) =>
      Promise.resolve({ id: where.id, ...data })
    );
    (db.deviceSession.create as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({ id: 'created', ...data })
    );
  });

  describe('createSession', () => {
    it('counts only live sessions towards the limit', async () => {
      (db.deviceSession.findFirst as jest.Mock).mockResolvedValue(null);
      (db.deviceSession.findMany as jest.Mock)
        .mockResolvedValueOnce(otherDevices.slice(0, 2))
        .mockResolvedValueOnce([]);

      await DeviceSessionService.createSession(sessionData);

      const where = (db.deviceSession.findMany as jest.Mock).mock.calls[0][0].where;
      expect(where.userId).toBe('user-1');
      expect(where.isActive).toBe(true);
      expect(where.expiresAt.gt).toBeInstanceOf(Date);
      expect(where.lastActiveAt.gte).toBeInstanceOf(Date);
      expect(db.deviceSession.create).toHaveBeenCalled();
    });

    it('throws DeviceLimitError with the live sessions when the limit is reached', async () => {
      (db.deviceSession.findFirst as jest.Mock).mockResolvedValue(null);
      (db.deviceSession.findMany as jest.Mock).mockResolvedValue(otherDevices);

      const error = await DeviceSessionService.createSession(sessionData).catch((e) => e);

      expect(error).toBeInstanceOf(DeviceLimitError);
      expect(error.activeDevices).toBe(3);
      expect(error.maxDevices).toBe(3);
      expect(error.sessions.map((s: { id: string }) => s.id)).toEqual(['s1', 's2', 's3']);
      expect(db.deviceSession.create).not.toHaveBeenCalled();
    });

    it('lets an already signed-in device log in again at the limit', async () => {
      const current = liveSession('s3', CHROME_UA, 'new-device-id');
      (db.deviceSession.findFirst as jest.Mock).mockResolvedValue(current);
      (db.deviceSession.findMany as jest.Mock).mockResolvedValue([...otherDevices.slice(0, 2), current]);

      const { session } = await DeviceSessionService.createSession(sessionData);

      expect(session.id).toBe('s3');
      expect(db.deviceSession.create).not.toHaveBeenCalled();
    });

    it('reuses the session of the same browser when the device ID changed', async () => {
      const sameBrowser = liveSession('s3', CHROME_UA, 'old-device-id');
      (db.deviceSession.findFirst as jest.Mock).mockResolvedValue(null);
      (db.deviceSession.findMany as jest.Mock).mockResolvedValue([...otherDevices.slice(0, 2), sameBrowser]);

      const { session } = await DeviceSessionService.createSession(sessionData);

      expect(session.id).toBe('s3');
      const updateCall = (db.deviceSession.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.deviceFingerprint).toBe('new-device-id');
      expect(db.deviceSession.create).not.toHaveBeenCalled();
    });

    it('removes a dead session holding the device ID before reusing the same-browser session', async () => {
      const dead = { ...liveSession('dead', CHROME_UA, 'new-device-id'), isActive: false };
      const sameBrowser = liveSession('s3', CHROME_UA, 'old-device-id');
      (db.deviceSession.findFirst as jest.Mock).mockResolvedValue(dead);
      (db.deviceSession.findMany as jest.Mock).mockResolvedValue([sameBrowser]);

      await DeviceSessionService.createSession(sessionData);

      expect(db.deviceSession.delete).toHaveBeenCalledWith({ where: { id: 'dead' } });
      expect((db.deviceSession.update as jest.Mock).mock.calls[0][0].where.id).toBe('s3');
    });

    it('does not let a signed-out device bypass the limit', async () => {
      const signedOut = { ...liveSession('old', CHROME_UA, 'new-device-id'), isActive: false };
      (db.deviceSession.findFirst as jest.Mock).mockResolvedValue(signedOut);
      (db.deviceSession.findMany as jest.Mock).mockResolvedValue(otherDevices);

      await expect(DeviceSessionService.createSession(sessionData)).rejects.toBeInstanceOf(
        DeviceLimitError
      );
      expect(db.deviceSession.update).not.toHaveBeenCalled();
    });

    it('reactivates a signed-out device when there is room', async () => {
      const signedOut = { ...liveSession('old', CHROME_UA, 'new-device-id'), isActive: false };
      (db.deviceSession.findFirst as jest.Mock).mockResolvedValue(signedOut);
      (db.deviceSession.findMany as jest.Mock)
        .mockResolvedValueOnce(otherDevices.slice(0, 2))
        .mockResolvedValueOnce([]);

      const { session } = await DeviceSessionService.createSession(sessionData);

      expect(session.id).toBe('old');
      expect((db.deviceSession.update as jest.Mock).mock.calls[0][0].data.isActive).toBe(true);
      expect(db.deviceSession.create).not.toHaveBeenCalled();
    });

    it('keeps long-unused but still valid sessions while there is room', async () => {
      (db.deviceSession.findFirst as jest.Mock).mockResolvedValue(null);
      (db.deviceSession.findMany as jest.Mock)
        .mockResolvedValueOnce(otherDevices.slice(0, 1))
        .mockResolvedValueOnce([liveSession('stale', 'Mozilla/5.0 (Windows) Edge')]);

      await DeviceSessionService.createSession(sessionData);

      expect(db.deviceSession.deleteMany).not.toHaveBeenCalled();
      expect(db.deviceSession.create).toHaveBeenCalled();
    });

    it('signs out the oldest long-unused sessions only when a new device needs the slot', async () => {
      (db.deviceSession.findFirst as jest.Mock).mockResolvedValue(null);
      (db.deviceSession.findMany as jest.Mock)
        .mockResolvedValueOnce(otherDevices.slice(0, 2))
        .mockResolvedValueOnce([
          liveSession('stale-oldest', 'Mozilla/5.0 (Windows) Edge'),
          liveSession('stale-newer', 'Mozilla/5.0 (Linux) Firefox'),
        ]);

      await DeviceSessionService.createSession(sessionData);

      expect(db.deviceSession.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['stale-oldest', 'stale-newer'] } },
      });
      expect(db.deviceSession.create).toHaveBeenCalled();
    });
  });

  describe('cleanupInactiveSessions', () => {
    it('deletes only expired and signed-out sessions', async () => {
      (db.deviceSession.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });

      await DeviceSessionService.cleanupInactiveSessions();

      const where = (db.deviceSession.deleteMany as jest.Mock).mock.calls[0][0].where;
      expect(where.OR).toHaveLength(2);
      expect(where.OR[0].expiresAt.lt).toBeInstanceOf(Date);
      expect(where.OR[1]).toEqual({ isActive: false });
    });
  });

  describe('replaceSession', () => {
    it("removes the chosen session of the user and creates one for the current device", async () => {
      (db.deviceSession.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      (db.deviceSession.findFirst as jest.Mock).mockResolvedValue(null);
      (db.deviceSession.findMany as jest.Mock)
        .mockResolvedValueOnce(otherDevices.slice(1))
        .mockResolvedValueOnce([]);

      const { session } = await DeviceSessionService.replaceSession('s1', sessionData);

      expect(db.deviceSession.deleteMany).toHaveBeenCalledWith({
        where: { id: 's1', userId: 'user-1' },
      });
      expect(session.id).toBe('created');
    });

    it("refuses to remove a session that doesn't belong to the user", async () => {
      (db.deviceSession.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      await expect(DeviceSessionService.replaceSession('foreign', sessionData)).rejects.toThrow(
        'Device session not found'
      );
      expect(db.deviceSession.create).not.toHaveBeenCalled();
    });
  });

  describe('device replace token', () => {
    it('round-trips the user ID', () => {
      const token = TokenService.generateDeviceReplaceToken('user-1');
      expect(TokenService.verifyDeviceReplaceToken(token).userId).toBe('user-1');
    });

    it('cannot be used as an access token', () => {
      const token = TokenService.generateDeviceReplaceToken('user-1');
      expect(() => TokenService.verifyAccessToken(token)).toThrow();
    });

    it('rejects an access token', () => {
      const accessToken = TokenService.generateAccessToken('user-1');
      expect(() => TokenService.verifyDeviceReplaceToken(accessToken)).toThrow();
    });
  });
});

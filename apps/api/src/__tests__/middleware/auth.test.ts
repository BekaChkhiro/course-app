import { verifyToken, requireAdmin, requireEmailVerified } from '../../middleware/auth';
import { mockRequest, mockResponse, mockNext, generateTestToken, createTestUser } from '../setup';
import jwt from 'jsonwebtoken';

// Mock database
jest.mock('../../config/database', () => ({
  db: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

import { db } from '../../config/database';

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyToken', () => {
    it('should return 401 if no token provided', async () => {
      const req = mockRequest({ headers: {} });
      const res = mockResponse();

      await verifyToken(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No token provided',
      });
    });

    it('should return 401 if token is invalid', async () => {
      const req = mockRequest({
        headers: { authorization: 'Bearer invalid-token' },
      });
      const res = mockResponse();

      await verifyToken(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token',
      });
    });

    it('should return 401 if user not found', async () => {
      const token = generateTestToken('non-existent-user');
      const req = mockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = mockResponse();

      (db.user.findUnique as jest.Mock).mockResolvedValue(null);

      await verifyToken(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
      });
    });

    it('should return 403 if user is deactivated', async () => {
      const token = generateTestToken('test-user-id');
      const req = mockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = mockResponse();

      (db.user.findUnique as jest.Mock).mockResolvedValue(
        createTestUser({ isActive: false })
      );

      await verifyToken(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Account is deactivated',
      });
    });

    it('should call next and attach user to request on valid token', async () => {
      const token = generateTestToken('test-user-id');
      const req = mockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = mockResponse();
      const testUser = createTestUser();

      (db.user.findUnique as jest.Mock).mockResolvedValue(testUser);

      await verifyToken(req as any, res as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(req.userId).toBe(testUser.id);
      expect(req.user).toBeDefined();
    });

    it('should return 401 with TOKEN_EXPIRED code for expired tokens', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { userId: 'test-user-id' },
        process.env.JWT_SECRET!,
        { expiresIn: '-1h' }
      );

      const req = mockRequest({
        headers: { authorization: `Bearer ${expiredToken}` },
      });
      const res = mockResponse();

      await verifyToken(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
    });
  });

  describe('requireAdmin', () => {
    it('should return 403 if user is not admin', async () => {
      const req = mockRequest({
        user: createTestUser({ role: 'STUDENT' }),
      });
      const res = mockResponse();

      await requireAdmin(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Admin access required',
      });
    });

    it('should call next if user is admin', async () => {
      const req = mockRequest({
        user: createTestUser({ role: 'ADMIN' }),
      });
      const res = mockResponse();

      await requireAdmin(req as any, res as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireEmailVerified', () => {
    it('should return 403 if email not verified', async () => {
      const req = mockRequest({
        user: createTestUser({ emailVerified: false }),
      });
      const res = mockResponse();

      await requireEmailVerified(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email verification required',
        code: 'EMAIL_NOT_VERIFIED',
      });
    });

    it('should call next if email is verified', async () => {
      const req = mockRequest({
        user: createTestUser({ emailVerified: true }),
      });
      const res = mockResponse();

      await requireEmailVerified(req as any, res as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});

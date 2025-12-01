import { PrismaClient } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

// Mock Prisma client
export type MockContext = {
  prisma: DeepMockProxy<PrismaClient>;
};

export const createMockContext = (): MockContext => {
  return {
    prisma: mockDeep<PrismaClient>(),
  };
};

// Global test setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-testing';
});

afterAll(async () => {
  // Cleanup after all tests
});

// Mock Redis
jest.mock('../config/redis', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(60),
    ping: jest.fn().mockResolvedValue('PONG'),
    on: jest.fn(),
  },
}));

// Helper to generate test tokens
export const generateTestToken = (userId: string, role: string = 'STUDENT') => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { userId, email: 'test@example.com', role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

// Helper to create test user data
export const createTestUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  password: '$2a$10$hashedpassword',
  name: 'Test',
  surname: 'User',
  role: 'STUDENT',
  isActive: true,
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Helper to create test course data
export const createTestCourse = (overrides = {}) => ({
  id: 'test-course-id',
  title: 'Test Course',
  slug: 'test-course',
  description: 'A test course description',
  thumbnail: null,
  price: 99.99,
  status: 'PUBLISHED',
  categoryId: 'test-category-id',
  authorId: 'test-author-id',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Request mock helper
export const mockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: null,
  userId: null,
  ip: '127.0.0.1',
  get: jest.fn(),
  ...overrides,
});

// Response mock helper
export const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.removeHeader = jest.fn().mockReturnValue(res);
  return res;
};

// Next function mock
export const mockNext = jest.fn();

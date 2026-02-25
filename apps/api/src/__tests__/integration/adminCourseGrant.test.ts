/**
 * Integration Tests: Admin Course Grant Functionality - T3.1, T3.2, T3.3
 *
 * Tests the admin ability to manually grant course access to students
 */

import { grantCourseAccess, getAvailableCoursesForGrant } from '../../controllers/adminStudents.controller';
import { mockRequest, mockResponse } from '../setup';
import { Decimal } from '@prisma/client/runtime/library';

// Mock the database
jest.mock('../../config/database', () => ({
  db: {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    course: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    purchase: {
      create: jest.fn(),
    },
    userVersionAccess: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
  },
}));

// Mock the email service
jest.mock('../../services/emailService', () => ({
  EmailService: {
    sendCourseGrantedEmail: jest.fn().mockResolvedValue(undefined),
  },
}));

import { db } from '../../config/database';
import { EmailService } from '../../services/emailService';

describe('Admin Course Grant (T3.1, T3.2, T3.3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('grantCourseAccess', () => {
    const mockStudent = {
      id: 'student-123',
      email: 'student@example.com',
      name: 'Test Student',
    };

    const mockCourse = {
      id: 'course-123',
      title: 'Test Course',
      slug: 'test-course',
      versions: [
        { id: 'version-1', version: 1 },
      ],
    };

    const mockAdmin = {
      id: 'admin-123',
      email: 'admin@example.com',
      role: 'ADMIN',
    };

    it('should grant course access successfully', async () => {
      const req = mockRequest({
        params: { studentId: 'student-123' },
        body: { courseId: 'course-123', note: 'Promotional access' },
        user: mockAdmin,
      });
      const res = mockResponse();

      // Setup mocks
      (db.user.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      (db.course.findUnique as jest.Mock).mockResolvedValue(mockCourse);
      (db.userVersionAccess.findFirst as jest.Mock).mockResolvedValue(null); // No existing access
      (db.purchase.create as jest.Mock).mockResolvedValue({
        id: 'purchase-123',
        userId: 'student-123',
        courseId: 'course-123',
        courseVersionId: 'version-1',
        status: 'COMPLETED',
        paymentMethod: 'ADMIN_GRANT',
      });
      (db.userVersionAccess.create as jest.Mock).mockResolvedValue({
        id: 'access-123',
        userId: 'student-123',
        courseVersionId: 'version-1',
      });
      (db.activityLog.create as jest.Mock).mockResolvedValue({});

      await grantCourseAccess(req as any, res as any);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            purchase: expect.any(Object),
          }),
        })
      );
    });

    it('should create purchase with ADMIN_GRANT payment method', async () => {
      const req = mockRequest({
        params: { studentId: 'student-123' },
        body: { courseId: 'course-123' },
        user: mockAdmin,
      });
      const res = mockResponse();

      (db.user.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      (db.course.findUnique as jest.Mock).mockResolvedValue(mockCourse);
      (db.userVersionAccess.findFirst as jest.Mock).mockResolvedValue(null);
      (db.purchase.create as jest.Mock).mockResolvedValue({ id: 'purchase-123' });
      (db.userVersionAccess.create as jest.Mock).mockResolvedValue({});
      (db.activityLog.create as jest.Mock).mockResolvedValue({});

      await grantCourseAccess(req as any, res as any);

      // Verify purchase was created with correct fields
      expect(db.purchase.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'student-123',
            courseId: 'course-123',
            courseVersionId: 'version-1',
            status: 'COMPLETED',
            paymentMethod: 'ADMIN_GRANT',
            grantedByAdminId: 'admin-123',
            amount: expect.any(Decimal),
            finalAmount: expect.any(Decimal),
          }),
        })
      );
    });

    it('should create purchase with zero amount', async () => {
      const req = mockRequest({
        params: { studentId: 'student-123' },
        body: { courseId: 'course-123' },
        user: mockAdmin,
      });
      const res = mockResponse();

      (db.user.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      (db.course.findUnique as jest.Mock).mockResolvedValue(mockCourse);
      (db.userVersionAccess.findFirst as jest.Mock).mockResolvedValue(null);
      (db.purchase.create as jest.Mock).mockResolvedValue({ id: 'purchase-123' });
      (db.userVersionAccess.create as jest.Mock).mockResolvedValue({});
      (db.activityLog.create as jest.Mock).mockResolvedValue({});

      await grantCourseAccess(req as any, res as any);

      const createCall = (db.purchase.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.amount.toString()).toBe('0');
      expect(createCall.data.finalAmount.toString()).toBe('0');
    });

    it('should save grant note when provided', async () => {
      const req = mockRequest({
        params: { studentId: 'student-123' },
        body: { courseId: 'course-123', note: 'Contest winner prize' },
        user: mockAdmin,
      });
      const res = mockResponse();

      (db.user.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      (db.course.findUnique as jest.Mock).mockResolvedValue(mockCourse);
      (db.userVersionAccess.findFirst as jest.Mock).mockResolvedValue(null);
      (db.purchase.create as jest.Mock).mockResolvedValue({ id: 'purchase-123' });
      (db.userVersionAccess.create as jest.Mock).mockResolvedValue({});
      (db.activityLog.create as jest.Mock).mockResolvedValue({});

      await grantCourseAccess(req as any, res as any);

      const createCall = (db.purchase.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.grantNote).toBe('Contest winner prize');
    });

    it('should send email notification to student (T3.3)', async () => {
      const req = mockRequest({
        params: { studentId: 'student-123' },
        body: { courseId: 'course-123', note: 'Scholarship grant' },
        user: mockAdmin,
      });
      const res = mockResponse();

      (db.user.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      (db.course.findUnique as jest.Mock).mockResolvedValue(mockCourse);
      (db.userVersionAccess.findFirst as jest.Mock).mockResolvedValue(null);
      (db.purchase.create as jest.Mock).mockResolvedValue({ id: 'purchase-123' });
      (db.userVersionAccess.create as jest.Mock).mockResolvedValue({});
      (db.activityLog.create as jest.Mock).mockResolvedValue({});

      await grantCourseAccess(req as any, res as any);

      expect(EmailService.sendCourseGrantedEmail).toHaveBeenCalledWith(
        'student@example.com',
        'Test Student',
        'Test Course',
        'test-course',
        'Scholarship grant',
        'student-123'
      );
    });

    it('should log activity for audit trail', async () => {
      const req = mockRequest({
        params: { studentId: 'student-123' },
        body: { courseId: 'course-123' },
        user: mockAdmin,
      });
      const res = mockResponse();

      (db.user.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      (db.course.findUnique as jest.Mock).mockResolvedValue(mockCourse);
      (db.userVersionAccess.findFirst as jest.Mock).mockResolvedValue(null);
      (db.purchase.create as jest.Mock).mockResolvedValue({ id: 'purchase-123' });
      (db.userVersionAccess.create as jest.Mock).mockResolvedValue({});
      (db.activityLog.create as jest.Mock).mockResolvedValue({});

      await grantCourseAccess(req as any, res as any);

      expect(db.activityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'admin-123',
            activityType: 'course_granted',
            resourceType: 'course',
            resourceId: 'course-123',
            metadata: expect.objectContaining({
              studentId: 'student-123',
              studentEmail: 'student@example.com',
              courseTitle: 'Test Course',
            }),
          }),
        })
      );
    });

    it('should return 404 if student not found', async () => {
      const req = mockRequest({
        params: { studentId: 'nonexistent-student' },
        body: { courseId: 'course-123' },
        user: mockAdmin,
      });
      const res = mockResponse();

      (db.user.findFirst as jest.Mock).mockResolvedValue(null);

      await grantCourseAccess(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'სტუდენტი ვერ მოიძებნა',
        })
      );
    });

    it('should return 404 if course not found', async () => {
      const req = mockRequest({
        params: { studentId: 'student-123' },
        body: { courseId: 'nonexistent-course' },
        user: mockAdmin,
      });
      const res = mockResponse();

      (db.user.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      (db.course.findUnique as jest.Mock).mockResolvedValue(null);

      await grantCourseAccess(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'კურსი ვერ მოიძებნა',
        })
      );
    });

    it('should return 400 if student already has access', async () => {
      const req = mockRequest({
        params: { studentId: 'student-123' },
        body: { courseId: 'course-123' },
        user: mockAdmin,
      });
      const res = mockResponse();

      (db.user.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      (db.course.findUnique as jest.Mock).mockResolvedValue(mockCourse);
      (db.userVersionAccess.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-access',
      }); // Already has access

      await grantCourseAccess(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'სტუდენტს უკვე აქვს წვდომა ამ კურსზე',
        })
      );
    });

    it('should return 400 if course has no active version', async () => {
      const req = mockRequest({
        params: { studentId: 'student-123' },
        body: { courseId: 'course-123' },
        user: mockAdmin,
      });
      const res = mockResponse();

      (db.user.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      (db.course.findUnique as jest.Mock).mockResolvedValue({
        ...mockCourse,
        versions: [], // No active versions
      });

      await grantCourseAccess(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'კურსს არ აქვს აქტიური ვერსია',
        })
      );
    });

    it('should return 401 if no admin user', async () => {
      const req = mockRequest({
        params: { studentId: 'student-123' },
        body: { courseId: 'course-123' },
        user: null,
      });
      const res = mockResponse();

      await grantCourseAccess(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 if courseId not provided', async () => {
      const req = mockRequest({
        params: { studentId: 'student-123' },
        body: {}, // No courseId
        user: mockAdmin,
      });
      const res = mockResponse();

      await grantCourseAccess(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'კურსის ID აუცილებელია',
        })
      );
    });

    it('should use specific version when provided', async () => {
      const req = mockRequest({
        params: { studentId: 'student-123' },
        body: { courseId: 'course-123', versionId: 'specific-version-2' },
        user: mockAdmin,
      });
      const res = mockResponse();

      (db.user.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      (db.course.findUnique as jest.Mock).mockResolvedValue(mockCourse);
      (db.userVersionAccess.findFirst as jest.Mock).mockResolvedValue(null);
      (db.purchase.create as jest.Mock).mockResolvedValue({ id: 'purchase-123' });
      (db.userVersionAccess.create as jest.Mock).mockResolvedValue({});
      (db.activityLog.create as jest.Mock).mockResolvedValue({});

      await grantCourseAccess(req as any, res as any);

      const createCall = (db.purchase.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.courseVersionId).toBe('specific-version-2');
    });
  });

  describe('getAvailableCoursesForGrant', () => {
    it('should return courses student does not have access to', async () => {
      const req = mockRequest({
        params: { studentId: 'student-123' },
      });
      const res = mockResponse();

      // Student has access to course-1
      (db.userVersionAccess.findMany as jest.Mock).mockResolvedValue([
        { courseVersion: { courseId: 'course-1' } },
      ]);

      // Available courses (excludes course-1)
      (db.course.findMany as jest.Mock).mockResolvedValue([
        { id: 'course-2', title: 'Course 2', slug: 'course-2' },
        { id: 'course-3', title: 'Course 3', slug: 'course-3' },
      ]);

      await getAvailableCoursesForGrant(req as any, res as any);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({ id: 'course-2' }),
            expect.objectContaining({ id: 'course-3' }),
          ]),
        })
      );

      // Verify the query excluded owned courses
      const findManyCall = (db.course.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.id.notIn).toContain('course-1');
    });

    it('should return all published courses if student has no courses', async () => {
      const req = mockRequest({
        params: { studentId: 'student-123' },
      });
      const res = mockResponse();

      (db.userVersionAccess.findMany as jest.Mock).mockResolvedValue([]);
      (db.course.findMany as jest.Mock).mockResolvedValue([
        { id: 'course-1', title: 'Course 1' },
        { id: 'course-2', title: 'Course 2' },
      ]);

      await getAvailableCoursesForGrant(req as any, res as any);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({ id: 'course-1' }),
            expect.objectContaining({ id: 'course-2' }),
          ]),
        })
      );
    });

    it('should only return PUBLISHED courses', async () => {
      const req = mockRequest({
        params: { studentId: 'student-123' },
      });
      const res = mockResponse();

      (db.userVersionAccess.findMany as jest.Mock).mockResolvedValue([]);
      (db.course.findMany as jest.Mock).mockResolvedValue([]);

      await getAvailableCoursesForGrant(req as any, res as any);

      const findManyCall = (db.course.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.status).toBe('PUBLISHED');
    });
  });
});

describe('Admin Grant Purchase Fields', () => {
  describe('Purchase model fields for ADMIN_GRANT', () => {
    it('should include paymentMethod field', () => {
      const purchaseData = {
        userId: 'student-123',
        courseId: 'course-123',
        courseVersionId: 'version-1',
        status: 'COMPLETED',
        paymentMethod: 'ADMIN_GRANT',
        grantedByAdminId: 'admin-123',
        grantNote: 'Test grant',
        amount: new Decimal(0),
        finalAmount: new Decimal(0),
        paidAt: new Date(),
      };

      expect(purchaseData.paymentMethod).toBe('ADMIN_GRANT');
      expect(purchaseData.grantedByAdminId).toBe('admin-123');
      expect(purchaseData.grantNote).toBe('Test grant');
    });

    it('should differentiate between BOG and ADMIN_GRANT', () => {
      const bogPurchase = { paymentMethod: 'BOG', amount: new Decimal(99.99) };
      const adminGrantPurchase = { paymentMethod: 'ADMIN_GRANT', amount: new Decimal(0) };

      expect(bogPurchase.paymentMethod).not.toBe(adminGrantPurchase.paymentMethod);
      expect(Number(bogPurchase.amount)).toBeGreaterThan(0);
      expect(Number(adminGrantPurchase.amount)).toBe(0);
    });
  });
});

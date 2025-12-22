import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { db } from '../config/database';
import { DeviceSessionService } from '../services/deviceSessionService';
import { EmailService } from '../services/emailService';
import { TokenService } from '../services/tokenService';

/**
 * Get all students with pagination, search, and filters
 * GET /api/admin/students?page=1&limit=20&search=&status=&sortBy=newest
 */
export const getAllStudents = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      search = '',
      status, // 'active' | 'blocked' | 'deleted' | 'all'
      sortBy = 'newest', // 'newest' | 'oldest' | 'name' | 'email'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {
      role: 'STUDENT',
    };

    // Search by name, email, or phone
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { surname: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string } },
      ];
    }

    // Status filter
    if (status === 'active') {
      where.isActive = true;
      where.deletedAt = null;
    } else if (status === 'blocked') {
      where.isActive = false;
      where.deletedAt = null;
    } else if (status === 'deleted') {
      where.deletedAt = { not: null };
    } else {
      // Default - show non-deleted
      where.deletedAt = null;
    }

    // Sort order
    let orderBy: any = { createdAt: 'desc' };
    if (sortBy === 'oldest') orderBy = { createdAt: 'asc' };
    else if (sortBy === 'name') orderBy = { name: 'asc' };
    else if (sortBy === 'email') orderBy = { email: 'asc' };

    const [students, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          surname: true,
          phone: true,
          avatar: true,
          isActive: true,
          emailVerified: true,
          deletedAt: true,
          createdAt: true,
          _count: {
            select: {
              purchases: { where: { status: 'COMPLETED' } },
              deviceSessions: { where: { isActive: true } },
            },
          },
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      db.user.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        students,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching students:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get student details with purchases, progress, device sessions
 * GET /api/admin/students/:studentId
 */
export const getStudentById = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;

    const student = await db.user.findFirst({
      where: {
        id: studentId,
        role: 'STUDENT',
      },
      select: {
        id: true,
        email: true,
        name: true,
        surname: true,
        phone: true,
        avatar: true,
        bio: true,
        isActive: true,
        emailVerified: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        // Purchases with course info
        purchases: {
          select: {
            id: true,
            courseId: true,
            amount: true,
            finalAmount: true,
            status: true,
            bogOrderId: true,
            paidAt: true,
            createdAt: true,
            course: {
              select: {
                id: true,
                title: true,
                slug: true,
                thumbnail: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        // Active device sessions
        deviceSessions: {
          where: { isActive: true },
          select: {
            id: true,
            deviceName: true,
            deviceType: true,
            browser: true,
            ipAddress: true,
            lastActiveAt: true,
            createdAt: true,
          },
          orderBy: { lastActiveAt: 'desc' },
        },
        // Progress stats
        progress: {
          select: {
            id: true,
            isCompleted: true,
            chapterId: true,
            courseVersionId: true,
          },
        },
        // User preferences
        preferences: true,
        // Study streak
        studyStreak: true,
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'სტუდენტი ვერ მოიძებნა' });
    }

    // Calculate stats
    const stats = {
      totalCourses: student.purchases.filter((p) => p.status === 'COMPLETED').length,
      totalSpent: student.purchases
        .filter((p) => p.status === 'COMPLETED')
        .reduce((sum, p) => sum + Number(p.finalAmount), 0),
      completedChapters: student.progress.filter((p) => p.isCompleted).length,
      totalChapters: student.progress.length,
      activeDevices: student.deviceSessions.length,
    };

    return res.json({
      success: true,
      data: {
        student,
        stats,
      },
    });
  } catch (error: any) {
    console.error('Error fetching student:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Toggle student active status (block/unblock)
 * POST /api/admin/students/:studentId/toggle-active
 */
export const toggleStudentActive = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;

    const student = await db.user.findFirst({
      where: { id: studentId, role: 'STUDENT' },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'სტუდენტი ვერ მოიძებნა' });
    }

    const newStatus = !student.isActive;

    await db.user.update({
      where: { id: studentId },
      data: { isActive: newStatus },
    });

    // If blocking, deactivate all device sessions
    if (!newStatus) {
      await DeviceSessionService.deactivateAllUserSessions(studentId);
    }

    return res.json({
      success: true,
      data: {
        isActive: newStatus,
      },
      message: newStatus ? 'სტუდენტი განბლოკილია' : 'სტუდენტი დაბლოკილია',
    });
  } catch (error: any) {
    console.error('Error toggling student status:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Soft delete student
 * DELETE /api/admin/students/:studentId
 */
export const softDeleteStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;

    const student = await db.user.findFirst({
      where: { id: studentId, role: 'STUDENT', deletedAt: null },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'სტუდენტი ვერ მოიძებნა' });
    }

    await db.user.update({
      where: { id: studentId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    // Deactivate all device sessions
    await DeviceSessionService.deactivateAllUserSessions(studentId);

    return res.json({
      success: true,
      message: 'სტუდენტი წაშლილია',
    });
  } catch (error: any) {
    console.error('Error deleting student:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Restore soft-deleted student
 * POST /api/admin/students/:studentId/restore
 */
export const restoreStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;

    const student = await db.user.findFirst({
      where: { id: studentId, role: 'STUDENT', deletedAt: { not: null } },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'წაშლილი სტუდენტი ვერ მოიძებნა' });
    }

    await db.user.update({
      where: { id: studentId },
      data: {
        deletedAt: null,
        isActive: true,
      },
    });

    return res.json({
      success: true,
      message: 'სტუდენტი აღდგენილია',
    });
  } catch (error: any) {
    console.error('Error restoring student:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Send email to student
 * POST /api/admin/students/:studentId/send-email
 */
export const sendEmailToStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const { subject, content } = req.body;

    if (!subject || !content) {
      return res.status(400).json({ success: false, message: 'სათაური და შინაარსი აუცილებელია' });
    }

    const student = await db.user.findFirst({
      where: { id: studentId, role: 'STUDENT' },
      select: { id: true, email: true, name: true },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'სტუდენტი ვერ მოიძებნა' });
    }

    await EmailService.sendAdminEmailToStudent(student.email, student.name, subject, content, studentId);

    return res.json({
      success: true,
      message: 'ელფოსტა გაიგზავნა',
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Refund a purchase
 * POST /api/admin/students/:studentId/purchases/:purchaseId/refund
 */
export const refundPurchase = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, purchaseId } = req.params;
    const { reason } = req.body;

    const purchase = await db.purchase.findFirst({
      where: {
        id: purchaseId,
        userId: studentId,
        status: 'COMPLETED',
      },
      include: {
        course: { select: { title: true } },
        user: { select: { email: true, name: true } },
      },
    });

    if (!purchase) {
      return res.status(404).json({ success: false, message: 'შეძენა ვერ მოიძებნა ან უკვე დაბრუნებულია' });
    }

    // Update purchase status to REFUNDED
    await db.purchase.update({
      where: { id: purchaseId },
      data: {
        status: 'REFUNDED',
        paymentDetails: {
          ...((purchase.paymentDetails as object) || {}),
          refundedAt: new Date().toISOString(),
          refundReason: reason,
          refundedBy: req.user?.id,
        },
      },
    });

    // Send refund notification email
    await EmailService.sendRefundNotification(
      purchase.user.email,
      purchase.user.name,
      purchase.course.title,
      Number(purchase.finalAmount),
      studentId
    );

    return res.json({
      success: true,
      message: 'თანხა დაბრუნებულია',
    });
  } catch (error: any) {
    console.error('Error refunding purchase:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Revoke device session
 * DELETE /api/admin/students/:studentId/devices/:sessionId
 */
export const revokeDeviceSession = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, sessionId } = req.params;

    const session = await db.deviceSession.findFirst({
      where: {
        id: sessionId,
        userId: studentId,
        isActive: true,
      },
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'მოწყობილობა ვერ მოიძებნა' });
    }

    await db.deviceSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });

    return res.json({
      success: true,
      message: 'მოწყობილობა გაუქმებულია',
    });
  } catch (error: any) {
    console.error('Error revoking device session:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get student analytics overview
 * GET /api/admin/students/analytics/overview
 */
export const getStudentAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [totalStudents, activeStudents, blockedStudents, newThisMonth, withPurchases] = await Promise.all([
      db.user.count({ where: { role: 'STUDENT', deletedAt: null } }),
      db.user.count({ where: { role: 'STUDENT', isActive: true, deletedAt: null } }),
      db.user.count({ where: { role: 'STUDENT', isActive: false, deletedAt: null } }),
      db.user.count({
        where: {
          role: 'STUDENT',
          deletedAt: null,
          createdAt: { gte: startOfMonth },
        },
      }),
      db.user.count({
        where: {
          role: 'STUDENT',
          deletedAt: null,
          purchases: { some: { status: 'COMPLETED' } },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        totalStudents,
        activeStudents,
        blockedStudents,
        newThisMonth,
        withPurchases,
      },
    });
  } catch (error: any) {
    console.error('Error fetching student analytics:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Resend verification email to student
 * POST /api/admin/students/:studentId/resend-verification
 */
export const resendVerificationEmail = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;

    const student = await db.user.findFirst({
      where: { id: studentId, role: 'STUDENT' },
      select: { id: true, email: true, name: true, emailVerified: true },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'სტუდენტი ვერ მოიძებნა' });
    }

    if (student.emailVerified) {
      return res.status(400).json({ success: false, message: 'ელფოსტა უკვე დადასტურებულია' });
    }

    // Generate new verification token
    const verificationToken = TokenService.generateVerificationToken();

    // Update user with new token
    await db.user.update({
      where: { id: studentId },
      data: { verificationToken },
    });

    // Send verification email
    await EmailService.sendVerificationEmail(student.email, student.name, verificationToken);

    return res.json({
      success: true,
      message: 'ვერიფიკაციის ელფოსტა გაიგზავნა',
    });
  } catch (error: any) {
    console.error('Error resending verification email:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

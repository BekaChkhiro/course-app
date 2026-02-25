import express from 'express';
import {
  getAllStudents,
  getStudentById,
  toggleStudentActive,
  softDeleteStudent,
  restoreStudent,
  sendEmailToStudent,
  refundPurchase,
  revokeDeviceSession,
  getStudentAnalytics,
  resendVerificationEmail,
  grantCourseAccess,
  getAvailableCoursesForGrant,
} from '../controllers/adminStudents.controller';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = express.Router();

// All routes require admin auth
router.use(requireAuth);
router.use(requireAdmin);

// Get student analytics overview (must come before /:studentId)
router.get('/analytics/overview', getStudentAnalytics);

// List students with pagination, search, filters
router.get('/', getAllStudents);

// Get student details with purchases, progress, device sessions
router.get('/:studentId', getStudentById);

// Toggle active status (block/unblock)
router.post('/:studentId/toggle-active', toggleStudentActive);

// Soft delete student
router.delete('/:studentId', softDeleteStudent);

// Restore soft-deleted student
router.post('/:studentId/restore', restoreStudent);

// Send email to student
router.post('/:studentId/send-email', sendEmailToStudent);

// Refund a purchase
router.post('/:studentId/purchases/:purchaseId/refund', refundPurchase);

// Revoke device session
router.delete('/:studentId/devices/:sessionId', revokeDeviceSession);

// Resend verification email
router.post('/:studentId/resend-verification', resendVerificationEmail);

// Grant course access to student (T3.1)
router.post('/:studentId/grant-course', grantCourseAccess);

// Get available courses for granting (T3.1)
router.get('/:studentId/available-courses', getAvailableCoursesForGrant);

export default router;

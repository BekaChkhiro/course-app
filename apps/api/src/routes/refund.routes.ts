import { Router } from 'express'
import { verifyToken, requireAdmin } from '../middleware/auth'
import {
  // Student endpoints
  createRefundRequest,
  getMyRefundRequests,
  // Admin endpoints
  getAllRefundRequests,
  approveRefundRequest,
  rejectRefundRequest,
  completeRefundManually,
  checkRefundStatus,
  getRefundStats,
} from '../controllers/refundController'

const router = Router()

// ============================================
// STUDENT ROUTES
// ============================================

// სტუდენტის refund მოთხოვნის შექმნა
router.post('/request', verifyToken, createRefundRequest)

// სტუდენტის საკუთარი refund მოთხოვნების სია
router.get('/my-requests', verifyToken, getMyRefundRequests)

// ============================================
// ADMIN ROUTES
// ============================================

// ყველა refund მოთხოვნის სია
router.get('/admin/list', verifyToken, requireAdmin, getAllRefundRequests)

// Refund სტატისტიკა
router.get('/admin/stats', verifyToken, requireAdmin, getRefundStats)

// Refund მოთხოვნის დადასტურება
router.post('/admin/:id/approve', verifyToken, requireAdmin, approveRefundRequest)

// Refund მოთხოვნის უარყოფა
router.post('/admin/:id/reject', verifyToken, requireAdmin, rejectRefundRequest)

// Refund მოთხოვნის ხელით დასრულება (როცა BOG callback არ მოვიდა)
router.post('/admin/:id/complete', verifyToken, requireAdmin, completeRefundManually)

// BOG-ში refund სტატუსის შემოწმება
router.post('/admin/:id/check', verifyToken, requireAdmin, checkRefundStatus)

export default router

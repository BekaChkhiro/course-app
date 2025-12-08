import express from 'express'
import {
  initiatePayment,
  handleBOGCallback,
  checkPaymentStatus,
  enrollInCourse,
  checkEnrollment,
} from '../controllers/purchaseController'
import { requireAuth } from '../middleware/auth'

const router = express.Router()

// ==========================================
// Public Routes (არ საჭიროებს authentication-ს)
// ==========================================

/**
 * BOG Callback Endpoint
 * BOG ამ URL-ზე აგზავნის გადახდის შედეგს
 * მნიშვნელოვანი: არ უნდა მოითხოვდეს auth-ს!
 */
router.post('/callback', handleBOGCallback)

// ==========================================
// Protected Routes (საჭიროებს authentication-ს)
// ==========================================

router.use(requireAuth)

/**
 * გადახდის დაწყება
 * POST /api/purchase/initiate
 * Body: { courseId: string, promoCode?: string }
 * Response: { redirectUrl: string, orderId: string, amount: number }
 */
router.post('/initiate', initiatePayment)

/**
 * გადახდის სტატუსის შემოწმება
 * GET /api/purchase/status/:orderId
 */
router.get('/status/:orderId', checkPaymentStatus)

/**
 * უფასო კურსზე ჩარიცხვა
 * POST /api/purchase/enroll
 * Body: { courseId: string }
 */
router.post('/enroll', enrollInCourse)

/**
 * ჩარიცხვის სტატუსის შემოწმება
 * GET /api/purchase/check/:courseId
 */
router.get('/check/:courseId', checkEnrollment)

export default router

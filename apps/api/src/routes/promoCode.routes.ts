import { Router } from 'express'
import { verifyToken, requireAdmin } from '../middleware/auth'
import {
  getAllPromoCodes,
  getPromoCodeById,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  togglePromoCode,
  validatePromoCode,
  getPromoCodeAnalytics,
  getPromoCodeOptions,
} from '../controllers/promoCodeController'

const router = Router()

// ============================================
// PUBLIC / STUDENT ROUTES
// ============================================

// პრომო კოდის ვალიდაცია (checkout-ისთვის)
router.post('/validate', verifyToken, validatePromoCode)

// ============================================
// ADMIN ROUTES
// ============================================

// კურსებისა და კატეგორიების სია (ფორმის დროფდაუნისთვის)
router.get('/admin/options', verifyToken, requireAdmin, getPromoCodeOptions)

// ანალიტიკა
router.get('/admin/analytics', verifyToken, requireAdmin, getPromoCodeAnalytics)

// ყველა პრომო კოდის სია
router.get('/admin', verifyToken, requireAdmin, getAllPromoCodes)

// ერთი პრომო კოდის დეტალები
router.get('/admin/:id', verifyToken, requireAdmin, getPromoCodeById)

// ახალი პრომო კოდის შექმნა
router.post('/admin', verifyToken, requireAdmin, createPromoCode)

// პრომო კოდის რედაქტირება
router.put('/admin/:id', verifyToken, requireAdmin, updatePromoCode)

// პრომო კოდის წაშლა
router.delete('/admin/:id', verifyToken, requireAdmin, deletePromoCode)

// პრომო კოდის ჩართვა/გამორთვა
router.patch('/admin/:id/toggle', verifyToken, requireAdmin, togglePromoCode)

export default router

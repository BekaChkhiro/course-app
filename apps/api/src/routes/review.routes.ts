import express from 'express';
import {
  // Student endpoints
  canReview,
  createReview,
  updateReview,
  deleteReview,
  getReviews,
  getCourseReviewStats,
  voteReview,
  removeVote,
  getUserReviews,
  // Admin endpoints
  getPendingReviews,
  approveReview,
  rejectReview,
  flagReview,
  bulkModerateReviews,
  addAdminResponse,
  deleteAdminResponse,
  getReviewAnalytics,
  getAllReviews,
} from '../controllers/review.controller';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = express.Router();

// ==========================================
// PUBLIC ROUTES (Course page reviews)
// ==========================================

// Get reviews for a course (public, approved only)
router.get('/courses/:courseId/reviews', getReviews);

// Get course review statistics (public)
router.get('/courses/:courseId/reviews/stats', getCourseReviewStats);

// ==========================================
// STUDENT ROUTES
// ==========================================

// Check if user can review a course
router.get('/courses/:courseId/can-review', requireAuth, canReview);

// Create a review for a course
router.post('/courses/:courseId/reviews', requireAuth, createReview);

// Update own review
router.put('/reviews/:reviewId', requireAuth, updateReview);

// Delete own review
router.delete('/reviews/:reviewId', requireAuth, deleteReview);

// Vote on a review (helpful/not helpful)
router.post('/reviews/:reviewId/vote', requireAuth, voteReview);

// Remove vote from a review
router.delete('/reviews/:reviewId/vote', requireAuth, removeVote);

// Get current user's reviews
router.get('/my-reviews', requireAuth, getUserReviews);

// ==========================================
// ADMIN ROUTES
// ==========================================

// Get all reviews with filters (admin)
router.get('/admin/reviews', requireAuth, requireAdmin, getAllReviews);

// Get pending reviews for moderation
router.get('/admin/reviews/pending', requireAuth, requireAdmin, getPendingReviews);

// Get review analytics
router.get('/admin/reviews/analytics', requireAuth, requireAdmin, getReviewAnalytics);

// Approve a review
router.post('/admin/reviews/:reviewId/approve', requireAuth, requireAdmin, approveReview);

// Reject a review
router.post('/admin/reviews/:reviewId/reject', requireAuth, requireAdmin, rejectReview);

// Flag a review
router.post('/admin/reviews/:reviewId/flag', requireAuth, requireAdmin, flagReview);

// Bulk moderate reviews
router.post('/admin/reviews/bulk-moderate', requireAuth, requireAdmin, bulkModerateReviews);

// Add admin response to a review
router.post('/admin/reviews/:reviewId/response', requireAuth, requireAdmin, addAdminResponse);

// Delete admin response
router.delete('/admin/reviews/:reviewId/response', requireAuth, requireAdmin, deleteAdminResponse);

export default router;

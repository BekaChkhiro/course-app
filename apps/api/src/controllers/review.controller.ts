import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ReviewService } from '../services/review.service';
import { EmailService } from '../services/emailService';
import { ReviewStatus } from '@prisma/client';

// ==========================================
// STUDENT ENDPOINTS
// ==========================================

/**
 * Check if user can review a course
 */
export const canReview = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { courseId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await ReviewService.canUserReview(userId, courseId);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error checking review eligibility:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create a new review
 */
export const createReview = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { courseId } = req.params;
    const { rating, title, comment } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const review = await ReviewService.createReview({
      userId,
      courseId,
      rating,
      title,
      comment,
    });

    return res.status(201).json({
      success: true,
      data: review,
      message: review.status === ReviewStatus.APPROVED
        ? 'Review published successfully'
        : 'Review submitted and pending approval',
    });
  } catch (error: any) {
    console.error('Error creating review:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Update an existing review
 */
export const updateReview = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { reviewId } = req.params;
    const { rating, title, comment } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const review = await ReviewService.updateReview(reviewId, userId, {
      rating,
      title,
      comment,
    });

    return res.json({
      success: true,
      data: review,
      message: 'Review updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating review:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Delete a review
 */
export const deleteReview = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { reviewId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    await ReviewService.deleteReview(reviewId, userId, req.user?.role === 'ADMIN');

    return res.json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting review:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Get reviews for a course (public - approved only)
 */
export const getReviews = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const {
      sortBy = 'newest',
      page = '1',
      limit = '10',
      rating,
    } = req.query;

    const result = await ReviewService.getReviews({
      courseId,
      status: ReviewStatus.APPROVED,
      sortBy: sortBy as any,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      rating: rating ? parseInt(rating as string) : undefined,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error getting reviews:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get course review statistics
 */
export const getCourseReviewStats = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;

    const stats = await ReviewService.getCourseReviewStats(courseId);

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Error getting review stats:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Vote on a review
 */
export const voteReview = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { reviewId } = req.params;
    const { isHelpful } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (typeof isHelpful !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isHelpful must be a boolean' });
    }

    await ReviewService.voteReview(reviewId, userId, isHelpful);

    return res.json({
      success: true,
      message: 'Vote recorded successfully',
    });
  } catch (error: any) {
    console.error('Error voting on review:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Remove vote from a review
 */
export const removeVote = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { reviewId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    await ReviewService.removeVote(reviewId, userId);

    return res.json({
      success: true,
      message: 'Vote removed successfully',
    });
  } catch (error: any) {
    console.error('Error removing vote:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Get current user's reviews
 */
export const getUserReviews = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { page = '1', limit = '10' } = req.query;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await ReviewService.getReviews({
      userId,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error getting user reviews:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// ADMIN ENDPOINTS
// ==========================================

/**
 * Get all reviews with filters (admin)
 */
export const getAllReviews = async (req: AuthRequest, res: Response) => {
  try {
    const {
      status,
      courseId,
      sortBy = 'newest',
      page = '1',
      limit = '20',
      minRating,
      maxRating,
    } = req.query;

    const result = await ReviewService.getReviews({
      status: status as ReviewStatus | undefined,
      courseId: courseId as string | undefined,
      sortBy: sortBy as any,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      minRating: minRating ? parseInt(minRating as string) : undefined,
      maxRating: maxRating ? parseInt(maxRating as string) : undefined,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error getting all reviews:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get pending reviews for moderation
 */
export const getPendingReviews = async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query;

    const result = await ReviewService.getPendingReviews(
      parseInt(page as string),
      parseInt(limit as string)
    );

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error getting pending reviews:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Approve a review
 */
export const approveReview = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user?.id;
    const { reviewId } = req.params;

    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const review = await ReviewService.approveReview(reviewId, adminId);

    // Send notification email to user
    if (review.user.email) {
      const shouldSend = await EmailService.shouldSendNotification(review.user.id, 'review');
      if (shouldSend) {
        await EmailService.sendReviewApprovedEmail(
          review.user.email,
          review.user.name,
          review.course.title,
          review.id,
          review.user.id
        );
      }
    }

    return res.json({
      success: true,
      data: review,
      message: 'Review approved successfully',
    });
  } catch (error: any) {
    console.error('Error approving review:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Reject a review
 */
export const rejectReview = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user?.id;
    const { reviewId } = req.params;
    const { reason } = req.body;

    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    const review = await ReviewService.rejectReview(reviewId, adminId, reason);

    // Send notification email to user
    if (review.user.email) {
      const shouldSend = await EmailService.shouldSendNotification(review.user.id, 'review');
      if (shouldSend) {
        await EmailService.sendReviewRejectedEmail(
          review.user.email,
          review.user.name,
          review.course.title,
          reason,
          review.id,
          review.user.id
        );
      }
    }

    return res.json({
      success: true,
      data: review,
      message: 'Review rejected successfully',
    });
  } catch (error: any) {
    console.error('Error rejecting review:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Flag a review for further inspection
 */
export const flagReview = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user?.id;
    const { reviewId } = req.params;
    const { reason } = req.body;

    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Flag reason is required' });
    }

    const review = await ReviewService.flagReview(reviewId, adminId, reason);

    return res.json({
      success: true,
      data: review,
      message: 'Review flagged for further inspection',
    });
  } catch (error: any) {
    console.error('Error flagging review:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Bulk moderate reviews
 */
export const bulkModerateReviews = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user?.id;
    const { reviewIds, action, reason } = req.body;

    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!reviewIds || !Array.isArray(reviewIds) || reviewIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Review IDs are required' });
    }

    if (!['approve', 'reject', 'flag'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    if ((action === 'reject' || action === 'flag') && !reason) {
      return res.status(400).json({ success: false, message: 'Reason is required for reject/flag actions' });
    }

    const result = await ReviewService.bulkModerate(reviewIds, action, adminId, reason);

    return res.json({
      success: true,
      data: result,
      message: `${result.count} reviews ${action}ed successfully`,
    });
  } catch (error: any) {
    console.error('Error bulk moderating reviews:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Add admin response to a review
 */
export const addAdminResponse = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user?.id;
    const { reviewId } = req.params;
    const { content } = req.body;

    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!content) {
      return res.status(400).json({ success: false, message: 'Response content is required' });
    }

    const response = await ReviewService.addAdminResponse(reviewId, adminId, content);

    return res.json({
      success: true,
      data: response,
      message: 'Response added successfully',
    });
  } catch (error: any) {
    console.error('Error adding admin response:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Delete admin response
 */
export const deleteAdminResponse = async (req: AuthRequest, res: Response) => {
  try {
    const { reviewId } = req.params;

    await ReviewService.deleteAdminResponse(reviewId);

    return res.json({
      success: true,
      message: 'Response deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting admin response:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Get review analytics
 */
export const getReviewAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const analytics = await ReviewService.getReviewAnalytics(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    return res.json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    console.error('Error getting review analytics:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

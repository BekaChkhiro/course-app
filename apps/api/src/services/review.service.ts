import { PrismaClient, ReviewStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateReviewInput {
  userId: string;
  courseId: string;
  rating: number;
  title?: string;
  comment?: string;
  pros?: string;
  cons?: string;
  wouldRecommend?: boolean;
  isAnonymous?: boolean;
}

interface UpdateReviewInput {
  rating?: number;
  title?: string;
  comment?: string;
  pros?: string;
  cons?: string;
  wouldRecommend?: boolean;
  isAnonymous?: boolean;
}

interface ReviewFilters {
  courseId?: string;
  userId?: string;
  status?: ReviewStatus;
  rating?: number;
  minRating?: number;
  maxRating?: number;
  sortBy?: 'newest' | 'oldest' | 'rating_high' | 'rating_low' | 'most_helpful';
  page?: number;
  limit?: number;
}

export class ReviewService {
  /**
   * Check if user can submit a review (20% completion required)
   */
  static async canUserReview(userId: string, courseId: string): Promise<{
    canReview: boolean;
    reason?: string;
    completionPercentage: number;
    hasExistingReview: boolean;
  }> {
    // Check if user has purchased the course (any completed purchase)
    const purchase = await prisma.purchase.findFirst({
      where: {
        userId,
        courseId,
        status: 'COMPLETED',
      },
    });

    if (!purchase) {
      return {
        canReview: false,
        reason: 'You must purchase this course to leave a review',
        completionPercentage: 0,
        hasExistingReview: false,
      };
    }

    // Check if user already has a review
    const existingReview = await prisma.review.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    // Calculate completion percentage
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        versions: {
          where: { isActive: true },
          include: {
            chapters: true,
          },
        },
      },
    });

    if (!course || course.versions.length === 0) {
      return {
        canReview: false,
        reason: 'Course not found',
        completionPercentage: 0,
        hasExistingReview: !!existingReview,
      };
    }

    const activeVersion = course.versions[0];
    const totalChapters = activeVersion.chapters.length;

    if (totalChapters === 0) {
      return {
        canReview: false,
        reason: 'Course has no chapters',
        completionPercentage: 0,
        hasExistingReview: !!existingReview,
      };
    }

    // Get completed chapters
    const completedProgress = await prisma.progress.count({
      where: {
        userId,
        courseVersionId: activeVersion.id,
        isCompleted: true,
      },
    });

    const completionPercentage = Math.round((completedProgress / totalChapters) * 100);

    if (completionPercentage < 20) {
      return {
        canReview: false,
        reason: `You need to complete at least 20% of the course to leave a review. Current progress: ${completionPercentage}%`,
        completionPercentage,
        hasExistingReview: !!existingReview,
      };
    }

    return {
      canReview: true,
      completionPercentage,
      hasExistingReview: !!existingReview,
    };
  }

  /**
   * Create a new review
   */
  static async createReview(input: CreateReviewInput) {
    const { userId, courseId, rating, title, comment, pros, cons, wouldRecommend, isAnonymous } = input;

    // Validate rating (1-5 stars, stored as 10-50 for half-stars)
    if (rating < 10 || rating > 50) {
      throw new Error('Rating must be between 10 and 50 (1.0 to 5.0 stars)');
    }

    // Check minimum comment length if provided
    if (comment && comment.length < 10) {
      throw new Error('Review comment must be at least 10 characters');
    }

    // Get user's completion percentage
    const canReviewResult = await this.canUserReview(userId, courseId);

    if (!canReviewResult.canReview) {
      throw new Error(canReviewResult.reason);
    }

    // Check user preferences for auto-approve
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true },
    });

    // Auto-approve verified students with good history
    const previousApprovedReviews = await prisma.review.count({
      where: {
        userId,
        status: ReviewStatus.APPROVED,
      },
    });

    const autoApprove = user?.emailVerified && previousApprovedReviews >= 2;

    const review = await prisma.review.create({
      data: {
        userId,
        courseId,
        rating,
        title,
        comment,
        pros,
        cons,
        wouldRecommend,
        isAnonymous: isAnonymous ?? false,
        completionPercentage: canReviewResult.completionPercentage,
        status: autoApprove ? ReviewStatus.APPROVED : ReviewStatus.PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            surname: true,
            avatar: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    return review;
  }

  /**
   * Update an existing review (within 30 days)
   */
  static async updateReview(reviewId: string, userId: string, input: UpdateReviewInput) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    if (review.userId !== userId) {
      throw new Error('You can only edit your own reviews');
    }

    // Check if within 30 days
    const daysSinceCreation = Math.floor(
      (Date.now() - review.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceCreation > 30) {
      throw new Error('Reviews can only be edited within 30 days of posting');
    }

    // Validate rating if provided
    if (input.rating !== undefined && (input.rating < 10 || input.rating > 50)) {
      throw new Error('Rating must be between 10 and 50 (1.0 to 5.0 stars)');
    }

    // Validate comment length if provided
    if (input.comment && input.comment.length < 10) {
      throw new Error('Review comment must be at least 10 characters');
    }

    // Reset to pending if content changed
    const contentChanged = input.comment !== undefined || input.rating !== undefined;

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        ...input,
        status: contentChanged && review.status === ReviewStatus.APPROVED
          ? ReviewStatus.PENDING
          : review.status,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            surname: true,
            avatar: true,
          },
        },
      },
    });

    return updatedReview;
  }

  /**
   * Delete a review
   */
  static async deleteReview(reviewId: string, userId: string, isAdmin: boolean = false) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    if (!isAdmin && review.userId !== userId) {
      throw new Error('You can only delete your own reviews');
    }

    await prisma.review.delete({
      where: { id: reviewId },
    });

    return { success: true };
  }

  /**
   * Get reviews with filters
   */
  static async getReviews(filters: ReviewFilters) {
    const {
      courseId,
      userId,
      status,
      rating,
      minRating,
      maxRating,
      sortBy = 'newest',
      page = 1,
      limit = 10,
    } = filters;

    const where: any = {};

    if (courseId) where.courseId = courseId;
    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (rating) where.rating = rating;
    if (minRating) where.rating = { ...where.rating, gte: minRating };
    if (maxRating) where.rating = { ...where.rating, lte: maxRating };

    // Determine sort order
    let orderBy: any = { createdAt: 'desc' };
    switch (sortBy) {
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'rating_high':
        orderBy = { rating: 'desc' };
        break;
      case 'rating_low':
        orderBy = { rating: 'asc' };
        break;
      case 'most_helpful':
        orderBy = { helpfulCount: 'desc' };
        break;
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              surname: true,
              avatar: true,
            },
          },
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
          response: {
            include: {
              admin: {
                select: {
                  id: true,
                  name: true,
                  surname: true,
                  avatar: true,
                },
              },
            },
          },
          votes: {
            select: {
              userId: true,
              isHelpful: true,
            },
          },
        },
      }),
      prisma.review.count({ where }),
    ]);

    return {
      reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get course review statistics
   */
  static async getCourseReviewStats(courseId: string) {
    const reviews = await prisma.review.findMany({
      where: {
        courseId,
        status: ReviewStatus.APPROVED,
      },
      select: {
        rating: true,
        wouldRecommend: true,
      },
    });

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        wouldRecommendPercentage: 0,
      };
    }

    // Calculate average rating (stored as x10, e.g., 45 = 4.5)
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / reviews.length / 10;

    // Calculate rating distribution
    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      const star = Math.round(r.rating / 10);
      if (star >= 1 && star <= 5) {
        ratingDistribution[star as keyof typeof ratingDistribution]++;
      }
    });

    // Calculate would recommend percentage
    const recommendReviews = reviews.filter(r => r.wouldRecommend !== null);
    const wouldRecommendCount = recommendReviews.filter(r => r.wouldRecommend).length;
    const wouldRecommendPercentage = recommendReviews.length > 0
      ? Math.round((wouldRecommendCount / recommendReviews.length) * 100)
      : 0;

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: reviews.length,
      ratingDistribution,
      wouldRecommendPercentage,
    };
  }

  /**
   * Vote on a review (helpful/not helpful)
   */
  static async voteReview(reviewId: string, userId: string, isHelpful: boolean) {
    // Check if user already voted
    const existingVote = await prisma.reviewVote.findUnique({
      where: { reviewId_userId: { reviewId, userId } },
    });

    if (existingVote) {
      // Update existing vote if different
      if (existingVote.isHelpful !== isHelpful) {
        await prisma.reviewVote.update({
          where: { id: existingVote.id },
          data: { isHelpful },
        });

        // Update review counts
        await prisma.review.update({
          where: { id: reviewId },
          data: {
            helpfulCount: { increment: isHelpful ? 1 : -1 },
            notHelpfulCount: { increment: isHelpful ? -1 : 1 },
          },
        });
      }
    } else {
      // Create new vote
      await prisma.reviewVote.create({
        data: { reviewId, userId, isHelpful },
      });

      // Update review counts
      await prisma.review.update({
        where: { id: reviewId },
        data: {
          helpfulCount: { increment: isHelpful ? 1 : 0 },
          notHelpfulCount: { increment: isHelpful ? 0 : 1 },
        },
      });
    }

    return { success: true };
  }

  /**
   * Remove vote from a review
   */
  static async removeVote(reviewId: string, userId: string) {
    const vote = await prisma.reviewVote.findUnique({
      where: { reviewId_userId: { reviewId, userId } },
    });

    if (!vote) {
      throw new Error('Vote not found');
    }

    await prisma.reviewVote.delete({
      where: { id: vote.id },
    });

    // Update review counts
    await prisma.review.update({
      where: { id: reviewId },
      data: {
        helpfulCount: { decrement: vote.isHelpful ? 1 : 0 },
        notHelpfulCount: { decrement: vote.isHelpful ? 0 : 1 },
      },
    });

    return { success: true };
  }

  // ==========================================
  // ADMIN METHODS
  // ==========================================

  /**
   * Get pending reviews for moderation
   */
  static async getPendingReviews(page: number = 1, limit: number = 20) {
    return this.getReviews({
      status: ReviewStatus.PENDING,
      page,
      limit,
      sortBy: 'oldest',
    });
  }

  /**
   * Approve a review
   */
  static async approveReview(reviewId: string, adminId: string) {
    const review = await prisma.review.update({
      where: { id: reviewId },
      data: {
        status: ReviewStatus.APPROVED,
        moderatedById: adminId,
        moderatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return review;
  }

  /**
   * Reject a review
   */
  static async rejectReview(reviewId: string, adminId: string, reason: string) {
    const review = await prisma.review.update({
      where: { id: reviewId },
      data: {
        status: ReviewStatus.REJECTED,
        moderatedById: adminId,
        moderatedAt: new Date(),
        rejectionReason: reason,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return review;
  }

  /**
   * Flag a review for further inspection
   */
  static async flagReview(reviewId: string, adminId: string, reason: string) {
    const review = await prisma.review.update({
      where: { id: reviewId },
      data: {
        status: ReviewStatus.FLAGGED,
        moderatedById: adminId,
        moderatedAt: new Date(),
        rejectionReason: reason,
      },
    });

    return review;
  }

  /**
   * Bulk moderate reviews
   */
  static async bulkModerate(
    reviewIds: string[],
    action: 'approve' | 'reject' | 'flag',
    adminId: string,
    reason?: string
  ) {
    const status = action === 'approve'
      ? ReviewStatus.APPROVED
      : action === 'reject'
        ? ReviewStatus.REJECTED
        : ReviewStatus.FLAGGED;

    await prisma.review.updateMany({
      where: { id: { in: reviewIds } },
      data: {
        status,
        moderatedById: adminId,
        moderatedAt: new Date(),
        rejectionReason: action !== 'approve' ? reason : null,
      },
    });

    return { success: true, count: reviewIds.length };
  }

  /**
   * Add admin response to a review
   */
  static async addAdminResponse(reviewId: string, adminId: string, content: string) {
    // Check if response already exists
    const existingResponse = await prisma.reviewResponse.findUnique({
      where: { reviewId },
    });

    if (existingResponse) {
      // Update existing response
      return prisma.reviewResponse.update({
        where: { reviewId },
        data: { content, adminId },
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              surname: true,
              avatar: true,
            },
          },
        },
      });
    }

    // Create new response
    return prisma.reviewResponse.create({
      data: {
        reviewId,
        adminId,
        content,
      },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            surname: true,
            avatar: true,
          },
        },
      },
    });
  }

  /**
   * Delete admin response
   */
  static async deleteAdminResponse(reviewId: string) {
    await prisma.reviewResponse.delete({
      where: { reviewId },
    });

    return { success: true };
  }

  /**
   * Get review analytics
   */
  static async getReviewAnalytics(startDate?: Date, endDate?: Date) {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    const where = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    const [total, approved, rejected, pending, flagged, avgRating, ratingDistribution, reviewsOverTime] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.count({ where: { ...where, status: ReviewStatus.APPROVED } }),
      prisma.review.count({ where: { ...where, status: ReviewStatus.REJECTED } }),
      prisma.review.count({ where: { ...where, status: ReviewStatus.PENDING } }),
      prisma.review.count({ where: { ...where, status: ReviewStatus.FLAGGED } }),
      prisma.review.aggregate({
        where: { ...where, status: ReviewStatus.APPROVED },
        _avg: { rating: true },
      }),
      // Rating distribution
      prisma.review.groupBy({
        where: { ...where, status: ReviewStatus.APPROVED },
        by: ['rating'],
        _count: true,
      }),
      // Reviews over time
      prisma.$queryRaw<any[]>`
        SELECT
          DATE(created_at) as date,
          COUNT(*) as count
        FROM reviews
        WHERE created_at >= ${startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
          AND created_at <= ${endDate || new Date()}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `
    ]);

    // Convert rating distribution to object format
    const ratingDistObj: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingDistribution.forEach(item => {
      // Rating is stored as 1-50, convert to 1-5
      const stars = Math.round(item.rating / 10);
      ratingDistObj[stars] = (ratingDistObj[stars] || 0) + item._count;
    });

    return {
      totalReviews: total,
      pendingReviews: pending,
      approvedReviews: approved,
      rejectedReviews: rejected,
      flaggedReviews: flagged,
      averageRating: avgRating._avg.rating ? avgRating._avg.rating / 10 : 0,
      ratingDistribution: ratingDistObj,
      reviewsOverTime: reviewsOverTime.map((r: any) => ({
        date: r.date,
        count: parseInt(r.count)
      })),
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
    };
  }
}

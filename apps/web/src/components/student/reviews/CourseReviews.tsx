'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApiClient } from '@/lib/api/studentApi';
import ReviewForm from './ReviewForm';

interface CourseReviewsProps {
  courseId: string;
  courseName?: string;
}

function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`${sizeClasses[size]} ${
            star <= rating ? 'text-yellow-400' : 'text-gray-300'
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function RatingDistribution({
  distribution,
  totalReviews,
}: {
  distribution: { [key: number]: number };
  totalReviews: number;
}) {
  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = distribution[star] || 0;
        const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
        return (
          <div key={star} className="flex items-center gap-2">
            <span className="text-sm text-gray-600 w-6">{star}</span>
            <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-sm text-gray-500 w-8">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function ReviewCard({
  review,
  onVote,
  currentUserId,
}: {
  review: any;
  onVote: (reviewId: string, isHelpful: boolean) => void;
  currentUserId?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isOwnReview = currentUserId === review.userId;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            {review.isAnonymous ? (
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            ) : review.user?.avatar ? (
              <img
                src={review.user.avatar}
                alt={review.user.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-sm font-medium text-gray-600">
                {review.user?.name?.charAt(0) || '?'}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">
                {review.isAnonymous ? 'Anonymous Student' : `${review.user?.name} ${review.user?.surname || ''}`}
              </span>
              {review.completionPercentage >= 100 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Completed
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <StarRating rating={review.rating} size="sm" />
              <span>•</span>
              <span>{new Date(review.createdAt).toLocaleDateString()}</span>
              {review.completionPercentage > 0 && review.completionPercentage < 100 && (
                <>
                  <span>•</span>
                  <span>{review.completionPercentage}% completed</span>
                </>
              )}
            </div>
          </div>
        </div>

        {review.wouldRecommend !== null && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
            review.wouldRecommend ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={review.wouldRecommend
                  ? "M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                  : "M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
                }
              />
            </svg>
            {review.wouldRecommend ? 'Recommends' : "Doesn't recommend"}
          </div>
        )}
      </div>

      {/* Title */}
      {review.title && (
        <h4 className="font-semibold text-gray-900 mb-2">{review.title}</h4>
      )}

      {/* Comment */}
      <p className={`text-gray-700 ${!expanded && 'line-clamp-3'}`}>{review.comment}</p>
      {review.comment?.length > 200 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-primary-900 text-sm mt-1 hover:underline"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}

      {/* Pros & Cons */}
      {(review.pros || review.cons) && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {review.pros && (
            <div className="bg-green-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-700 font-medium text-sm mb-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Pros
              </div>
              <p className="text-sm text-green-800">{review.pros}</p>
            </div>
          )}
          {review.cons && (
            <div className="bg-red-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-700 font-medium text-sm mb-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cons
              </div>
              <p className="text-sm text-red-800">{review.cons}</p>
            </div>
          )}
        </div>
      )}

      {/* Admin Response */}
      {review.response && (
        <div className="mt-4 bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-blue-700">Instructor Response</span>
            <span className="text-xs text-blue-500">
              {new Date(review.response.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="text-sm text-blue-800">{review.response.content}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {!isOwnReview && (
            <>
              <button
                onClick={() => onVote(review.id, true)}
                className={`flex items-center gap-1 text-sm ${
                  review.userVote === true
                    ? 'text-green-600 font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
                Helpful ({review.helpfulCount || 0})
              </button>
              <button
                onClick={() => onVote(review.id, false)}
                className={`flex items-center gap-1 text-sm ${
                  review.userVote === false
                    ? 'text-red-600 font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                </svg>
                Not helpful ({review.notHelpfulCount || 0})
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CourseReviews({ courseId, courseName }: CourseReviewsProps) {
  const queryClient = useQueryClient();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [sortBy, setSortBy] = useState<string>('newest');
  const [filterRating, setFilterRating] = useState<number | undefined>();

  // Check if user can review
  const { data: canReviewData } = useQuery({
    queryKey: ['canReview', courseId],
    queryFn: () => studentApiClient.canReview(courseId),
    staleTime: 60000,
  });

  // Get reviews stats
  const { data: statsData } = useQuery({
    queryKey: ['reviewStats', courseId],
    queryFn: () => studentApiClient.getCourseReviewStats(courseId),
    staleTime: 60000,
  });

  // Get reviews
  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ['courseReviews', courseId, sortBy, filterRating],
    queryFn: () =>
      studentApiClient.getCourseReviews(courseId, {
        sortBy,
        rating: filterRating,
        limit: 20,
      }),
    staleTime: 30000,
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: ({ reviewId, isHelpful }: { reviewId: string; isHelpful: boolean }) =>
      studentApiClient.voteReview(reviewId, isHelpful),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseReviews', courseId] });
    },
  });

  const canReview = canReviewData?.data;
  const stats = statsData?.data;
  const reviews = reviewsData?.data?.reviews || [];

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Average Rating */}
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <span className="text-4xl font-bold text-gray-900">
                {stats?.averageRating?.toFixed(1) || '0.0'}
              </span>
              <StarRating rating={Math.round(stats?.averageRating || 0)} size="lg" />
            </div>
            <p className="text-sm text-gray-500">
              Based on {stats?.totalReviews || 0} review{stats?.totalReviews !== 1 ? 's' : ''}
            </p>
            {stats?.wouldRecommendPercentage !== undefined && stats.totalReviews > 0 && (
              <p className="text-sm text-green-600 mt-1">
                {stats.wouldRecommendPercentage}% would recommend
              </p>
            )}
          </div>

          {/* Rating Distribution */}
          <div className="md:col-span-2">
            <RatingDistribution
              distribution={stats?.ratingDistribution || {}}
              totalReviews={stats?.totalReviews || 0}
            />
          </div>
        </div>
      </div>

      {/* Write Review Section */}
      {canReview && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {!canReview.canReview ? (
            <div className="text-center py-4">
              {canReview.hasExistingReview ? (
                <p className="text-gray-600">
                  You have already reviewed this course.
                </p>
              ) : (
                <>
                  <p className="text-gray-600 mb-2">
                    Complete at least 20% of this course to write a review
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-48 bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 bg-primary-900 rounded-full"
                        style={{ width: `${Math.min(canReview.completionPercentage, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500">
                      {canReview.completionPercentage}% / 20%
                    </span>
                  </div>
                </>
              )}
            </div>
          ) : showReviewForm ? (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Write a Review</h3>
              <ReviewForm
                courseId={courseId}
                onSuccess={() => setShowReviewForm(false)}
                onCancel={() => setShowReviewForm(false)}
              />
            </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Share your experience with this course
              </p>
              <button
                onClick={() => setShowReviewForm(true)}
                className="px-6 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
              >
                Write a Review
              </button>
            </div>
          )}
        </div>
      )}

      {/* Reviews List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Student Reviews ({stats?.totalReviews || 0})
          </h3>
          <div className="flex items-center gap-3">
            <select
              value={filterRating || ''}
              onChange={(e) => setFilterRating(e.target.value ? Number(e.target.value) : undefined)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="newest">Most Recent</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Rated</option>
              <option value="lowest">Lowest Rated</option>
              <option value="helpful">Most Helpful</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-40" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-gray-500">No reviews yet. Be the first to review!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review: any) => (
              <ReviewCard
                key={review.id}
                review={review}
                onVote={(reviewId, isHelpful) =>
                  voteMutation.mutate({ reviewId, isHelpful })
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

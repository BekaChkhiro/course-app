'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import StudentLayout from '@/components/student/StudentLayout';
import { studentApiClient } from '@/lib/api/studentApi';
import ReviewForm from '@/components/student/reviews/ReviewForm';

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-4 h-4 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function ReviewCard({
  review,
  onEdit,
  onDelete,
}: {
  review: any;
  onEdit: (review: any) => void;
  onDelete: (reviewId: string) => void;
}) {
  const statusColors: Record<string, string> = {
    APPROVED: 'bg-green-100 text-green-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    REJECTED: 'bg-red-100 text-red-700',
    FLAGGED: 'bg-orange-100 text-orange-700',
  };

  const statusLabels: Record<string, string> = {
    APPROVED: 'Published',
    PENDING: 'Pending Review',
    REJECTED: 'Rejected',
    FLAGGED: 'Under Review',
  };

  const canEdit = () => {
    const reviewDate = new Date(review.createdAt);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= 30 && review.status !== 'REJECTED';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Course Info */}
      <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center gap-4">
        <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
          {review.course?.thumbnail ? (
            <img
              src={review.course.thumbnail}
              alt={review.course.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-400 to-purple-500">
              <svg className="w-6 h-6 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/dashboard/courses/${review.course?.slug}/learn`}
            className="font-medium text-gray-900 hover:text-indigo-600 truncate block"
          >
            {review.course?.title}
          </Link>
          <p className="text-sm text-gray-500">
            {review.course?.category?.name}
          </p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[review.status] || 'bg-gray-100 text-gray-700'}`}>
          {statusLabels[review.status] || review.status}
        </span>
      </div>

      {/* Review Content */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <StarRating rating={review.rating} />
          <span className="text-sm text-gray-500">
            {new Date(review.createdAt).toLocaleDateString()}
          </span>
          {review.isAnonymous && (
            <span className="text-xs text-gray-400">• Anonymous</span>
          )}
        </div>

        {review.title && (
          <h4 className="font-semibold text-gray-900 mb-2">{review.title}</h4>
        )}

        <p className="text-gray-700 text-sm line-clamp-3">{review.comment}</p>

        {(review.pros || review.cons) && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {review.pros && (
              <div className="bg-green-50 rounded-lg p-2">
                <span className="text-xs font-medium text-green-700">Pros:</span>
                <p className="text-xs text-green-800 truncate">{review.pros}</p>
              </div>
            )}
            {review.cons && (
              <div className="bg-red-50 rounded-lg p-2">
                <span className="text-xs font-medium text-red-700">Cons:</span>
                <p className="text-xs text-red-800 truncate">{review.cons}</p>
              </div>
            )}
          </div>
        )}

        {/* Admin Response */}
        {review.response && (
          <div className="mt-3 bg-blue-50 rounded-lg p-3 border-l-4 border-blue-500">
            <span className="text-xs font-medium text-blue-700">Instructor Response:</span>
            <p className="text-sm text-blue-800 mt-1">{review.response.content}</p>
          </div>
        )}

        {/* Rejection Reason */}
        {review.status === 'REJECTED' && review.moderationNote && (
          <div className="mt-3 bg-red-50 rounded-lg p-3 border-l-4 border-red-500">
            <span className="text-xs font-medium text-red-700">Rejection Reason:</span>
            <p className="text-sm text-red-800 mt-1">{review.moderationNote}</p>
          </div>
        )}

        {/* Stats */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
              {review.helpfulCount || 0} helpful
            </span>
            {review.wouldRecommend !== null && (
              <span className={review.wouldRecommend ? 'text-green-600' : 'text-red-600'}>
                {review.wouldRecommend ? 'Recommends' : "Doesn't recommend"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canEdit() && (
              <button
                onClick={() => onEdit(review)}
                className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                Edit
              </button>
            )}
            <button
              onClick={() => onDelete(review.id)}
              className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyReviewsPage() {
  const queryClient = useQueryClient();
  const [editingReview, setEditingReview] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['myReviews'],
    queryFn: () => studentApiClient.getMyReviews({ limit: 50 }),
    staleTime: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: (reviewId: string) => studentApiClient.deleteReview(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myReviews'] });
      setDeleteConfirm(null);
    },
  });

  const reviews = data?.data?.reviews || [];

  const statsData = reviews.reduce(
    (acc: any, review: any) => {
      acc.total++;
      if (review.status === 'APPROVED') acc.published++;
      if (review.status === 'PENDING') acc.pending++;
      acc.totalRating += review.rating;
      return acc;
    },
    { total: 0, published: 0, pending: 0, totalRating: 0 }
  );

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Reviews</h1>
          <p className="text-gray-500 mt-1">Manage your course reviews</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Total Reviews</p>
            <p className="text-2xl font-bold text-gray-900">{statsData.total}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Published</p>
            <p className="text-2xl font-bold text-green-600">{statsData.published}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{statsData.pending}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Average Rating</p>
            <p className="text-2xl font-bold text-indigo-600">
              {statsData.total > 0
                ? (statsData.totalRating / statsData.total).toFixed(1)
                : '0.0'}
            </p>
          </div>
        </div>

        {/* Reviews List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-200 rounded-xl animate-pulse h-48" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 font-medium">Failed to load reviews</p>
            <p className="text-red-500 text-sm mt-1">Please try again later</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <svg
              className="w-16 h-16 text-gray-300 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No reviews yet</h3>
            <p className="text-gray-500 mb-4">
              Start reviewing courses you've taken to help other students
            </p>
            <Link
              href="/dashboard/courses"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Browse My Courses
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review: any) => (
              <ReviewCard
                key={review.id}
                review={review}
                onEdit={setEditingReview}
                onDelete={setDeleteConfirm}
              />
            ))}
          </div>
        )}

        {/* Edit Modal */}
        {editingReview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Edit Review</h3>
                  <button
                    onClick={() => setEditingReview(null)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Editing review for: {editingReview.course?.title}
                </p>
              </div>
              <div className="p-6">
                <ReviewForm
                  courseId={editingReview.courseId}
                  existingReview={{
                    id: editingReview.id,
                    rating: editingReview.rating,
                    title: editingReview.title,
                    comment: editingReview.comment,
                    pros: editingReview.pros,
                    cons: editingReview.cons,
                    wouldRecommend: editingReview.wouldRecommend,
                    isAnonymous: editingReview.isAnonymous,
                  }}
                  onSuccess={() => {
                    setEditingReview(null);
                    queryClient.invalidateQueries({ queryKey: ['myReviews'] });
                  }}
                  onCancel={() => setEditingReview(null)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Review?</h3>
                <p className="text-gray-500 mb-6">
                  This action cannot be undone. Are you sure you want to delete this review?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(deleteConfirm)}
                    disabled={deleteMutation.isPending}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Star,
  Check,
  X,
  Flag,
  MessageSquare,
  Filter,
  Search,
  ChevronDown,
  Clock,
  User,
  AlertCircle,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { reviewApi, courseApi } from '@/lib/api/adminApi';
import { PageLoader } from '@/components/ui/LoadingSpinner';

type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED';

interface Review {
  id: string;
  rating: number;
  title?: string;
  comment?: string;
  pros?: string;
  cons?: string;
  wouldRecommend?: boolean;
  isAnonymous: boolean;
  status: ReviewStatus;
  completionPercentage: number;
  helpfulCount: number;
  notHelpfulCount: number;
  createdAt: string;
  user: {
    id: string;
    name: string;
    surname: string;
    avatar?: string;
  };
  course: {
    id: string;
    title: string;
    slug: string;
  };
  response?: {
    id: string;
    content: string;
    admin: {
      name: string;
      surname: string;
    };
    createdAt: string;
  };
}

const statusColors: Record<ReviewStatus, { bg: string; text: string; label: string }> = {
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'მოლოდინში' },
  APPROVED: { bg: 'bg-green-100', text: 'text-green-800', label: 'დამტკიცებული' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-800', label: 'უარყოფილი' },
  FLAGGED: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'მონიშნული' },
};

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | ''>('');
  const [courseFilter, setCourseFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [selectedReviews, setSelectedReviews] = useState<string[]>([]);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; reviewId: string | null }>({
    open: false,
    reviewId: null,
  });
  const [rejectReason, setRejectReason] = useState('');
  const [responseModal, setResponseModal] = useState<{ open: boolean; review: Review | null }>({
    open: false,
    review: null,
  });
  const [responseContent, setResponseContent] = useState('');

  // Fetch reviews
  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ['adminReviews', statusFilter, courseFilter, sortBy, page],
    queryFn: () =>
      reviewApi
        .getAll({
          status: statusFilter || undefined,
          courseId: courseFilter || undefined,
          sortBy,
          page,
          limit: 20,
        })
        .then((res) => res.data),
  });

  // Fetch courses for filter
  const { data: coursesData } = useQuery({
    queryKey: ['courses'],
    queryFn: () => courseApi.getAll().then((res) => res.data),
  });

  // Fetch analytics
  const { data: analyticsData } = useQuery({
    queryKey: ['reviewAnalytics'],
    queryFn: () => reviewApi.getAnalytics().then((res) => res.data),
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: (reviewId: string) => reviewApi.approve(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviewAnalytics'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ reviewId, reason }: { reviewId: string; reason: string }) =>
      reviewApi.reject(reviewId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviewAnalytics'] });
      setRejectModal({ open: false, reviewId: null });
      setRejectReason('');
    },
  });

  const flagMutation = useMutation({
    mutationFn: ({ reviewId, reason }: { reviewId: string; reason: string }) =>
      reviewApi.flag(reviewId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviewAnalytics'] });
    },
  });

  const bulkModerateMutation = useMutation({
    mutationFn: ({
      reviewIds,
      action,
      reason,
    }: {
      reviewIds: string[];
      action: 'approve' | 'reject' | 'flag';
      reason?: string;
    }) => reviewApi.bulkModerate(reviewIds, action, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviewAnalytics'] });
      setSelectedReviews([]);
    },
  });

  const addResponseMutation = useMutation({
    mutationFn: ({ reviewId, content }: { reviewId: string; content: string }) =>
      reviewApi.addResponse(reviewId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReviews'] });
      setResponseModal({ open: false, review: null });
      setResponseContent('');
    },
  });

  const reviews: Review[] = reviewsData?.data?.reviews || [];
  const pagination = reviewsData?.data?.pagination || { total: 0, page: 1, totalPages: 1 };
  const courses = coursesData?.courses || [];
  const analytics = analyticsData?.data || {};

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderStars = (rating: number) => {
    const stars = rating / 10;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= stars
                ? 'text-yellow-400 fill-yellow-400'
                : star - 0.5 <= stars
                ? 'text-yellow-400 fill-yellow-400/50'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">{stars.toFixed(1)}</span>
      </div>
    );
  };

  const handleSelectAll = () => {
    if (selectedReviews.length === reviews.length) {
      setSelectedReviews([]);
    } else {
      setSelectedReviews(reviews.map((r) => r.id));
    }
  };

  const handleSelectReview = (reviewId: string) => {
    setSelectedReviews((prev) =>
      prev.includes(reviewId) ? prev.filter((id) => id !== reviewId) : [...prev, reviewId]
    );
  };

  if (isLoading) return <PageLoader />;

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">შეფასებების მართვა</h1>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-500">
            მართეთ სტუდენტების შეფასებები <span className="hidden sm:inline">კურსებისთვის</span>
          </p>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 text-gray-500">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm">სულ</span>
            </div>
            <p className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold text-gray-900">{analytics.total || 0}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 text-yellow-500">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm text-gray-500">მოლოდინში</span>
            </div>
            <p className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold text-gray-900">{analytics.pending || 0}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 text-green-500">
              <Check className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm text-gray-500">დამტკიც.</span>
            </div>
            <p className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold text-gray-900">{analytics.approved || 0}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 text-primary-500">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm text-gray-500">რეიტინგი</span>
            </div>
            <p className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold text-gray-900">
              {analytics.averageRating?.toFixed(1) || '0.0'}
            </p>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-4">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as ReviewStatus | '');
                  setPage(1);
                }}
                className="flex-1 sm:flex-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="">ყველა სტატუსი</option>
                <option value="PENDING">მოლოდინში</option>
                <option value="APPROVED">დამტკიცებული</option>
                <option value="REJECTED">უარყოფილი</option>
                <option value="FLAGGED">მონიშნული</option>
              </select>
            </div>

            {/* Course Filter */}
            <select
              value={courseFilter}
              onChange={(e) => {
                setCourseFilter(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="">ყველა კურსი</option>
              {courses.map((course: any) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="newest">ახალი პირველი</option>
              <option value="oldest">ძველი პირველი</option>
              <option value="rating_high">მაღალი რეიტინგი</option>
              <option value="rating_low">დაბალი რეიტინგი</option>
            </select>

            {/* Bulk Actions */}
            {selectedReviews.length > 0 && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:ml-auto pt-2 sm:pt-0 border-t sm:border-0">
                <span className="text-sm text-gray-500 text-center sm:text-left">
                  {selectedReviews.length} მონიშნული
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      bulkModerateMutation.mutate({
                        reviewIds: selectedReviews,
                        action: 'approve',
                      })
                    }
                    className="flex-1 sm:flex-none px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
                  >
                    <span className="hidden sm:inline">ყველას </span>დამტკიცება
                  </button>
                  <button
                    onClick={() =>
                      bulkModerateMutation.mutate({
                        reviewIds: selectedReviews,
                        action: 'reject',
                        reason: 'Bulk rejection',
                      })
                    }
                    className="flex-1 sm:flex-none px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
                  >
                    <span className="hidden sm:inline">ყველას </span>უარყოფა
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reviews List */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="border-b border-gray-200 bg-gray-50 px-4 sm:px-6 py-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <input
                type="checkbox"
                checked={selectedReviews.length === reviews.length && reviews.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 text-primary-900 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                {reviews.length} შეფასება
              </span>
            </div>
          </div>

          {/* Reviews */}
          <div className="divide-y divide-gray-200">
            {reviews.map((review) => (
              <div key={review.id} className="p-4 sm:p-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedReviews.includes(review.id)}
                    onChange={() => handleSelectReview(review.id)}
                    className="mt-1 w-4 h-4 text-primary-900 rounded flex-shrink-0"
                  />

                  {/* Avatar - Hidden on mobile */}
                  <div className="flex-shrink-0 hidden sm:block">
                    {review.user.avatar ? (
                      <img
                        src={review.user.avatar}
                        alt={review.user.name}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-900">
                          {review.isAnonymous
                            ? '?'
                            : `${review.user.name.charAt(0)}${review.user.surname.charAt(0)}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header - Mobile */}
                    <div className="sm:hidden">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {review.isAnonymous
                            ? 'ანონიმური'
                            : `${review.user.name} ${review.user.surname}`}
                        </p>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${
                            statusColors[review.status].bg
                          } ${statusColors[review.status].text}`}
                        >
                          {statusColors[review.status].label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{review.course.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {renderStars(review.rating)}
                        <span className="text-xs text-gray-400">
                          {formatDate(review.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Header - Desktop */}
                    <div className="hidden sm:block">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {review.isAnonymous
                              ? 'ანონიმური'
                              : `${review.user.name} ${review.user.surname}`}
                          </p>
                          <p className="text-sm text-gray-500">{review.course.title}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                              statusColors[review.status].bg
                            } ${statusColors[review.status].text}`}
                          >
                            {statusColors[review.status].label}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatDate(review.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Rating - Desktop */}
                      <div className="mt-2 flex items-center gap-4">
                        {renderStars(review.rating)}
                        <span className="text-sm text-gray-500">
                          {review.completionPercentage}% დასრულებული
                        </span>
                        {review.wouldRecommend !== null && (
                          <span
                            className={`text-sm ${
                              review.wouldRecommend ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {review.wouldRecommend ? 'რეკომენდაციას უწევს' : 'არ რეკომენდირდება'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title & Comment */}
                    {review.title && (
                      <h4 className="mt-2 sm:mt-3 font-medium text-gray-900 text-sm sm:text-base">{review.title}</h4>
                    )}
                    {review.comment && (
                      <p className="mt-1 text-gray-700 whitespace-pre-wrap text-sm sm:text-base">{review.comment}</p>
                    )}

                    {/* Pros & Cons */}
                    {(review.pros || review.cons) && (
                      <div className="mt-2 sm:mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                        {review.pros && (
                          <div>
                            <p className="text-xs sm:text-sm font-medium text-green-700">დადებითი:</p>
                            <p className="text-xs sm:text-sm text-gray-600">{review.pros}</p>
                          </div>
                        )}
                        {review.cons && (
                          <div>
                            <p className="text-xs sm:text-sm font-medium text-red-700">უარყოფითი:</p>
                            <p className="text-xs sm:text-sm text-gray-600">{review.cons}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Admin Response */}
                    {review.response && (
                      <div className="mt-3 sm:mt-4 bg-gray-50 rounded-lg p-3 sm:p-4 border-l-4 border-primary-500">
                        <p className="text-xs sm:text-sm font-medium text-gray-700">
                          პასუხი {review.response.admin.name}-სგან:
                        </p>
                        <p className="mt-1 text-xs sm:text-sm text-gray-600">{review.response.content}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-2">
                      {review.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => approveMutation.mutate(review.id)}
                            disabled={approveMutation.isPending}
                            className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-green-100 text-green-700 rounded-lg text-xs sm:text-sm hover:bg-green-200"
                          >
                            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="hidden xs:inline">დამტკიცება</span>
                            <span className="xs:hidden">დამტ.</span>
                          </button>
                          <button
                            onClick={() => setRejectModal({ open: true, reviewId: review.id })}
                            className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-red-100 text-red-700 rounded-lg text-xs sm:text-sm hover:bg-red-200"
                          >
                            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="hidden xs:inline">უარყოფა</span>
                            <span className="xs:hidden">უარყ.</span>
                          </button>
                          <button
                            onClick={() =>
                              flagMutation.mutate({
                                reviewId: review.id,
                                reason: 'Flagged for review',
                              })
                            }
                            className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-orange-100 text-orange-700 rounded-lg text-xs sm:text-sm hover:bg-orange-200"
                          >
                            <Flag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="hidden xs:inline">მონიშვნა</span>
                            <span className="xs:hidden">მონ.</span>
                          </button>
                        </>
                      )}
                      {!review.response && review.status === 'APPROVED' && (
                        <button
                          onClick={() => setResponseModal({ open: true, review })}
                          className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-primary-100 text-primary-800 rounded-lg text-xs sm:text-sm hover:bg-primary-100"
                        >
                          <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">პასუხის დამატება</span>
                          <span className="sm:hidden">პასუხი</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {reviews.length === 0 && (
              <div className="p-8 sm:p-12 text-center">
                <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">შეფასებები არ მოიძებნა</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="border-t border-gray-200 bg-gray-50 px-4 sm:px-6 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs sm:text-sm text-gray-500">
                  <span className="hidden sm:inline">გვერდი </span>{pagination.page}/{pagination.totalPages}
                  <span className="hidden sm:inline"> (სულ {pagination.total})</span>
                </p>
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 sm:p-2 text-gray-500 hover:bg-gray-200 rounded-lg disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                    className="p-1.5 sm:p-2 text-gray-500 hover:bg-gray-200 rounded-lg disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reject Modal */}
        {rejectModal.open && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">შეფასების უარყოფა</h3>
              <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                გთხოვთ მიუთითოთ უარყოფის მიზეზი.<span className="hidden sm:inline"> მომხმარებელი მიიღებს შეტყობინებას.</span>
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="შეიყვანეთ უარყოფის მიზეზი..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                rows={3}
              />
              <div className="mt-4 flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  onClick={() => setRejectModal({ open: false, reviewId: null })}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm w-full sm:w-auto"
                >
                  გაუქმება
                </button>
                <button
                  onClick={() => {
                    if (rejectModal.reviewId && rejectReason) {
                      rejectMutation.mutate({
                        reviewId: rejectModal.reviewId,
                        reason: rejectReason,
                      });
                    }
                  }}
                  disabled={!rejectReason || rejectMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm w-full sm:w-auto"
                >
                  უარყოფა
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Response Modal */}
        {responseModal.open && responseModal.review && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-lg w-full">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">პასუხის დამატება</h3>
              <div className="mb-3 sm:mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs sm:text-sm text-gray-600">
                  პასუხი {responseModal.review.user.name}-ის შეფასებაზე<span className="hidden sm:inline"> კურსზე</span>:{' '}
                  <strong className="block sm:inline truncate">{responseModal.review.course.title}</strong>
                </p>
              </div>
              <textarea
                value={responseContent}
                onChange={(e) => setResponseContent(e.target.value)}
                placeholder="დაწერეთ თქვენი პასუხი..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                rows={4}
              />
              <div className="mt-4 flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  onClick={() => setResponseModal({ open: false, review: null })}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm w-full sm:w-auto"
                >
                  გაუქმება
                </button>
                <button
                  onClick={() => {
                    if (responseModal.review && responseContent) {
                      addResponseMutation.mutate({
                        reviewId: responseModal.review.id,
                        content: responseContent,
                      });
                    }
                  }}
                  disabled={!responseContent || addResponseMutation.isPending}
                  className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50 text-sm w-full sm:w-auto"
                >
                  გაგზავნა
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

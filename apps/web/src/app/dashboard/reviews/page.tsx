'use client';

import { useState, useEffect } from 'react';
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
          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
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
    APPROVED: 'გამოქვეყნებული',
    PENDING: 'მოლოდინში',
    REJECTED: 'უარყოფილი',
    FLAGGED: 'გადამოწმებაში',
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
      <div className="p-3 sm:p-4 bg-gray-50 border-b border-gray-100 flex items-center gap-3 sm:gap-4">
        <div className="w-12 h-10 sm:w-16 sm:h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
          {review.course?.thumbnail ? (
            <img
              src={review.course.thumbnail}
              alt={review.course.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary-900">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/dashboard/courses/${review.course?.slug}/learn`}
            className="text-sm sm:text-base font-medium text-gray-900 hover:text-primary-900 truncate block"
          >
            {review.course?.title}
          </Link>
          <p className="text-xs sm:text-sm text-gray-500 truncate">
            {review.course?.category?.name}
          </p>
        </div>
        <span className={`flex-shrink-0 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${statusColors[review.status] || 'bg-gray-100 text-gray-700'}`}>
          {statusLabels[review.status] || review.status}
        </span>
      </div>

      {/* Review Content */}
      <div className="p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
          <StarRating rating={review.rating} />
          <span className="text-xs sm:text-sm text-gray-500">
            {new Date(review.createdAt).toLocaleDateString()}
          </span>
        </div>

        {review.title && (
          <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-1.5 sm:mb-2">{review.title}</h4>
        )}

        <p className="text-gray-700 text-xs sm:text-sm line-clamp-3">{review.comment}</p>

        {/* Admin Response */}
        {review.response && (
          <div className="mt-2 sm:mt-3 bg-blue-50 rounded-lg p-2 sm:p-3 border-l-4 border-blue-500">
            <span className="text-[10px] sm:text-xs font-medium text-blue-700">პასუხი:</span>
            <p className="text-xs sm:text-sm text-blue-800 mt-0.5 sm:mt-1">{review.response.content}</p>
          </div>
        )}

        {/* Rejection Reason */}
        {review.status === 'REJECTED' && review.moderationNote && (
          <div className="mt-2 sm:mt-3 bg-red-50 rounded-lg p-2 sm:p-3 border-l-4 border-red-500">
            <span className="text-[10px] sm:text-xs font-medium text-red-700">მიზეზი:</span>
            <p className="text-xs sm:text-sm text-red-800 mt-0.5 sm:mt-1">{review.moderationNote}</p>
          </div>
        )}

        {/* Stats & Actions */}
        <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
          <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
              {review.helpfulCount || 0}
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {canEdit() && (
              <button
                onClick={() => onEdit(review)}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-primary-900 hover:bg-primary-50 rounded-lg transition-colors"
              >
                რედაქტირება
              </button>
            )}
            <button
              onClick={() => onDelete(review.id)}
              className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              წაშლა
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Course Selection Card for Add Review Modal
function CourseSelectCard({
  course,
  onSelect,
  isChecking,
}: {
  course: any;
  onSelect: (courseId: string) => void;
  isChecking: boolean;
}) {
  return (
    <button
      onClick={() => onSelect(course.id)}
      disabled={isChecking}
      className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-left disabled:opacity-50"
    >
      <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary-900">
            <svg className="w-6 h-6 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 truncate">{course.title}</h4>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-900 rounded-full"
              style={{ width: `${course.progressPercentage || 0}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{course.progressPercentage || 0}%</span>
        </div>
      </div>
      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

export default function MyReviewsPage() {
  const queryClient = useQueryClient();
  const [editingReview, setEditingReview] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showAddReview, setShowAddReview] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [canReviewError, setCanReviewError] = useState<string | null>(null);
  const [isCheckingCanReview, setIsCheckingCanReview] = useState(false);

  // Get my reviews
  const { data, isLoading, error } = useQuery({
    queryKey: ['myReviews'],
    queryFn: () => studentApiClient.getMyReviews({ limit: 50 }),
    staleTime: 30000,
  });

  // Get my courses for adding new review
  const { data: coursesData, isLoading: isLoadingCourses } = useQuery({
    queryKey: ['myCourses'],
    queryFn: () => studentApiClient.getMyCourses(),
    staleTime: 60000,
    enabled: showAddReview,
  });

  const deleteMutation = useMutation({
    mutationFn: (reviewId: string) => studentApiClient.deleteReview(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myReviews'] });
      setDeleteConfirm(null);
    },
  });

  const reviews = data?.data?.reviews || [];
  const myCourses = coursesData?.data?.courses || [];

  // Filter out courses that already have reviews
  const reviewedCourseIds = reviews.map((r: any) => r.courseId);
  const coursesWithoutReview = myCourses.filter(
    (course: any) => !reviewedCourseIds.includes(course.id)
  );

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

  // Handle course selection - check if can review
  const handleSelectCourse = async (courseId: string) => {
    setIsCheckingCanReview(true);
    setCanReviewError(null);

    try {
      const response = await studentApiClient.canReview(courseId);
      if (response.success && response.data?.canReview) {
        const course = myCourses.find((c: any) => c.id === courseId);
        setSelectedCourse(course);
      } else {
        // Show reason why can't review
        let errorMessage = 'შეფასების დამატება შეუძლებელია';
        if (response.data?.hasExistingReview) {
          errorMessage = 'თქვენ უკვე შეაფასეთ ეს კურსი';
        } else if (response.data?.completionPercentage < 20) {
          errorMessage = `შეფასების დასამატებლად საჭიროა კურსის მინიმუმ 20% გავლა. ამჟამად გავლილია: ${response.data?.completionPercentage}%`;
        } else if (response.data?.reason) {
          errorMessage = response.data.reason;
        }
        setCanReviewError(errorMessage);
      }
    } catch (err) {
      setCanReviewError('შეცდომა შემოწმებისას');
    } finally {
      setIsCheckingCanReview(false);
    }
  };

  // Reset modal state when closing
  const handleCloseAddReview = () => {
    setShowAddReview(false);
    setSelectedCourse(null);
    setCanReviewError(null);
  };

  return (
    <StudentLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">ჩემი შეფასებები</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-0.5 sm:mt-1 truncate">მართეთ თქვენი შეფასებები</p>
          </div>
          <button
            onClick={() => setShowAddReview(true)}
            className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 bg-accent-600 text-white rounded-full sm:rounded-lg hover:bg-accent-700 transition-colors"
          >
            <svg className="w-5 h-5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">შეფასების დამატება</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500">სულ</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{statsData.total}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500">გამოქვეყნებული</p>
            <p className="text-xl sm:text-2xl font-bold text-green-600">{statsData.published}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500">მოლოდინში</p>
            <p className="text-xl sm:text-2xl font-bold text-yellow-600">{statsData.pending}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500">საშუალო</p>
            <p className="text-xl sm:text-2xl font-bold text-primary-900">
              {statsData.total > 0
                ? (statsData.totalRating / statsData.total).toFixed(1)
                : '0.0'}
            </p>
          </div>
        </div>

        {/* Reviews List */}
        {isLoading ? (
          <div className="space-y-3 sm:space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="h-14 sm:h-16 bg-gray-100" />
                <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                  <div className="h-3 sm:h-4 bg-gray-100 rounded w-1/3" />
                  <div className="h-4 sm:h-5 bg-gray-100 rounded w-full" />
                  <div className="h-3 sm:h-4 bg-gray-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-6 text-center">
            <p className="text-red-600 font-medium text-sm sm:text-base">შეფასებების ჩატვირთვა ვერ მოხერხდა</p>
            <p className="text-red-500 text-xs sm:text-sm mt-1">გთხოვთ სცადოთ მოგვიანებით</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 md:p-12 text-center">
            <svg
              className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-gray-300 mx-auto mb-3 sm:mb-4"
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
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1">შეფასებები ჯერ არ არის</h3>
            <p className="text-sm sm:text-base text-gray-500 mb-3 sm:mb-4">
              შეაფასეთ კურსები და დაეხმარეთ სხვებს
            </p>
            <button
              onClick={() => setShowAddReview(true)}
              className="inline-flex items-center px-3 sm:px-4 py-2 text-sm bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              შეფასების დამატება
            </button>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
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

        {/* Add Review Modal */}
        {showAddReview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 sm:p-4">
            <div className="bg-white rounded-t-xl sm:rounded-xl w-full sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white p-4 sm:p-6 border-b border-gray-200 z-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                    {selectedCourse ? 'შეფასების დაწერა' : 'აირჩიეთ კურსი'}
                  </h3>
                  <button
                    onClick={handleCloseAddReview}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {selectedCourse && (
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
                    {selectedCourse.title}
                  </p>
                )}
              </div>
              <div className="p-4 sm:p-6">
                {!selectedCourse ? (
                  // Course Selection Step
                  <div className="space-y-4">
                    {canReviewError && (
                      <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
                        {canReviewError}
                      </div>
                    )}

                    {isLoadingCourses ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                        ))}
                      </div>
                    ) : coursesWithoutReview.length === 0 ? (
                      <div className="text-center py-8">
                        <svg
                          className="w-12 h-12 text-gray-300 mx-auto mb-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <p className="text-gray-500">
                          {myCourses.length === 0
                            ? 'თქვენ ჯერ არ გაქვთ შეძენილი კურსები'
                            : 'ყველა კურსი უკვე შეფასებულია'}
                        </p>
                        {myCourses.length === 0 && (
                          <Link
                            href="/courses"
                            className="inline-flex items-center mt-4 text-primary-900 hover:text-primary-700"
                          >
                            კურსების ნახვა
                            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600 mb-4">
                          აირჩიეთ კურსი რომლის შეფასებაც გსურთ. შეფასების დასამატებლად საჭიროა კურსის მინიმუმ 20% გავლა.
                        </p>
                        {coursesWithoutReview.map((course: any) => (
                          <CourseSelectCard
                            key={course.id}
                            course={course}
                            onSelect={handleSelectCourse}
                            isChecking={isCheckingCanReview}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  // Review Form Step
                  <div>
                    <button
                      onClick={() => {
                        setSelectedCourse(null);
                        setCanReviewError(null);
                      }}
                      className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      სხვა კურსის არჩევა
                    </button>
                    <ReviewForm
                      courseId={selectedCourse.id}
                      onSuccess={() => {
                        handleCloseAddReview();
                        queryClient.invalidateQueries({ queryKey: ['myReviews'] });
                      }}
                      onCancel={handleCloseAddReview}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingReview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 sm:p-4">
            <div className="bg-white rounded-t-xl sm:rounded-xl w-full sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white p-4 sm:p-6 border-b border-gray-200 z-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">რედაქტირება</h3>
                  <button
                    onClick={() => setEditingReview(null)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
                  {editingReview.course?.title}
                </p>
              </div>
              <div className="p-4 sm:p-6">
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 sm:p-4">
            <div className="bg-white rounded-t-xl sm:rounded-xl w-full sm:max-w-md p-4 sm:p-6">
              <div className="text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">წავშალოთ შეფასება?</h3>
                <p className="text-sm sm:text-base text-gray-500 mb-4 sm:mb-6">
                  ეს მოქმედება შეუქცევადია
                </p>
                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 px-3 sm:px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    გაუქმება
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(deleteConfirm)}
                    disabled={deleteMutation.isPending}
                    className="flex-1 px-3 sm:px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? 'იშლება...' : 'წაშლა'}
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

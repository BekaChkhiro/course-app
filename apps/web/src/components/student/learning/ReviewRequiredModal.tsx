'use client';

import { useState } from 'react';
import { X, Star, MessageSquare, Award } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApiClient } from '@/lib/api/studentApi';

interface ReviewRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReviewSubmitted: () => void;
  courseId: string;
  courseTitle: string;
}

export default function ReviewRequiredModal({
  isOpen,
  onClose,
  onReviewSubmitted,
  courseId,
  courseTitle,
}: ReviewRequiredModalProps) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createReviewMutation = useMutation({
    mutationFn: (data: { rating: number; comment: string }) =>
      studentApiClient.createReview(courseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canReview', courseId] });
      queryClient.invalidateQueries({ queryKey: ['courseReviews', courseId] });
      onReviewSubmitted();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};
    if (rating === 0) {
      newErrors.rating = 'გთხოვთ აირჩიოთ შეფასება';
    }
    if (comment.length < 10) {
      newErrors.comment = `შეფასება უნდა იყოს მინიმუმ 10 სიმბოლო (${comment.length}/10)`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    createReviewMutation.mutate({
      rating: rating * 10, // Convert 1-5 to 10-50 for backend
      comment,
    });
  };

  const getRatingText = (r: number) => {
    switch (r) {
      case 1: return 'ცუდი';
      case 2: return 'საშუალო';
      case 3: return 'კარგი';
      case 4: return 'ძალიან კარგი';
      case 5: return 'შესანიშნავი';
      default: return 'აირჩიეთ შეფასება';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary-900 to-primary-800 p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold">შეაფასეთ კურსი</h2>
              <p className="text-white/80 text-sm">გამოცდამდე გვჭირდება თქვენი აზრი</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {/* Info Banner */}
          <div className="mb-6 p-4 bg-accent-50 border border-accent-200 rounded-xl">
            <div className="flex items-start gap-3">
              <Award className="w-6 h-6 text-accent-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-accent-900">
                  გილოცავთ! თქვენ დაასრულეთ კურსი &quot;{courseTitle}&quot;
                </p>
                <p className="text-sm text-accent-700 mt-1">
                  გამოცდის დაწყებამდე, გთხოვთ გაგვიზიაროთ თქვენი გამოცდილება ამ კურსთან დაკავშირებით.
                </p>
              </div>
            </div>
          </div>

          {/* Rating */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              როგორ შეაფასებდით ამ კურსს? <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => {
                    setRating(star);
                    if (errors.rating) {
                      setErrors((prev) => ({ ...prev, rating: '' }));
                    }
                  }}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      star <= (hoverRating || rating)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-3 text-sm text-gray-600 font-medium">
                {getRatingText(hoverRating || rating)}
              </span>
            </div>
            {errors.rating && (
              <p className="mt-2 text-sm text-red-600">{errors.rating}</p>
            )}
          </div>

          {/* Comment */}
          <div className="mb-6">
            <label
              htmlFor="review-comment"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              თქვენი შეფასება <span className="text-red-500">*</span>
            </label>
            <textarea
              id="review-comment"
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (e.target.value.length >= 10 && errors.comment) {
                  setErrors((prev) => ({ ...prev, comment: '' }));
                }
              }}
              placeholder="გაგვიზიარეთ თქვენი გამოცდილება. რა მოგეწონათ? რა შეიძლება გაუმჯობესდეს?"
              rows={4}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none ${
                errors.comment ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            <div className="flex justify-between mt-2">
              {errors.comment ? (
                <p className="text-sm text-red-600">{errors.comment}</p>
              ) : (
                <p className="text-sm text-gray-500">მინიმუმ 10 სიმბოლო</p>
              )}
              <span
                className={`text-sm ${
                  comment.length >= 10 ? 'text-green-600' : 'text-gray-400'
                }`}
              >
                {comment.length}/10
              </span>
            </div>
          </div>

          {/* Error Message */}
          {createReviewMutation.error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {(createReviewMutation.error as any).response?.data?.message ||
                'შეფასების გაგზავნა ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან.'}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              მოგვიანებით
            </button>
            <button
              onClick={handleSubmit}
              disabled={createReviewMutation.isPending}
              className="flex-1 px-4 py-3 bg-accent-600 text-white rounded-xl hover:bg-accent-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createReviewMutation.isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  იგზავნება...
                </>
              ) : (
                <>
                  <Star className="w-5 h-5" />
                  შეფასების გაგზავნა
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 text-center mt-3">
            შეფასების გაგზავნის შემდეგ შეძლებთ საფინალო გამოცდის დაწყებას
          </p>
        </div>
      </div>
    </div>
  );
}

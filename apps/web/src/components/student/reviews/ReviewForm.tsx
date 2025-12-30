'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApiClient } from '@/lib/api/studentApi';

interface ReviewFormProps {
  courseId: string;
  existingReview?: {
    id: string;
    rating: number;
    title?: string;
    comment?: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ReviewForm({
  courseId,
  existingReview,
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!existingReview;

  const [rating, setRating] = useState(existingReview?.rating ? Math.round(existingReview.rating / 10) : 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState(existingReview?.title || '');
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createReviewMutation = useMutation({
    mutationFn: (data: Parameters<typeof studentApiClient.createReview>[1]) =>
      studentApiClient.createReview(courseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseReviews', courseId] });
      queryClient.invalidateQueries({ queryKey: ['canReview', courseId] });
      onSuccess?.();
    },
  });

  const updateReviewMutation = useMutation({
    mutationFn: (data: Parameters<typeof studentApiClient.updateReview>[1]) =>
      studentApiClient.updateReview(existingReview!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseReviews', courseId] });
      queryClient.invalidateQueries({ queryKey: ['myReviews'] });
      onSuccess?.();
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

    const data = {
      rating: rating * 10, // Convert 1-5 to 10-50 for backend
      title: title || undefined,
      comment,
    };

    if (isEditing) {
      updateReviewMutation.mutate(data);
    } else {
      createReviewMutation.mutate(data);
    }
  };

  const isPending = createReviewMutation.isPending || updateReviewMutation.isPending;
  const error = createReviewMutation.error || updateReviewMutation.error;

  const getRatingText = (r: number) => {
    switch (r) {
      case 1: return '1 ვარსკვლავი';
      case 2: return '2 ვარსკვლავი';
      case 3: return '3 ვარსკვლავი';
      case 4: return '4 ვარსკვლავი';
      case 5: return '5 ვარსკვლავი';
      default: return 'აირჩიეთ შეფასება';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Rating */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          თქვენი შეფასება <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
            >
              <svg
                className={`w-8 h-8 transition-colors ${
                  star <= (hoverRating || rating)
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300'
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ))}
          <span className="ml-2 text-sm text-gray-500">
            {getRatingText(rating)}
          </span>
        </div>
        {errors.rating && <p className="mt-1 text-sm text-red-600">{errors.rating}</p>}
      </div>

      {/* Title (Optional) */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          სათაური <span className="text-gray-400">(არასავალდებულო)</span>
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="შეაჯამეთ თქვენი გამოცდილება"
          maxLength={100}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* Review Comment */}
      <div>
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
          თქვენი შეფასება <span className="text-red-500">*</span>
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            if (e.target.value.length >= 10 && errors.comment) {
              setErrors((prev) => ({ ...prev, comment: '' }));
            }
          }}
          placeholder="გაგვიზიარეთ თქვენი გამოცდილება ამ კურსთან დაკავშირებით. რა ისწავლეთ? როგორი იყო სწავლების ხარისხი?"
          rows={4}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
            errors.comment ? 'border-red-300' : 'border-gray-300'
          }`}
        />
        <div className="flex justify-between mt-1">
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
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {(error as any).response?.data?.message || 'შეფასების გაგზავნა ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან.'}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            გაუქმება
          </button>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors disabled:opacity-50 flex items-center justify-center"
        >
          {isPending ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {isEditing ? 'მიმდინარეობს განახლება...' : 'მიმდინარეობს გაგზავნა...'}
            </>
          ) : isEditing ? (
            'შეფასების განახლება'
          ) : (
            'შეფასების გაგზავნა'
          )}
        </button>
      </div>
    </form>
  );
}

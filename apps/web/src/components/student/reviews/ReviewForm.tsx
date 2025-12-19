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
    pros?: string;
    cons?: string;
    wouldRecommend?: boolean;
    isAnonymous?: boolean;
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
  const [pros, setPros] = useState(existingReview?.pros || '');
  const [cons, setCons] = useState(existingReview?.cons || '');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | undefined>(
    existingReview?.wouldRecommend
  );
  const [isAnonymous, setIsAnonymous] = useState(existingReview?.isAnonymous || false);
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
      pros: pros || undefined,
      cons: cons || undefined,
      wouldRecommend,
      isAnonymous,
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

      {/* Pros */}
      <div>
        <label htmlFor="pros" className="block text-sm font-medium text-gray-700 mb-2">
          <span className="text-green-600">დადებითი მხარეები</span>{' '}
          <span className="text-gray-400">(არასავალდებულო)</span>
        </label>
        <textarea
          id="pros"
          value={pros}
          onChange={(e) => setPros(e.target.value)}
          placeholder="რა მოგეწონათ ამ კურსში?"
          rows={2}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* Cons */}
      <div>
        <label htmlFor="cons" className="block text-sm font-medium text-gray-700 mb-2">
          <span className="text-red-600">უარყოფითი მხარეები</span>{' '}
          <span className="text-gray-400">(არასავალდებულო)</span>
        </label>
        <textarea
          id="cons"
          value={cons}
          onChange={(e) => setCons(e.target.value)}
          placeholder="რა შეიძლება გაუმჯობესდეს?"
          rows={2}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* Would Recommend */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ურჩევდით ამ კურსს სხვებს?
        </label>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setWouldRecommend(true)}
            className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
              wouldRecommend === true
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <svg
              className={`w-5 h-5 inline mr-2 ${
                wouldRecommend === true ? 'text-green-500' : 'text-gray-400'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
              />
            </svg>
            დიახ
          </button>
          <button
            type="button"
            onClick={() => setWouldRecommend(false)}
            className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
              wouldRecommend === false
                ? 'border-red-500 bg-red-50 text-red-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <svg
              className={`w-5 h-5 inline mr-2 ${
                wouldRecommend === false ? 'text-red-500' : 'text-gray-400'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
              />
            </svg>
            არა
          </button>
        </div>
      </div>

      {/* Anonymous Option */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="anonymous"
          checked={isAnonymous}
          onChange={(e) => setIsAnonymous(e.target.checked)}
          className="w-4 h-4 text-primary-900 border-gray-300 rounded focus:ring-primary-500"
        />
        <label htmlFor="anonymous" className="ml-2 text-sm text-gray-700">
          ანონიმურად გამოქვეყნება
        </label>
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

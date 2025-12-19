'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { publicApi } from '@/lib/api/publicApi';

interface BookingModalProps {
  courseId: string;
  courseTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'ორშაბათი' },
  { id: 'tuesday', label: 'სამშაბათი' },
  { id: 'wednesday', label: 'ოთხშაბათი' },
  { id: 'thursday', label: 'ხუთშაბათი' },
  { id: 'friday', label: 'პარასკევი' },
  { id: 'saturday', label: 'შაბათი' },
  { id: 'sunday', label: 'კვირა' },
];

const TIME_OPTIONS = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

export default function BookingModal({ courseId, courseTitle, isOpen, onClose }: BookingModalProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    preferredDays: [] as string[],
    preferredTimeFrom: '10:00',
    preferredTimeTo: '18:00',
    comment: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const bookingMutation = useMutation({
    mutationFn: (data: typeof formData & { courseId: string; courseTitle: string }) =>
      publicApi.submitCourseBooking(data),
    onSuccess: () => {
      setIsSuccess(true);
    },
    onError: (error: Error) => {
      setErrors({ submit: error.message || 'გაგზავნა ვერ მოხერხდა' });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim() || formData.firstName.length < 2) {
      newErrors.firstName = 'სახელი სავალდებულოა (მინ. 2 სიმბოლო)';
    }
    if (!formData.lastName.trim() || formData.lastName.length < 2) {
      newErrors.lastName = 'გვარი სავალდებულოა (მინ. 2 სიმბოლო)';
    }

    const phoneClean = formData.phone.replace(/\s/g, '');
    const phoneRegex = /^(\+995|995|0)?5\d{8}$/;
    if (!phoneRegex.test(phoneClean)) {
      newErrors.phone = 'არასწორი ტელეფონის ფორმატი (მაგ: 555123456)';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = 'არასწორი ელ-ფოსტის ფორმატი';
    }

    if (formData.preferredDays.length === 0) {
      newErrors.preferredDays = 'აირჩიეთ მინიმუმ ერთი დღე';
    }

    const fromHour = parseInt(formData.preferredTimeFrom.split(':')[0]);
    const toHour = parseInt(formData.preferredTimeTo.split(':')[0]);
    if (fromHour >= toHour) {
      newErrors.preferredTime = 'დასაწყისი დრო უნდა იყოს დასასრულზე ნაკლები';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    bookingMutation.mutate({
      ...formData,
      courseId,
      courseTitle,
    });
  };

  const handleDayToggle = (dayId: string) => {
    setFormData(prev => ({
      ...prev,
      preferredDays: prev.preferredDays.includes(dayId)
        ? prev.preferredDays.filter(d => d !== dayId)
        : [...prev.preferredDays, dayId],
    }));
  };

  const handleClose = () => {
    if (!bookingMutation.isPending) {
      setFormData({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        preferredDays: [],
        preferredTimeFrom: '10:00',
        preferredTimeTo: '18:00',
        comment: '',
      });
      setErrors({});
      setIsSuccess(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-accent-500 to-accent-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">ინდივიდუალური კურსი</h3>
              <p className="text-accent-100 text-sm truncate max-w-[200px]">{courseTitle}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={bookingMutation.isPending}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {isSuccess ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">განაცხადი გაიგზავნა!</h3>
              <p className="text-gray-600 mb-6">
                მადლობა დაინტერესებისთვის. მალე დაგიკავშირდებით.
              </p>
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors"
              >
                დახურვა
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    სახელი <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors ${
                      errors.firstName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="გიორგი"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    გვარი <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors ${
                      errors.lastName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="გიორგაძე"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-xs text-red-500">{errors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ტელეფონი <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="555 123 456"
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ელ-ფოსტა <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="example@email.com"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                )}
              </div>

              {/* Preferred Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  სასურველი დღეები <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => handleDayToggle(day.id)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        formData.preferredDays.includes(day.id)
                          ? 'bg-accent-500 text-white border-accent-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-accent-400'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                {errors.preferredDays && (
                  <p className="mt-1 text-xs text-red-500">{errors.preferredDays}</p>
                )}
              </div>

              {/* Preferred Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  სასურველი საათები
                </label>
                <div className="flex items-center space-x-2">
                  <select
                    value={formData.preferredTimeFrom}
                    onChange={(e) => setFormData(prev => ({ ...prev, preferredTimeFrom: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  >
                    {TIME_OPTIONS.map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                  <span className="text-gray-500">-</span>
                  <select
                    value={formData.preferredTimeTo}
                    onChange={(e) => setFormData(prev => ({ ...prev, preferredTimeTo: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  >
                    {TIME_OPTIONS.map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
                {errors.preferredTime && (
                  <p className="mt-1 text-xs text-red-500">{errors.preferredTime}</p>
                )}
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  დამატებითი კომენტარი
                </label>
                <textarea
                  value={formData.comment}
                  onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors resize-none"
                  placeholder="დაწერეთ თუ გაქვთ სპეციფიკური მოთხოვნები..."
                />
              </div>

              {/* Submit Error */}
              {errors.submit && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{errors.submit}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={bookingMutation.isPending}
                className="w-full bg-accent-500 text-white py-3 rounded-xl font-medium hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {bookingMutation.isPending ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>იგზავნება...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span>გაგზავნა</span>
                  </>
                )}
              </button>

              {/* Privacy Note */}
              <p className="text-xs text-gray-500 text-center">
                გაგზავნით თქვენ ეთანხმებით თქვენი მონაცემების დამუშავებას
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

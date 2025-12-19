'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { studentApiClient } from '@/lib/api/studentApi';

interface MessageComposerProps {
  preSelectedCourseId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function MessageComposer({
  preSelectedCourseId,
  onSuccess,
  onCancel,
}: MessageComposerProps) {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [courseId, setCourseId] = useState(preSelectedCourseId || '');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch user's courses for the dropdown
  const { data: coursesData } = useQuery({
    queryKey: ['myCourses'],
    queryFn: () => studentApiClient.getMyCourses({ limit: 100 }),
    staleTime: 60000,
  });

  const sendMutation = useMutation({
    mutationFn: (data: Parameters<typeof studentApiClient.sendMessage>[0]) =>
      studentApiClient.sendMessage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myMessages'] });
      onSuccess?.();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};
    if (!subject.trim()) {
      newErrors.subject = 'სათაური სავალდებულოა';
    }
    if (!content.trim()) {
      newErrors.content = 'შეტყობინება სავალდებულოა';
    } else if (content.trim().length < 10) {
      newErrors.content = 'შეტყობინება უნდა იყოს მინიმუმ 10 სიმბოლო';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    sendMutation.mutate({
      subject: subject.trim(),
      content: content.trim(),
      courseId: courseId || undefined,
      priority,
    });
  };

  const priorityOptions = [
    { value: 'LOW', label: 'დაბალი', description: 'ზოგადი შეკითხვა' },
    { value: 'MEDIUM', label: 'საშუალო', description: 'სტანდარტული მოთხოვნა' },
    { value: 'HIGH', label: 'მაღალი', description: 'სჭირდება ყურადღება' },
    { value: 'URGENT', label: 'სასწრაფო', description: 'კრიტიკული პრობლემა' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Subject */}
      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
          სათაური <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="subject"
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            if (e.target.value.trim() && errors.subject) {
              setErrors((prev) => ({ ...prev, subject: '' }));
            }
          }}
          placeholder="თქვენი შეკითხვის ან პრობლემის მოკლე აღწერა"
          maxLength={200}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
            errors.subject ? 'border-red-300' : 'border-gray-300'
          }`}
        />
        {errors.subject && (
          <p className="mt-1 text-sm text-red-600">{errors.subject}</p>
        )}
      </div>

      {/* Related Course (Optional) */}
      <div>
        <label htmlFor="course" className="block text-sm font-medium text-gray-700 mb-2">
          დაკავშირებული კურსი <span className="text-gray-400">(არასავალდებულო)</span>
        </label>
        <select
          id="course"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
        >
          <option value="">კურსის გარეშე</option>
          {coursesData?.data.courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-gray-500">
          კურსის არჩევა დაგვეხმარება თქვენი შეტყობინების სწორად მიწოდებაში
        </p>
      </div>

      {/* Priority */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          პრიორიტეტი
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {priorityOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPriority(option.value as any)}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${
                priority === option.value
                  ? option.value === 'URGENT'
                    ? 'border-red-500 bg-red-50'
                    : option.value === 'HIGH'
                    ? 'border-orange-500 bg-orange-50'
                    : option.value === 'MEDIUM'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-500 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className={`text-sm font-medium ${
                priority === option.value
                  ? option.value === 'URGENT'
                    ? 'text-red-700'
                    : option.value === 'HIGH'
                    ? 'text-orange-700'
                    : option.value === 'MEDIUM'
                    ? 'text-blue-700'
                    : 'text-gray-700'
                  : 'text-gray-700'
              }`}>
                {option.label}
              </span>
              <span className="block text-xs text-gray-500 mt-0.5">
                {option.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Message Content */}
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
          შეტყობინება <span className="text-red-500">*</span>
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            if (e.target.value.trim().length >= 10 && errors.content) {
              setErrors((prev) => ({ ...prev, content: '' }));
            }
          }}
          placeholder="დეტალურად აღწერეთ თქვენი შეკითხვა, პრობლემა ან უკუკავშირი..."
          rows={6}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
            errors.content ? 'border-red-300' : 'border-gray-300'
          }`}
        />
        {errors.content ? (
          <p className="mt-1 text-sm text-red-600">{errors.content}</p>
        ) : (
          <p className="mt-1 text-sm text-gray-500">
            გთხოვთ მოგვაწოდოთ რაც შეიძლება მეტი დეტალი, რათა სწრაფად დაგეხმაროთ
          </p>
        )}
      </div>

      {/* Error Message */}
      {sendMutation.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {(sendMutation.error as any).response?.data?.message || 'შეტყობინების გაგზავნა ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან.'}
        </div>
      )}

      {/* Success Message */}
      {sendMutation.isSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          თქვენი შეტყობინება წარმატებით გაიგზავნა! რაც შეიძლება მალე გიპასუხებთ.
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={sendMutation.isPending}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            გაუქმება
          </button>
        )}
        <button
          type="submit"
          disabled={sendMutation.isPending || sendMutation.isSuccess}
          className="flex-1 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors disabled:opacity-50 flex items-center justify-center"
        >
          {sendMutation.isPending ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              იგზავნება...
            </>
          ) : sendMutation.isSuccess ? (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              გაგზავნილია!
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              გაგზავნა
            </>
          )}
        </button>
      </div>
    </form>
  );
}

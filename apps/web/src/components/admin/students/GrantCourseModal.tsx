'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Gift, BookOpen, Loader2 } from 'lucide-react';
import { studentsApi } from '@/lib/api/adminApi';

interface Course {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  price: string;
  versions: {
    id: string;
    version: string;
    title: string;
  }[];
}

interface GrantCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
}

export default function GrantCourseModal({
  isOpen,
  onClose,
  studentId,
  studentName,
}: GrantCourseModalProps) {
  const queryClient = useQueryClient();
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [note, setNote] = useState<string>('');

  // Fetch available courses
  const { data: coursesData, isLoading: coursesLoading } = useQuery({
    queryKey: ['availableCourses', studentId],
    queryFn: () => studentsApi.getAvailableCourses(studentId).then((res) => res.data),
    enabled: isOpen && !!studentId,
  });

  const courses: Course[] = coursesData?.data || [];

  // Get selected course details
  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  // Reset version when course changes
  useEffect(() => {
    if (selectedCourse && selectedCourse.versions.length > 0) {
      setSelectedVersionId(selectedCourse.versions[0].id);
    } else {
      setSelectedVersionId('');
    }
  }, [selectedCourseId, selectedCourse]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedCourseId('');
      setSelectedVersionId('');
      setNote('');
    }
  }, [isOpen]);

  // Grant course mutation
  const grantMutation = useMutation({
    mutationFn: () =>
      studentsApi.grantCourse(studentId, {
        courseId: selectedCourseId,
        versionId: selectedVersionId || undefined,
        note: note || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', studentId] });
      queryClient.invalidateQueries({ queryKey: ['availableCourses', studentId] });
      onClose();
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Gift className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">კურსის გააქტიურება</h3>
              <p className="text-sm text-gray-500">{studentName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Course Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              აირჩიეთ კურსი *
            </label>
            {coursesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-gray-300 rounded-lg">
                <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  ყველა კურსი უკვე გააქტიურებულია ამ სტუდენტისთვის
                </p>
              </div>
            ) : (
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="">-- აირჩიეთ კურსი --</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title} ({Number(course.price).toFixed(2)} ₾)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Selected Course Preview */}
          {selectedCourse && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex gap-3">
                {selectedCourse.thumbnail ? (
                  <img
                    src={selectedCourse.thumbnail}
                    alt={selectedCourse.title}
                    className="w-16 h-12 rounded object-cover"
                  />
                ) : (
                  <div className="w-16 h-12 rounded bg-gray-200 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{selectedCourse.title}</p>
                  <p className="text-sm text-gray-500">ფასი: {Number(selectedCourse.price).toFixed(2)} ₾</p>
                </div>
              </div>
            </div>
          )}

          {/* Version Selection (if multiple versions) */}
          {selectedCourse && selectedCourse.versions.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ვერსია
              </label>
              <select
                value={selectedVersionId}
                onChange={(e) => setSelectedVersionId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              >
                {selectedCourse.versions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.title || `ვერსია ${version.version}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              შენიშვნა (არასავალდებულო)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="მაგ: პრომო აქციის ფარგლებში გადაეცა..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              rows={2}
            />
            <p className="mt-1 text-xs text-gray-400">
              შენიშვნა შეინახება სისტემაში და გამოჩნდება activity log-ში
            </p>
          </div>

          {/* Info Box */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>შენიშვნა:</strong> კურსის გააქტიურების შემდეგ სტუდენტს მიუვა
              email შეტყობინება და შეძლებს კურსის გავლას.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
          >
            გაუქმება
          </button>
          <button
            onClick={() => grantMutation.mutate()}
            disabled={!selectedCourseId || grantMutation.isPending}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm inline-flex items-center justify-center gap-2"
          >
            {grantMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                მუშავდება...
              </>
            ) : (
              <>
                <Gift className="w-4 h-4" />
                გააქტიურება
              </>
            )}
          </button>
        </div>

        {/* Error Message */}
        {grantMutation.isError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              {(grantMutation.error as any)?.response?.data?.message || 'შეცდომა მოხდა'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

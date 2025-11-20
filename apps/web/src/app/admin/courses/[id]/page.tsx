'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { courseApi } from '@/lib/api/adminApi';
import toast from 'react-hot-toast';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import CourseVersionsTab from '@/components/admin/course-detail/CourseVersionsTab';
import CourseChaptersTab from '@/components/admin/course-detail/CourseChaptersTab';
import CourseInfoTab from '@/components/admin/course-detail/CourseInfoTab';

type Tab = 'info' | 'versions' | 'chapters';

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.id as string;
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');

  const queryClient = useQueryClient();

  const { data: courseData, isLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => courseApi.getById(courseId).then(res => res.data),
    enabled: !!courseId
  });

  if (isLoading) return <PageLoader />;
  if (!courseData) return <div>Course not found</div>;

  const course = courseData.course;

  const tabs = [
    { id: 'info' as Tab, label: 'ზოგადი ინფორმაცია', icon: '📝' },
    { id: 'versions' as Tab, label: 'ვერსიები', icon: '🔄', count: course.versions?.length },
    { id: 'chapters' as Tab, label: 'თავები', icon: '📚' }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/courses"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
              <p className="mt-1 text-sm text-gray-500">კურსის მართვა</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative py-4 px-1 font-medium text-sm transition-colors
                  ${activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                <span className="flex items-center gap-2">
                  <span>{tab.icon}</span>
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="px-2 py-0.5 text-xs bg-gray-100 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg border p-6">
          {activeTab === 'info' && <CourseInfoTab course={course} />}

          {activeTab === 'versions' && (
            <CourseVersionsTab
              courseId={courseId}
              onVersionSelect={(versionId) => {
                setSelectedVersionId(versionId);
                setActiveTab('chapters');
              }}
            />
          )}

          {activeTab === 'chapters' && (
            <CourseChaptersTab
              courseId={courseId}
              selectedVersionId={selectedVersionId}
              onVersionChange={setSelectedVersionId}
            />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileText, GitBranch, BookOpen, Trophy } from 'lucide-react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { courseApi, versionApi } from '@/lib/api/adminApi';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import CourseVersionsTab from '@/components/admin/course-detail/CourseVersionsTab';
import CourseInfoTab from '@/components/admin/course-detail/CourseInfoTab';
import CourseChaptersTab from '@/components/admin/course-detail/CourseChaptersTab';
import FinalExamTab from '@/components/admin/version-detail/FinalExamTab';
import VersionSelector from '@/components/admin/course-detail/VersionSelector';

type Tab = 'info' | 'chapters' | 'versions' | 'finalExam';

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');

  const { data: courseData, isLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => courseApi.getById(courseId).then(res => res.data),
    enabled: !!courseId
  });

  const { data: versionsData } = useQuery({
    queryKey: ['versions', courseId],
    queryFn: () => versionApi.getByCourse(courseId).then(res => res.data),
    enabled: !!courseId
  });

  const versions = versionsData?.versions || [];

  // Auto-select active version or first version
  useEffect(() => {
    if (versions.length > 0 && !selectedVersionId) {
      const activeVersion = versions.find((v: any) => v.isActive);
      setSelectedVersionId(activeVersion?.id || versions[0].id);
    }
  }, [versions, selectedVersionId]);

  if (isLoading) return <PageLoader />;
  if (!courseData) return <div>კურსი ვერ მოიძებნა</div>;

  const course = courseData.course;
  const selectedVersion = versions.find((v: any) => v.id === selectedVersionId);

  const tabs = [
    { id: 'info' as Tab, label: 'ზოგადი ინფორმაცია', icon: FileText },
    { id: 'chapters' as Tab, label: 'თავები', icon: BookOpen },
    { id: 'finalExam' as Tab, label: 'საფინალო გამოცდა', icon: Trophy },
    { id: 'versions' as Tab, label: 'ვერსიები', icon: GitBranch, count: versions.length }
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
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative py-4 px-1 font-medium text-sm transition-colors
                    ${activeTab === tab.id
                      ? 'text-accent-600 border-b-2 border-accent-600'
                      : 'text-gray-500 hover:text-gray-700'
                    }
                  `}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className="px-2 py-0.5 text-xs bg-gray-100 rounded-full">
                        {tab.count}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className={activeTab === 'info' ? 'bg-gray-50 rounded-xl p-6' : 'bg-white rounded-lg border p-6'}>
          {activeTab === 'info' && <CourseInfoTab course={course} />}

          {activeTab === 'chapters' && (
            <div className="space-y-4">
              <VersionSelector
                courseId={courseId}
                versions={versions}
                selectedVersionId={selectedVersionId}
                onVersionChange={setSelectedVersionId}
              />
              {selectedVersionId && (
                <CourseChaptersTab
                  courseId={courseId}
                  selectedVersionId={selectedVersionId}
                  versionStatus={selectedVersion?.status}
                />
              )}
            </div>
          )}

          {activeTab === 'finalExam' && (
            <div className="space-y-4">
              <VersionSelector
                courseId={courseId}
                versions={versions}
                selectedVersionId={selectedVersionId}
                onVersionChange={setSelectedVersionId}
              />
              {selectedVersionId && (
                <FinalExamTab
                  courseId={courseId}
                  versionId={selectedVersionId}
                />
              )}
            </div>
          )}

          {activeTab === 'versions' && (
            <CourseVersionsTab courseId={courseId} />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

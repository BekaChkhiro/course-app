'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Info, BookOpen, Trophy } from 'lucide-react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { versionApi } from '@/lib/api/adminApi';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import Badge from '@/components/ui/Badge';
import CourseChaptersTab from '@/components/admin/course-detail/CourseChaptersTab';
import VersionInfoTab from '@/components/admin/version-detail/VersionInfoTab';
import FinalExamTab from '@/components/admin/version-detail/FinalExamTab';

type Tab = 'info' | 'chapters' | 'finalExam';

export default function VersionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const versionId = params.versionId as string;
  const [activeTab, setActiveTab] = useState<Tab>('info');

  const { data: versionData, isLoading } = useQuery({
    queryKey: ['version', versionId],
    queryFn: () => versionApi.getById(versionId).then(res => res.data),
    enabled: !!versionId
  });

  if (isLoading) return <PageLoader />;
  if (!versionData) return <div>ვერსია ვერ მოიძებნა</div>;

  const version = versionData.version;

  const tabs = [
    { id: 'info' as Tab, label: 'ვერსიის ინფორმაცია', icon: Info },
    { id: 'chapters' as Tab, label: 'თავები', icon: BookOpen, count: version.chapters?.length || 0 },
    { id: 'finalExam' as Tab, label: 'საფინალო გამოცდა', icon: Trophy }
  ];

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <Link
            href={`/admin/courses/${courseId}`}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 mt-0.5 sm:mt-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">
                v{version.version}: {version.title}
              </h1>
              {version.isActive && (
                <Badge variant="success">აქტიური</Badge>
              )}
            </div>
            <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-500 truncate">
              {version.course.title}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 -mx-4 px-4 sm:mx-0 sm:px-0">
          <nav className="flex gap-1 sm:gap-6 overflow-x-auto scrollbar-hide pb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative py-3 sm:py-4 px-3 sm:px-1 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap flex-shrink-0
                    ${activeTab === tab.id
                      ? 'text-accent-600 border-b-2 border-accent-600'
                      : 'text-gray-500 hover:text-gray-700'
                    }
                  `}
                >
                  <span className="flex items-center gap-1.5 sm:gap-2">
                    <Icon className="w-4 h-4" />
                    <span className="hidden xs:inline">{tab.label}</span>
                    <span className="xs:hidden">
                      {tab.id === 'info' ? 'ინფო' :
                       tab.id === 'chapters' ? 'თავები' : 'გამოცდა'}
                    </span>
                    {tab.count !== undefined && (
                      <span className="px-1.5 sm:px-2 py-0.5 text-xs bg-gray-100 rounded-full">
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
        <div className="bg-white rounded-lg border p-4 sm:p-6">
          {activeTab === 'info' && (
            <VersionInfoTab version={version} courseId={courseId} />
          )}

          {activeTab === 'chapters' && (
            <CourseChaptersTab
              courseId={courseId}
              selectedVersionId={versionId}
            />
          )}

          {activeTab === 'finalExam' && (
            <FinalExamTab
              courseId={courseId}
              versionId={versionId}
            />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Info, BookOpen } from 'lucide-react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { versionApi } from '@/lib/api/adminApi';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import Badge from '@/components/ui/Badge';
import CourseChaptersTab from '@/components/admin/course-detail/CourseChaptersTab';
import VersionInfoTab from '@/components/admin/version-detail/VersionInfoTab';

type Tab = 'info' | 'chapters';

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
    { id: 'chapters' as Tab, label: 'თავები', icon: BookOpen, count: version.chapters?.length || 0 }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/admin/courses/${courseId}`}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">
                  Version {version.version}: {version.title}
                </h1>
                {version.isActive && (
                  <Badge variant="success">აქტიური</Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {version.course.title}
              </p>
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
                      ? 'text-blue-600 border-b-2 border-blue-600'
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
        <div className="bg-white rounded-lg border p-6">
          {activeTab === 'info' && (
            <VersionInfoTab version={version} courseId={courseId} />
          )}

          {activeTab === 'chapters' && (
            <CourseChaptersTab
              courseId={courseId}
              selectedVersionId={versionId}
              onVersionChange={() => {}} // Not needed here since we're already on a specific version
            />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

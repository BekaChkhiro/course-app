'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  FileText,
  Loader2,
  Edit,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { pageContentApi } from '@/lib/api/adminApi';

const PAGE_LABELS: Record<string, string> = {
  about: 'ჩვენ შესახებ',
  contact: 'კონტაქტი',
};

export default function PagesListPage() {
  // Fetch all pages
  const { data: pagesData, isLoading } = useQuery({
    queryKey: ['admin-pages'],
    queryFn: async () => {
      const response = await pageContentApi.getAll();
      return response.data.data;
    },
  });

  // Default pages that should exist
  const defaultPages = [
    { pageSlug: 'about', heroTitle: 'ჩვენ შესახებ', isActive: true, exists: false },
    { pageSlug: 'contact', heroTitle: 'დაგვიკავშირდი', isActive: true, exists: false },
  ];

  // Merge existing pages with defaults
  const pages = defaultPages.map((defaultPage) => {
    const existingPage = pagesData?.find((p: any) => p.pageSlug === defaultPage.pageSlug);
    if (existingPage) {
      return { ...existingPage, exists: true };
    }
    return defaultPage;
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">გვერდების მართვა</h1>
          <p className="text-gray-600 mt-1">რედაქტირეთ საიტის სტატიკური გვერდების კონტენტი</p>
        </div>

        {/* Pages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pages.map((page: any) => (
            <div
              key={page.pageSlug}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-50 rounded-lg">
                      <FileText className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {PAGE_LABELS[page.pageSlug] || page.pageSlug}
                      </h3>
                      <p className="text-sm text-gray-500">/{page.pageSlug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {page.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        აქტიური
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                        <XCircle className="w-3 h-3" />
                        არააქტიური
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">სათაური:</span>{' '}
                    {page.heroTitle || 'არ არის მითითებული'}
                  </p>
                  {page.updatedAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      ბოლო განახლება: {new Date(page.updatedAt).toLocaleDateString('ka-GE')}
                    </p>
                  )}
                </div>

                <div className="mt-4">
                  <Link
                    href={`/admin/pages/${page.pageSlug}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 focus:ring-4 focus:ring-primary-100 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    რედაქტირება
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
          <h3 className="font-semibold text-blue-900 mb-2">როგორ მუშაობს?</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• რედაქტირებისას შეცვლით Hero სექციის სათაურს და ქვესათაურს</li>
            <li>• About გვერდისთვის ასევე შეგიძლიათ შეცვალოთ მისიის ტექსტი</li>
            <li>• ცვლილებები ავტომატურად გამოჩნდება საიტზე</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}

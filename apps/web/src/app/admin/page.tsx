'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  FolderTree,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { courseApi, categoryApi } from '@/lib/api/adminApi';
import { PageLoader } from '@/components/ui/LoadingSpinner';

export default function AdminDashboard() {
  const { data: coursesData, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => courseApi.getAll().then(res => res.data)
  });

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getAll().then(res => res.data)
  });

  if (coursesLoading || categoriesLoading) return <PageLoader />;

  const courses = coursesData?.courses || [];
  const categories = categoriesData?.categories || [];

  const publishedCourses = courses.filter((c: any) => c.status === 'PUBLISHED').length;
  const draftCourses = courses.filter((c: any) => c.status === 'DRAFT').length;
  const totalEnrollments = courses.reduce((sum: number, c: any) => sum + (c._count?.purchases || 0), 0);

  const quickActions = [
    {
      title: 'კურსების მართვა',
      description: 'შექმენი, რედაქტირება და მართე კურსები',
      icon: BookOpen,
      href: '/admin/courses',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      stats: `${courses.length} კურსი`
    },
    {
      title: 'კატეგორიების მართვა',
      description: 'ორგანიზება და მართე კურსების კატეგორიები',
      icon: FolderTree,
      href: '/admin/categories',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      stats: `${categories.length} კატეგორია`
    }
  ];

  const statsCards = [
    { label: 'სულ კურსები', value: courses.length },
    { label: 'გამოქვეყნებული', value: publishedCourses },
    { label: 'დრაფტი', value: draftCourses },
    { label: 'ჩარიცხვები', value: totalEnrollments }
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">მთავარი გვერდი</h1>
          <p className="mt-1 text-sm text-gray-500">
            კეთილი იყოს თქვენი მობრძანება ადმინისტრატორის პანელში
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-lg border border-gray-200 p-6"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gray-400" />
                <h3 className="text-sm font-medium text-gray-500">{stat.label}</h3>
              </div>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">სწრაფი წვდომა</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.title}
                  href={action.href}
                  className="block bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-3 rounded-lg ${action.bgColor}`}>
                          <Icon className={`w-6 h-6 ${action.color}`} />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {action.title}
                          </h3>
                          <p className="text-sm text-gray-500">{action.stats}</p>
                        </div>
                      </div>
                      <p className="text-gray-600 mt-2">{action.description}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Courses */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">ბოლო კურსები</h2>
            <Link
              href="/admin/courses"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              ყველას ნახვა
            </Link>
          </div>
          <div className="space-y-3">
            {courses.slice(0, 5).map((course: any) => (
              <Link
                key={course.id}
                href={`/admin/courses/${course.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{course.title}</p>
                  <p className="text-sm text-gray-500">{course.category.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    course.status === 'PUBLISHED'
                      ? 'bg-green-100 text-green-800'
                      : course.status === 'DRAFT'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {course.status}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              </Link>
            ))}
            {courses.length === 0 && (
              <p className="text-center py-8 text-gray-500">
                კურსები არ არის. შექმენი პირველი კურსი!
              </p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  FolderTree,
  ArrowRight,
  TrendingUp,
  Users,
  BarChart3,
  Star
} from 'lucide-react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { courseApi, categoryApi } from '@/lib/api/adminApi';
import { useAuthStore } from '@/store/authStore';

function StatCard({
  title,
  value,
  icon,
  color,
  bgColor
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm font-medium text-gray-500">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5 sm:mt-1">{value}</p>
        </div>
        <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl ${bgColor}`}>
          <div className={`${color} [&>svg]:w-5 [&>svg]:h-5 sm:[&>svg]:w-6 sm:[&>svg]:h-6`}>{icon}</div>
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({
  title,
  description,
  icon: Icon,
  href,
  color,
  bgColor,
  stats
}: {
  title: string;
  description: string;
  icon: any;
  href: string;
  color: string;
  bgColor: string;
  stats: string;
}) {
  return (
    <Link href={href}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow group">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
              <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl ${bgColor} flex-shrink-0`}>
                <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${color}`} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{title}</h3>
                <p className="text-xs sm:text-sm text-gray-500">{stats}</p>
              </div>
            </div>
            <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2 line-clamp-2">{description}</p>
          </div>
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-primary-900 transition-colors flex-shrink-0 ml-2" />
        </div>
      </div>
    </Link>
  );
}

function RecentCourseCard({ course }: { course: any }) {
  return (
    <Link href={`/admin/courses/${course.id}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 rounded-xl hover:bg-gray-50 transition-colors group">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary-900 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{course.title}</p>
            <p className="text-xs sm:text-sm text-gray-500 truncate">{course.category?.name}</p>
          </div>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 mt-2 sm:mt-0 ml-13 sm:ml-0">
          <span className={`px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-medium rounded-full ${
            course.status === 'PUBLISHED'
              ? 'bg-green-100 text-green-700'
              : course.status === 'DRAFT'
              ? 'bg-gray-100 text-gray-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {course.status === 'PUBLISHED' ? 'გამოქვეყნებული' : course.status === 'DRAFT' ? 'დრაფტი' : 'დაარქივებული'}
          </span>
          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary-900 transition-colors" />
        </div>
      </div>
    </Link>
  );
}

export default function AdminDashboard() {
  const { user } = useAuthStore();

  const { data: coursesData, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => courseApi.getAll().then(res => res.data)
  });

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getAll().then(res => res.data)
  });

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
      color: 'text-accent-600',
      bgColor: 'bg-accent-100',
      stats: `${courses.length} კურსი`
    },
    {
      title: 'კატეგორიების მართვა',
      description: 'ორგანიზება და მართე კურსების კატეგორიები',
      icon: FolderTree,
      href: '/admin/categories',
      color: 'text-accent-600',
      bgColor: 'bg-accent-100',
      stats: `${categories.length} კატეგორია`
    },
    {
      title: 'ანალიტიკა',
      description: 'შემოსავლები, სტუდენტები და სტატისტიკა',
      icon: BarChart3,
      href: '/admin/analytics',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      stats: 'რეპორტები'
    },
    {
      title: 'შეფასებები',
      description: 'მართე სტუდენტების შეფასებები',
      icon: Star,
      href: '/admin/reviews',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      stats: 'რეიტინგები'
    }
  ];

  if (coursesLoading || categoriesLoading) {
    return (
      <AdminLayout>
        <div className="space-y-4 sm:space-y-6 animate-pulse">
          <div className="h-24 sm:h-28 md:h-32 bg-gray-200 rounded-xl sm:rounded-2xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 sm:h-24 md:h-28 bg-gray-200 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 sm:h-28 md:h-32 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        {/* Welcome Section */}
        <div className="bg-primary-900 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
                გამარჯობა, {user?.name}!
              </h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-primary-100">
                კეთილი იყოს შენი მობრძანება ადმინისტრატორის პანელში
              </p>
            </div>
            <Link
              href="/admin/courses"
              className="inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 bg-white text-primary-900 text-sm sm:text-base font-medium rounded-lg hover:bg-primary-50 transition-colors w-full sm:w-auto"
            >
              კურსების მართვა
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <StatCard
            title="სულ კურსები"
            value={courses.length}
            icon={<BookOpen className="w-6 h-6" />}
            color="text-primary-900"
            bgColor="bg-primary-100"
          />
          <StatCard
            title="გამოქვეყნებული"
            value={publishedCourses}
            icon={<TrendingUp className="w-6 h-6" />}
            color="text-green-600"
            bgColor="bg-green-100"
          />
          <StatCard
            title="დრაფტი"
            value={draftCourses}
            icon={<FolderTree className="w-6 h-6" />}
            color="text-yellow-600"
            bgColor="bg-yellow-100"
          />
          <StatCard
            title="ჩარიცხვები"
            value={totalEnrollments}
            icon={<Users className="w-6 h-6" />}
            color="text-accent-600"
            bgColor="bg-accent-100"
          />
        </div>

        {/* Quick Actions */}
        <div>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">სწრაფი წვდომა</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {quickActions.map((action) => (
              <QuickActionCard key={action.title} {...action} />
            ))}
          </div>
        </div>

        {/* Recent Courses */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">ბოლო კურსები</h2>
            <Link
              href="/admin/courses"
              className="text-xs sm:text-sm text-primary-900 hover:text-primary-800 font-medium"
            >
              ყველას ნახვა
            </Link>
          </div>
          {courses.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {courses.slice(0, 5).map((course: any) => (
                <RecentCourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1">კურსები არ არის</h3>
              <p className="text-sm sm:text-base text-gray-500 mb-3 sm:mb-4">შექმენი პირველი კურსი!</p>
              <Link
                href="/admin/courses"
                className="inline-flex items-center px-4 py-2 bg-accent-600 text-white text-sm rounded-lg hover:bg-accent-700 transition-colors"
              >
                კურსის დამატება
              </Link>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

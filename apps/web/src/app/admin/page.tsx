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
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${bgColor}`}>
          <div className={color}>{icon}</div>
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow group">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-3 rounded-xl ${bgColor}`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500">{stats}</p>
              </div>
            </div>
            <p className="text-gray-600 mt-2">{description}</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
        </div>
      </div>
    </Link>
  );
}

function RecentCourseCard({ course }: { course: any }) {
  return (
    <Link href={`/admin/courses/${course.id}`}>
      <div className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-colors group">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{course.title}</p>
            <p className="text-sm text-gray-500">{course.category?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
            course.status === 'PUBLISHED'
              ? 'bg-green-100 text-green-700'
              : course.status === 'DRAFT'
              ? 'bg-gray-100 text-gray-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {course.status === 'PUBLISHED' ? 'გამოქვეყნებული' : course.status === 'DRAFT' ? 'დრაფტი' : 'დაარქივებული'}
          </span>
          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
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
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      stats: `${courses.length} კურსი`
    },
    {
      title: 'კატეგორიების მართვა',
      description: 'ორგანიზება და მართე კურსების კატეგორიები',
      icon: FolderTree,
      href: '/admin/categories',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
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
        <div className="space-y-6 animate-pulse">
          <div className="h-32 bg-gray-200 rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-gray-200 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                გამარჯობა, {user?.name}!
              </h1>
              <p className="mt-2 text-indigo-100">
                კეთილი იყოს შენი მობრძანება ადმინისტრატორის პანელში
              </p>
            </div>
            <Link
              href="/admin/courses"
              className="mt-4 md:mt-0 inline-flex items-center px-6 py-3 bg-white text-indigo-600 font-medium rounded-lg hover:bg-indigo-50 transition-colors"
            >
              კურსების მართვა
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="სულ კურსები"
            value={courses.length}
            icon={<BookOpen className="w-6 h-6" />}
            color="text-indigo-600"
            bgColor="bg-indigo-100"
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
            color="text-blue-600"
            bgColor="bg-blue-100"
          />
        </div>

        {/* Quick Actions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">სწრაფი წვდომა</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action) => (
              <QuickActionCard key={action.title} {...action} />
            ))}
          </div>
        </div>

        {/* Recent Courses */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">ბოლო კურსები</h2>
            <Link
              href="/admin/courses"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
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
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">კურსები არ არის</h3>
              <p className="text-gray-500 mb-4">შექმენი პირველი კურსი!</p>
              <Link
                href="/admin/courses"
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
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

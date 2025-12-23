'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import StudentLayout from '@/components/student/StudentLayout';
import { studentApiClient, DashboardData } from '@/lib/api/studentApi';
import { useAuthStore } from '@/store/authStore';

function StatCard({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm font-medium text-gray-500">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5 sm:mt-1">{value}</p>
        </div>
        <div className={`p-2 sm:p-3 rounded-xl ${color}`}>{icon}</div>
      </div>
    </div>
  );
}

function ContinueLearningCard({ course }: { course: DashboardData['continueLearning'][0] }) {
  return (
    <Link href={`/dashboard/courses/${course.slug}/learn`}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
        <div className="relative h-24 sm:h-32 bg-gray-200">
          {course.thumbnail ? (
            <img
              src={course.thumbnail}
              alt={course.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary-900">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-white rounded-full p-2 sm:p-3 shadow-lg">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary-900" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        <div className="p-3 sm:p-4">
          <span className="text-[10px] sm:text-xs font-medium text-primary-900 bg-primary-50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
            {course.category}
          </span>
          <h3 className="font-semibold text-sm sm:text-base text-gray-900 mt-1.5 sm:mt-2 line-clamp-1">{course.title}</h3>
          <div className="mt-2 sm:mt-3">
            <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500 mb-1">
              <span>{course.completedChapters}/{course.totalChapters} თავი</span>
              <span>{course.progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
              <div
                className="bg-accent-600 h-1.5 sm:h-2 rounded-full transition-all duration-500"
                style={{ width: `${course.progressPercentage}%` }}
              />
            </div>
          </div>
          {course.nextChapter && (
            <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-500 line-clamp-1">
              შემდეგი: <span className="text-gray-700">{course.nextChapter.title}</span>
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: studentApiClient.getDashboard,
    staleTime: 30000,
  });

  const dashboardData = data?.data;

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="space-y-4 sm:space-y-6 animate-pulse">
          {/* Welcome skeleton */}
          <div className="h-28 sm:h-32 bg-gray-200 rounded-xl sm:rounded-2xl" />
          {/* Stats skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="h-20 sm:h-24 bg-gray-200 rounded-xl" />
            <div className="h-20 sm:h-24 bg-gray-200 rounded-xl" />
            <div className="col-span-2 sm:col-span-1 h-20 sm:h-24 bg-gray-200 rounded-xl" />
          </div>
          {/* Continue Learning skeleton */}
          <div className="space-y-3 sm:space-y-4">
            <div className="h-6 w-40 bg-gray-200 rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-56 sm:h-64 bg-gray-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (error) {
    return (
      <StudentLayout>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-6 text-center">
          <svg className="w-10 h-10 sm:w-12 sm:h-12 text-red-400 mx-auto mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-red-600 font-medium text-sm sm:text-base">მონაცემების ჩატვირთვა ვერ მოხერხდა</p>
          <p className="text-red-500 text-xs sm:text-sm mt-1">გთხოვთ, სცადოთ მოგვიანებით</p>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Welcome Section */}
        <div className="bg-primary-900 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">
                გამარჯობა, {user?.name}!
              </h1>
              <p className="mt-1 sm:mt-2 text-primary-100 text-sm sm:text-base line-clamp-2">
                {dashboardData?.continueLearning.length
                  ? "გააგრძელე იქიდან, სადაც შეჩერდი და განაგრძე პროგრესი!"
                  : "დაიწყე კურსების აღმოჩენა და შედი სასწავლო მოგზაურობაში."}
              </p>
            </div>
            <Link
              href="/dashboard/courses"
              className="flex-shrink-0 inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 bg-white text-primary-900 font-medium text-sm sm:text-base rounded-lg hover:bg-primary-50 transition-colors"
            >
              კურსების ნახვა
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <StatCard
            title="სულ კურსები"
            value={dashboardData?.stats.totalCourses || 0}
            icon={
              <svg className="w-6 h-6 text-primary-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            }
            color="bg-primary-100"
          />
          <StatCard
            title="დასრულებული"
            value={dashboardData?.stats.completedCourses || 0}
            icon={
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="bg-green-100"
          />
          <div className="col-span-2 sm:col-span-1">
            <StatCard
              title="სერტიფიკატები"
              value={dashboardData?.stats.certificates || 0}
              icon={
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              }
              color="bg-yellow-100"
            />
          </div>
        </div>

        {/* Continue Learning Section */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">სწავლის გაგრძელება</h2>
            <Link
              href="/dashboard/courses"
              className="text-xs sm:text-sm text-primary-900 hover:text-primary-800 font-medium"
            >
              ყველას ნახვა
            </Link>
          </div>
          {dashboardData?.continueLearning.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {dashboardData.continueLearning.map((course) => (
                <ContinueLearningCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 text-center">
              <svg className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1">მიმდინარე კურსები არ არის</h3>
              <p className="text-sm sm:text-base text-gray-500 mb-3 sm:mb-4">დაიწყე სწავლა დღესვე!</p>
              <Link
                href="/dashboard/courses"
                className="inline-flex items-center px-4 py-2 bg-accent-600 text-white text-sm rounded-lg hover:bg-accent-700 transition-colors"
              >
                კურსების ნახვა
              </Link>
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}

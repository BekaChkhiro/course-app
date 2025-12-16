'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import StudentLayout from '@/components/student/StudentLayout';
import { studentApiClient, MyCourse } from '@/lib/api/studentApi';

type ViewMode = 'grid' | 'list';
type FilterStatus = 'all' | 'in_progress' | 'completed' | 'not_started';
type SortOption = 'recent' | 'progress' | 'name' | 'oldest';

function CourseCard({ course, viewMode }: { course: MyCourse; viewMode: ViewMode }) {
  const statusColors = {
    completed: 'bg-green-100 text-green-700',
    in_progress: 'bg-blue-100 text-blue-700',
    not_started: 'bg-gray-100 text-gray-700',
  };

  const statusLabels = {
    completed: 'დასრულებული',
    in_progress: 'მიმდინარე',
    not_started: 'დაუწყებელი',
  };

  if (viewMode === 'list') {
    return (
      <Link href={`/dashboard/courses/${course.slug}/learn`}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow flex items-center gap-4">
          <div className="flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden bg-gray-200">
            {course.thumbnail ? (
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary-900">
                <svg className="w-8 h-8 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-primary-900 bg-primary-50 px-2 py-0.5 rounded-full">
                {course.category.name}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[course.status]}`}>
                {statusLabels[course.status]}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 truncate">{course.title}</h3>
            <p className="text-sm text-gray-500 mt-1">
              ავტორი: {course.author.name} {course.author.surname}
            </p>
          </div>
          <div className="flex-shrink-0 w-32">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
              <span>{course.completedChapters}/{course.totalChapters}</span>
              <span>{course.progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  course.progressPercentage === 100 ? 'bg-green-500' : 'bg-accent-500'
                }`}
                style={{ width: `${course.progressPercentage}%` }}
              />
            </div>
          </div>
          <div className="flex-shrink-0">
            <button className="p-2 text-accent-500 hover:bg-accent-50 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/dashboard/courses/${course.slug}/learn`}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group h-full flex flex-col">
        <div className="relative h-40 bg-gray-200">
          {course.thumbnail ? (
            <img
              src={course.thumbnail}
              alt={course.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary-900">
              <svg className="w-12 h-12 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          )}
          <div className="absolute top-3 right-3">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[course.status]}`}>
              {statusLabels[course.status]}
            </span>
          </div>
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-white rounded-full p-3 shadow-lg">
                <svg className="w-6 h-6 text-primary-900" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-primary-900 bg-primary-50 px-2 py-0.5 rounded-full">
              {course.category.name}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">{course.title}</h3>
          <p className="text-sm text-gray-500 mb-3">
            ავტორი: {course.author.name} {course.author.surname}
          </p>
          <div className="mt-auto">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
              <span>{course.completedChapters}/{course.totalChapters} თავი</span>
              <span>{course.progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  course.progressPercentage === 100 ? 'bg-green-500' : 'bg-accent-500'
                }`}
                style={{ width: `${course.progressPercentage}%` }}
              />
            </div>
          </div>
          {course.lastAccessedAt && (
            <p className="text-xs text-gray-400 mt-3">
              ბოლოს ნანახი: {new Date(course.lastAccessedAt).toLocaleDateString('ka-GE')}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function MyCoursesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [sort, setSort] = useState<SortOption>('recent');
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['myCourses', filter, sort, search],
    queryFn: () =>
      studentApiClient.getMyCourses({
        filter: filter !== 'all' ? filter : undefined,
        sort,
        search: search || undefined,
      }),
    staleTime: 30000,
  });

  const courses = data?.data.courses || [];

  const filterOptions: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: 'ყველა კურსი' },
    { value: 'in_progress', label: 'მიმდინარე' },
    { value: 'completed', label: 'დასრულებული' },
    { value: 'not_started', label: 'დაუწყებელი' },
  ];

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'recent', label: 'ბოლოს ნანახი' },
    { value: 'progress', label: 'პროგრესით' },
    { value: 'name', label: 'სახელით (ა-ჰ)' },
    { value: 'oldest', label: 'ძველი პირველი' },
  ];

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ჩემი კურსები</h1>
            <p className="text-gray-500 mt-1">
              {courses.length} კურსი თქვენს ბიბლიოთეკაში
            </p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="კურსების ძებნა..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Status Filter */}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as FilterStatus)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
              >
                {filterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {/* Sort */}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {/* View Toggle */}
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${
                    viewMode === 'grid'
                      ? 'bg-primary-50 text-primary-900'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${
                    viewMode === 'list'
                      ? 'bg-primary-50 text-primary-900'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className={`bg-gray-200 rounded-xl animate-pulse ${
                  viewMode === 'grid' ? 'h-72' : 'h-24'
                }`}
              />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 font-medium">კურსების ჩატვირთვა ვერ მოხერხდა</p>
            <p className="text-red-500 text-sm mt-1">გთხოვთ, სცადოთ მოგვიანებით</p>
          </div>
        )}

        {/* Courses Grid/List */}
        {!isLoading && !error && courses.length > 0 && (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
            }
          >
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} viewMode={viewMode} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && courses.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <svg
              className="w-16 h-16 text-gray-300 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-1">კურსები ვერ მოიძებნა</h3>
            <p className="text-gray-500 mb-4">
              {search || filter !== 'all'
                ? 'სცადეთ ძებნის ან ფილტრის შეცვლა'
                : "თქვენ ჯერ არ გაქვთ შეძენილი კურსი"}
            </p>
            {!search && filter === 'all' && (
              <Link
                href="/courses"
                className="inline-flex items-center px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors"
              >
                კურსების ნახვა
              </Link>
            )}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}

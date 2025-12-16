'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { comprehensiveAnalyticsApi } from '@/lib/api/adminApi';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  ChartContainer,
  SimpleBarChart,
  DonutChart,
  ProgressBars
} from '@/components/analytics/Charts';
import { StatCard } from '@/components/analytics/StatCards';
import {
  BookOpen,
  DollarSign,
  Users,
  Star,
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  ChevronRight,
  BarChart3,
  CheckCircle,
  XCircle
} from 'lucide-react';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

export default function CoursesAnalyticsPage() {
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  // Fetch all courses performance
  const { data: coursesData, isLoading: coursesLoading, refetch } = useQuery({
    queryKey: ['courses-performance'],
    queryFn: () => comprehensiveAnalyticsApi.getAllCoursesPerformance(),
    staleTime: 60000
  });

  // Fetch selected course details
  const { data: courseDetailData, isLoading: courseDetailLoading } = useQuery({
    queryKey: ['course-performance', selectedCourse],
    queryFn: () => comprehensiveAnalyticsApi.getCoursePerformance(selectedCourse!),
    enabled: !!selectedCourse,
    staleTime: 60000
  });

  const courses = coursesData?.data?.data || [];
  const courseDetail = courseDetailData?.data?.data;

  const isLoading = coursesLoading;

  // Calculate totals
  const totals = courses.reduce(
    (acc: any, course: any) => {
      acc.revenue += parseFloat(course.revenue) || 0;
      acc.enrollments += parseInt(course.enrollments) || 0;
      acc.reviews += parseInt(course.reviews) || 0;
      return acc;
    },
    { revenue: 0, enrollments: 0, reviews: 0 }
  );

  const avgRating =
    courses.length > 0
      ? courses.reduce((sum: number, course: any) => sum + (parseFloat(course.avgRating) || 0), 0) /
        courses.filter((c: any) => parseFloat(c.avgRating) > 0).length
      : 0;

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link href="/admin" className="hover:text-primary-900">Dashboard</Link>
              <span>/</span>
              <Link href="/admin/analytics" className="hover:text-primary-900">Analytics</Link>
              <span>/</span>
              <span>Courses</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/analytics"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Course Performance</h1>
                <p className="text-gray-500 mt-1">Analyze course enrollments, completion rates, and revenue</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="p-2 text-gray-500 hover:text-primary-900 hover:bg-primary-50 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-xl animate-pulse h-32" />
            ))}
          </div>
        ) : (
          <>
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Revenue"
                value={formatCurrency(totals.revenue)}
                icon="revenue"
                color="indigo"
              />
              <StatCard
                title="Total Enrollments"
                value={totals.enrollments}
                icon="users"
                color="blue"
              />
              <StatCard
                title="Total Courses"
                value={courses.length}
                icon="courses"
                color="green"
              />
              <StatCard
                title="Avg Rating"
                value={avgRating.toFixed(1)}
                subtitle={`${totals.reviews} total reviews`}
                icon="rating"
                color="yellow"
              />
            </div>

            {/* Course List & Detail */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Course List */}
              <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">All Courses</h3>
                  <p className="text-sm text-gray-500">Click to view details</p>
                </div>
                <div className="max-h-[600px] overflow-y-auto">
                  {courses.map((course: any) => (
                    <button
                      key={course.id}
                      onClick={() => setSelectedCourse(course.id)}
                      className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-center gap-4 ${
                        selectedCourse === course.id ? 'bg-primary-50' : ''
                      }`}
                    >
                      {course.thumbnail ? (
                        <img
                          src={course.thumbnail}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{course.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-gray-500">
                            {formatCurrency(parseFloat(course.revenue) || 0)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {course.enrollments} sales
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Course Detail */}
              <div className="lg:col-span-2">
                {selectedCourse && courseDetailLoading ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                    <div className="animate-pulse">Loading course details...</div>
                  </div>
                ) : selectedCourse && courseDetail ? (
                  <div className="space-y-6">
                    {/* Course Header */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                      <div className="flex items-start gap-4">
                        {courseDetail.course.thumbnail ? (
                          <img
                            src={courseDetail.course.thumbnail}
                            alt=""
                            className="w-24 h-24 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center">
                            <BookOpen className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h2 className="text-xl font-bold text-gray-900">{courseDetail.course.title}</h2>
                          <p className="text-gray-500 mt-1">
                            {courseDetail.course.category} | By {courseDetail.course.author}
                          </p>
                          <div className="flex items-center gap-4 mt-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              courseDetail.course.status === 'PUBLISHED'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {courseDetail.course.status}
                            </span>
                            <span className="text-sm text-gray-500">
                              {courseDetail.course.totalChapters} chapters
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Stats */}
                      <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(courseDetail.revenue.total)}
                          </p>
                          <p className="text-sm text-gray-500">Revenue</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">
                            {courseDetail.revenue.enrollments}
                          </p>
                          <p className="text-sm text-gray-500">Enrollments</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">
                            {courseDetail.ratings.average.toFixed(1)}
                          </p>
                          <p className="text-sm text-gray-500">Rating</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">
                            {courseDetail.completion?.completedStudents || 0}
                          </p>
                          <p className="text-sm text-gray-500">Completed</p>
                        </div>
                      </div>
                    </div>

                    {/* Rating Distribution & Completion */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Rating Distribution */}
                      <ChartContainer title="Rating Distribution">
                        <ProgressBars
                          data={[5, 4, 3, 2, 1].map((rating) => ({
                            name: `${rating} Stars`,
                            value: courseDetail.ratings.distribution[rating] || 0,
                            color: rating >= 4 ? '#22c55e' : rating >= 3 ? '#f59e0b' : '#ef4444'
                          }))}
                          showPercentage={false}
                        />
                      </ChartContainer>

                      {/* Completion Stats */}
                      <ChartContainer title="Completion Overview">
                        <DonutChart
                          data={[
                            { name: 'Completed', value: parseInt(courseDetail.completion?.completedStudents) || 0 },
                            { name: 'In Progress', value: (parseInt(courseDetail.completion?.enrolledStudents) || 0) - (parseInt(courseDetail.completion?.completedStudents) || 0) }
                          ]}
                          height={200}
                        />
                        <div className="mt-4 text-center">
                          <p className="text-sm text-gray-500">Completion Rate</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {courseDetail.completion?.enrolledStudents > 0
                              ? ((courseDetail.completion?.completedStudents / courseDetail.completion?.enrolledStudents) * 100).toFixed(1)
                              : 0}%
                          </p>
                        </div>
                      </ChartContainer>
                    </div>

                    {/* Chapter Drop-off Analysis */}
                    {courseDetail.chapterDropoff && courseDetail.chapterDropoff.length > 0 && (
                      <ChartContainer title="Chapter Completion Rates" subtitle="Drop-off analysis by chapter">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">#</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Chapter</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Started</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Completed</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Rate</th>
                              </tr>
                            </thead>
                            <tbody>
                              {courseDetail.chapterDropoff.map((chapter: any, index: number) => {
                                const rate = chapter.started > 0
                                  ? ((chapter.completed / chapter.started) * 100).toFixed(0)
                                  : 0;
                                return (
                                  <tr key={chapter.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-3 px-4 text-sm text-gray-500">{chapter.order}</td>
                                    <td className="py-3 px-4 text-sm font-medium text-gray-900 truncate max-w-xs">
                                      {chapter.title}
                                    </td>
                                    <td className="py-3 px-4 text-right text-sm text-gray-700">
                                      {chapter.started}
                                    </td>
                                    <td className="py-3 px-4 text-right text-sm text-gray-700">
                                      {chapter.completed}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <div className="w-16 bg-gray-100 rounded-full h-2">
                                          <div
                                            className={`h-2 rounded-full ${
                                              Number(rate) >= 70 ? 'bg-green-500' : Number(rate) >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`}
                                            style={{ width: `${rate}%` }}
                                          />
                                        </div>
                                        <span className="text-sm font-medium text-gray-900">{rate}%</span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </ChartContainer>
                    )}

                    {/* Quiz Performance */}
                    {courseDetail.quizPerformance && courseDetail.quizPerformance.length > 0 && (
                      <ChartContainer title="Quiz Performance">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Quiz</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Attempts</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Pass Rate</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Avg Score</th>
                              </tr>
                            </thead>
                            <tbody>
                              {courseDetail.quizPerformance.map((quiz: any) => (
                                <tr key={quiz.id} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="py-3 px-4">
                                    <p className="text-sm font-medium text-gray-900">{quiz.title}</p>
                                    <p className="text-xs text-gray-500">{quiz.chapterTitle}</p>
                                  </td>
                                  <td className="py-3 px-4 text-right text-sm text-gray-700">
                                    {quiz.attempts}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      (quiz.passes / quiz.attempts * 100) >= 70
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                    }`}>
                                      {quiz.attempts > 0 ? ((quiz.passes / quiz.attempts) * 100).toFixed(0) : 0}%
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">
                                    {parseFloat(quiz.avgScore)?.toFixed(1) || 0}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </ChartContainer>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Select a course to view detailed analytics</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

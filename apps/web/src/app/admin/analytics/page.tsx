'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api/adminApi';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  DollarSign,
  Users,
  BookOpen,
  Star,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ShoppingCart,
  UserPlus,
  GraduationCap,
  CheckCircle
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('ka-GE', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value) + ' ₾';
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('ka-GE', {
    day: 'numeric',
    month: 'short'
  });
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  icon: React.ReactNode;
  iconBg: string;
}

function StatCard({ title, value, subtitle, change, icon, iconBg }: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-lg ${iconBg}`}>
          {icon}
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {isPositive ? '+' : ''}{change}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        <p className="text-sm text-gray-500 mt-1">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

interface TopCourse {
  id: string;
  title: string;
  slug: string;
  revenue?: number;
  purchases?: number;
  enrollments?: number;
  avg_rating?: number;
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState(30);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['consolidated-analytics', period],
    queryFn: () => analyticsApi.getConsolidated({ period }),
    staleTime: 60000
  });

  const analytics = data?.data?.data;

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link href="/admin" className="hover:text-primary-900">მთავარი</Link>
              <span>/</span>
              <span>ანალიტიკა</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">ანალიტიკა</h1>
            <p className="text-gray-500 mt-1">გადახდები, მომხმარებლები და კურსების სტატისტიკა</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value={7}>ბოლო 7 დღე</option>
              <option value={30}>ბოლო 30 დღე</option>
              <option value={90}>ბოლო 90 დღე</option>
              <option value={365}>ბოლო წელი</option>
            </select>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2 text-gray-500 hover:text-primary-900 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
              title="განახლება"
            >
              <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-xl animate-pulse h-64" />
            ))}
          </div>
        ) : analytics ? (
          <>
            {/* ===== PAYMENTS SECTION ===== */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">გადახდები</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                  title="სულ შემოსავალი"
                  value={formatCurrency(analytics.payments?.totalRevenue || 0)}
                  change={analytics.payments?.growth}
                  icon={<DollarSign className="w-5 h-5 text-green-600" />}
                  iconBg="bg-green-100"
                />
                <StatCard
                  title="შესყიდვები"
                  value={analytics.payments?.purchases || 0}
                  subtitle="შეძენილი კურსი"
                  icon={<ShoppingCart className="w-5 h-5 text-blue-600" />}
                  iconBg="bg-blue-100"
                />
                <StatCard
                  title="საშუალო შეკვეთა"
                  value={formatCurrency(analytics.payments?.avgOrderValue || 0)}
                  icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
                  iconBg="bg-purple-100"
                />
                <StatCard
                  title="ზრდა"
                  value={`${analytics.payments?.growth >= 0 ? '+' : ''}${analytics.payments?.growth || 0}%`}
                  subtitle="წინა პერიოდთან შედარებით"
                  icon={<TrendingUp className="w-5 h-5 text-accent-600" />}
                  iconBg="bg-accent-100"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Chart */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-medium text-gray-700 mb-4">შემოსავლის ტრენდი</h3>
                  <div className="h-64">
                    {analytics.payments?.trend && analytics.payments.trend.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analytics.payments.trend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={formatDate}
                            tick={{ fontSize: 12 }}
                            stroke="#9ca3af"
                          />
                          <YAxis
                            tickFormatter={(v) => `${v}₾`}
                            tick={{ fontSize: 12 }}
                            stroke="#9ca3af"
                          />
                          <Tooltip
                            formatter={(value: number) => [formatCurrency(value), 'შემოსავალი']}
                            labelFormatter={formatDate}
                          />
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400">
                        მონაცემები არ არის
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Courses by Revenue */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-medium text-gray-700 mb-4">Top კურსები შემოსავლით</h3>
                  <div className="space-y-3">
                    {analytics.payments?.topCourses && analytics.payments.topCourses.length > 0 ? (
                      analytics.payments.topCourses.map((course: TopCourse, index: number) => (
                        <div key={course.id} className="flex items-center gap-3">
                          <span className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{course.title}</p>
                            <p className="text-xs text-gray-500">{course.purchases} შეძენა</p>
                          </div>
                          <span className="text-sm font-semibold text-green-600">
                            {formatCurrency(Number(course.revenue) || 0)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-4">მონაცემები არ არის</p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* ===== USERS SECTION ===== */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">მომხმარებლები</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                  title="სულ სტუდენტები"
                  value={analytics.users?.total || 0}
                  icon={<Users className="w-5 h-5 text-blue-600" />}
                  iconBg="bg-blue-100"
                />
                <StatCard
                  title="აქტიური"
                  value={analytics.users?.active || 0}
                  subtitle="შეძენით ამ პერიოდში"
                  icon={<UserPlus className="w-5 h-5 text-green-600" />}
                  iconBg="bg-green-100"
                />
                <StatCard
                  title="ახალი რეგისტრაციები"
                  value={analytics.users?.newRegistrations || 0}
                  change={analytics.users?.growth}
                  icon={<UserPlus className="w-5 h-5 text-purple-600" />}
                  iconBg="bg-purple-100"
                />
                <StatCard
                  title="ზრდა"
                  value={`${analytics.users?.growth >= 0 ? '+' : ''}${analytics.users?.growth || 0}%`}
                  subtitle="წინა პერიოდთან შედარებით"
                  icon={<TrendingUp className="w-5 h-5 text-accent-600" />}
                  iconBg="bg-accent-100"
                />
              </div>

              {/* Registration Trend Chart */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-medium text-gray-700 mb-4">რეგისტრაციის ტრენდი</h3>
                <div className="h-48">
                  {analytics.users?.trend && analytics.users.trend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.users.trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={formatDate}
                          tick={{ fontSize: 12 }}
                          stroke="#9ca3af"
                        />
                        <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                        <Tooltip
                          formatter={(value: number) => [value, 'რეგისტრაციები']}
                          labelFormatter={formatDate}
                        />
                        <Bar dataKey="registrations" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      მონაცემები არ არის
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ===== COURSES SECTION ===== */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">კურსები</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                  title="გამოქვეყნებული კურსები"
                  value={analytics.courses?.total || 0}
                  icon={<BookOpen className="w-5 h-5 text-purple-600" />}
                  iconBg="bg-purple-100"
                />
                <StatCard
                  title="ჩარიცხვები"
                  value={analytics.courses?.enrollments || 0}
                  change={analytics.courses?.enrollmentGrowth}
                  icon={<GraduationCap className="w-5 h-5 text-blue-600" />}
                  iconBg="bg-blue-100"
                />
                <StatCard
                  title="საშუალო რეიტინგი"
                  value={`${(analytics.courses?.avgRating || 0).toFixed(1)} ★`}
                  subtitle={`${analytics.courses?.totalReviews || 0} შეფასება`}
                  icon={<Star className="w-5 h-5 text-yellow-500" />}
                  iconBg="bg-yellow-100"
                />
                <StatCard
                  title="დასრულების რეიტი"
                  value={`${analytics.courses?.completionRate || 0}%`}
                  icon={<CheckCircle className="w-5 h-5 text-green-600" />}
                  iconBg="bg-green-100"
                />
              </div>

              {/* Top Courses by Enrollments */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Top კურსები ჩარიცხვებით</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">#</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">კურსი</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">ჩარიცხვები</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">რეიტინგი</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.courses?.topCourses && analytics.courses.topCourses.length > 0 ? (
                        analytics.courses.topCourses.map((course: TopCourse, index: number) => (
                          <tr key={course.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <span className="w-6 h-6 inline-flex items-center justify-center bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                                {index + 1}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <Link
                                href={`/admin/courses/${course.id}`}
                                className="text-sm font-medium text-gray-900 hover:text-primary-900"
                              >
                                {course.title}
                              </Link>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="text-sm font-semibold text-gray-900">
                                {course.enrollments}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="text-sm text-yellow-600">
                                {Number(course.avg_rating || 0).toFixed(1)} ★
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-sm text-gray-400">
                            მონაცემები არ არის
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">მონაცემები არ არის</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

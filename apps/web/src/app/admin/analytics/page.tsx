'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { analyticsApi, comprehensiveAnalyticsApi } from '@/lib/api/adminApi';
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
  CheckCircle,
  Download,
  FileSpreadsheet,
  BarChart3,
  Loader2
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
    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-5">
      <div className="flex items-start justify-between">
        <div className={`p-2 sm:p-3 rounded-lg ${iconBg}`}>
          {icon}
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" /> : <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />}
            {isPositive ? '+' : ''}{change}%
          </div>
        )}
      </div>
      <div className="mt-2 sm:mt-4">
        <h3 className="text-lg sm:text-2xl font-bold text-gray-900">{value}</h3>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">{subtitle}</p>}
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
  const [activeTab, setActiveTab] = useState<'statistics' | 'export'>('statistics');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | ''>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['consolidated-analytics', period],
    queryFn: () => analyticsApi.getConsolidated({ period }),
    staleTime: 60000,
    enabled: activeTab === 'statistics'
  });

  // Export options query
  const { data: exportOptionsData, isLoading: exportOptionsLoading } = useQuery({
    queryKey: ['export-options'],
    queryFn: async () => {
      const response = await comprehensiveAnalyticsApi.getExportOptions();
      return response.data;
    },
    staleTime: 300000,
    enabled: activeTab === 'export'
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      const params: { year: number; month?: number; courseId?: string } = {
        year: selectedYear
      };
      if (selectedMonth !== '') {
        params.month = selectedMonth;
      }
      if (selectedCourse) {
        params.courseId = selectedCourse;
      }
      return comprehensiveAnalyticsApi.exportMonthlyPurchases(params);
    },
    onSuccess: (response) => {
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const filename = selectedMonth !== ''
        ? `purchases-${selectedYear}-${monthNames[selectedMonth - 1]}.xlsx`
        : `purchases-${selectedYear}.xlsx`;

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    }
  });

  const analytics = data?.data?.data;
  const exportOptions = exportOptionsData?.data;

  return (
    <AdminLayout>
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 mb-1">
              <Link href="/admin" className="hover:text-primary-900">მთავარი</Link>
              <span>/</span>
              <span>ანალიტიკა</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">ანალიტიკა</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 hidden sm:block">გადახდები, მომხმარებლები და კურსების სტატისტიკა</p>
          </div>
          {activeTab === 'statistics' && (
            <div className="flex items-center gap-2 sm:gap-3">
              <select
                value={period}
                onChange={(e) => setPeriod(parseInt(e.target.value))}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value={7}>7 დღე</option>
                <option value={30}>30 დღე</option>
                <option value={90}>90 დღე</option>
                <option value={365}>1 წელი</option>
              </select>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="p-2 text-gray-500 hover:text-primary-900 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                title="განახლება"
              >
                <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-4 sm:gap-6">
            <button
              onClick={() => setActiveTab('statistics')}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'statistics'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              სტატისტიკა
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'export'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              ექსპორტი
            </button>
          </nav>
        </div>

        {/* Export Tab Content */}
        {activeTab === 'export' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary-100 rounded-lg">
                <FileSpreadsheet className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">შესყიდვების ექსპორტი</h2>
                <p className="text-sm text-gray-500">ექსპორტირება Excel ფორმატში</p>
              </div>
            </div>

            {exportOptionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Year */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      წელი <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      {exportOptions?.years?.map((year: number) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  {/* Month */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      თვე <span className="text-gray-400">(არასავალდებულო)</span>
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value === '' ? '' : parseInt(e.target.value))}
                      className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">ყველა თვე</option>
                      {exportOptions?.months?.map((month: { value: number; label: string }) => (
                        <option key={month.value} value={month.value}>{month.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Course */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      კურსი <span className="text-gray-400">(არასავალდებულო)</span>
                    </label>
                    <select
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">ყველა კურსი</option>
                      {exportOptions?.courses?.map((course: { id: string; title: string }) => (
                        <option key={course.id} value={course.id}>{course.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Export Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Excel ფაილი შეიცავს:</h3>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                      <span><strong>შეჯამება</strong> - თვეების მიხედვით შემოსავალი და სტატისტიკა</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                      <span><strong>დეტალური მონაცემები</strong> - ყველა შესყიდვა დეტალებით</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                      <span><strong>კურსების შეჯამება</strong> - კურსების მიხედვით შემოსავალი</span>
                    </li>
                  </ul>
                </div>

                {/* Export Button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => exportMutation.mutate()}
                    disabled={exportMutation.isPending}
                    className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exportMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        მიმდინარეობს...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        Excel-ის ჩამოტვირთვა
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Statistics Tab Content */}
        {activeTab === 'statistics' && (
          <>
            {isLoading ? (
              <div className="space-y-6 sm:space-y-8">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-gray-200 rounded-xl animate-pulse h-48 sm:h-64" />
                ))}
              </div>
            ) : analytics ? (
              <>
                {/* ===== PAYMENTS SECTION ===== */}
            <section>
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">გადახდები</h2>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
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

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Revenue Chart */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-3 sm:p-5">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-3 sm:mb-4">შემოსავლის ტრენდი</h3>
                  <div className="h-48 sm:h-64">
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
                <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-5">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-3 sm:mb-4">Top კურსები შემოსავლით</h3>
                  <div className="space-y-2 sm:space-y-3">
                    {analytics.payments?.topCourses && analytics.payments.topCourses.length > 0 ? (
                      analytics.payments.topCourses.map((course: TopCourse, index: number) => (
                        <div key={course.id} className="flex items-center gap-2 sm:gap-3">
                          <span className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-gray-100 rounded-full text-xs font-medium text-gray-600 flex-shrink-0">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{course.title}</p>
                            <p className="text-xs text-gray-500 hidden sm:block">{course.purchases} შეძენა</p>
                          </div>
                          <span className="text-xs sm:text-sm font-semibold text-green-600 flex-shrink-0">
                            {formatCurrency(Number(course.revenue) || 0)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs sm:text-sm text-gray-400 text-center py-4">მონაცემები არ არის</p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* ===== USERS SECTION ===== */}
            <section>
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">მომხმარებლები</h2>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
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
              <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-5">
                <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-3 sm:mb-4">რეგისტრაციის ტრენდი</h3>
                <div className="h-40 sm:h-48">
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
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">კურსები</h2>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
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
              <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-5">
                <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-3 sm:mb-4">Top კურსები ჩარიცხვებით</h3>

                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
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

                {/* Mobile list */}
                <div className="sm:hidden space-y-2">
                  {analytics.courses?.topCourses && analytics.courses.topCourses.length > 0 ? (
                    analytics.courses.topCourses.map((course: TopCourse, index: number) => (
                      <div key={course.id} className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0">
                        <span className="w-5 h-5 flex items-center justify-center bg-gray-100 rounded-full text-xs font-medium text-gray-600 flex-shrink-0">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/admin/courses/${course.id}`}
                            className="text-xs font-medium text-gray-900 hover:text-primary-900 truncate block"
                          >
                            {course.title}
                          </Link>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs font-semibold text-gray-900">{course.enrollments}</span>
                          <span className="text-xs text-yellow-600">{Number(course.avg_rating || 0).toFixed(1)} ★</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-4">მონაცემები არ არის</p>
                  )}
                </div>
              </div>
            </section>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">მონაცემები არ არის</p>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}

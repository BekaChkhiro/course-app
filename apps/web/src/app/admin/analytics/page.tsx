'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { comprehensiveAnalyticsApi } from '@/lib/api/adminApi';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  ChartContainer,
  RevenueLineChart,
  SimpleBarChart,
  DonutChart,
  ProgressBars,
  Sparkline
} from '@/components/analytics/Charts';
import {
  StatCard,
  StatsGrid,
  Leaderboard,
  RealtimeStat
} from '@/components/analytics/StatCards';
import {
  DollarSign,
  Users,
  BookOpen,
  Star,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  Download,
  Calendar,
  Activity,
  Eye,
  Clock,
  Target,
  Zap
} from 'lucide-react';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  });
}

export default function AnalyticsDashboardPage() {
  const [period, setPeriod] = useState(30);

  // Fetch dashboard overview
  const { data: dashboardData, isLoading: dashboardLoading, refetch } = useQuery({
    queryKey: ['analytics-dashboard', period],
    queryFn: () => comprehensiveAnalyticsApi.getDashboardOverview({ period }),
    staleTime: 60000
  });

  // Fetch revenue trend
  const { data: revenueTrendData, isLoading: trendLoading } = useQuery({
    queryKey: ['analytics-revenue-trend'],
    queryFn: () => comprehensiveAnalyticsApi.getRevenueTrend({ months: 12 }),
    staleTime: 60000
  });

  // Fetch top courses
  const { data: topCoursesData, isLoading: coursesLoading } = useQuery({
    queryKey: ['analytics-top-courses'],
    queryFn: () => comprehensiveAnalyticsApi.getTopCourses({ limit: 5 }),
    staleTime: 60000
  });

  // Fetch realtime activity
  const { data: realtimeData, isLoading: realtimeLoading } = useQuery({
    queryKey: ['analytics-realtime'],
    queryFn: () => comprehensiveAnalyticsApi.getRealtimeActivity(),
    staleTime: 30000,
    refetchInterval: 30000
  });

  const dashboard = dashboardData?.data?.data;
  const revenueTrend = revenueTrendData?.data?.data || [];
  const topCourses = topCoursesData?.data?.data || [];
  const realtime = realtimeData?.data?.data;

  const isLoading = dashboardLoading || trendLoading || coursesLoading;

  // Quick links for analytics sections
  const analyticsLinks = [
    { name: 'შემოსავალი', href: '/admin/analytics/revenue', icon: DollarSign, color: 'indigo' },
    { name: 'სტუდენტები', href: '/admin/analytics/students', icon: Users, color: 'blue' },
    { name: 'კურსები', href: '/admin/analytics/courses', icon: BookOpen, color: 'green' },
    { name: 'სწავლა', href: '/admin/analytics/learning', icon: Target, color: 'purple' },
    { name: 'ჩართულობა', href: '/admin/analytics/engagement', icon: Activity, color: 'yellow' },
    { name: 'რეალტაიმ', href: '/admin/analytics/realtime', icon: Zap, color: 'red' }
  ];

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
            <h1 className="text-2xl font-bold text-gray-900">ანალიტიკის დაშბორდი</h1>
            <p className="text-gray-500 mt-1">პლატფორმის შესრულების სრული მიმოხილვა</p>
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
              className="p-2 text-gray-500 hover:text-primary-900 hover:bg-primary-50 rounded-lg transition-colors"
              title="განახლება"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <Link
              href="/admin/analytics/reports"
              className="flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              ექსპორტი
            </Link>
          </div>
        </div>

        {/* Real-time stats bar */}
        {realtime && (
          <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="text-sm font-medium text-gray-700">პირდაპირ</span>
            </div>
            <RealtimeStat label="აქტიური მომხმარებლები" value={realtime.activeUsers} pulse={false} />
            <RealtimeStat label="უყურებენ ახლა" value={realtime.currentStreams} pulse={false} />
            <RealtimeStat label="დღევანდელი შემოსავალი" value={realtime.today?.revenue || 0} unit="ლარი" pulse={false} />
            <RealtimeStat label="დღევანდელი გაყიდვები" value={realtime.today?.purchases || 0} pulse={false} />
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-xl animate-pulse h-32" />
            ))}
          </div>
        ) : dashboard ? (
          <>
            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="სულ შემოსავალი"
                value={formatCurrency(dashboard.revenue?.period || 0)}
                subtitle={`${dashboard.revenue?.purchases || 0} შეძენა`}
                change={dashboard.revenue?.growth}
                icon="revenue"
                color="indigo"
              />
              <StatCard
                title="აქტიური სტუდენტები"
                value={dashboard.students?.active30d || 0}
                subtitle={`${dashboard.students?.total || 0} სულ რეგისტრირებული`}
                icon="users"
                color="blue"
              />
              <StatCard
                title="დასრულებული კურსები"
                value={dashboard.completions?.month || 0}
                subtitle={`${dashboard.completions?.allTime || 0} ყველა დროის`}
                icon="courses"
                color="green"
              />
              <StatCard
                title="საშუალო რეიტინგი"
                value={dashboard.rating?.average?.toFixed(1) || '0.0'}
                subtitle="ყველა შეფასებიდან"
                icon="rating"
                color="yellow"
              />
            </div>

            {/* Revenue Chart + Quick Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Trend Chart */}
              <ChartContainer
                title="შემოსავლის ტრენდი"
                subtitle="ყოველთვიური შემოსავალი ბოლო წლის განმავლობაში"
                className="lg:col-span-2"
                action={
                  <Link
                    href="/admin/analytics/revenue"
                    className="text-sm text-primary-900 hover:text-primary-800 flex items-center gap-1"
                  >
                    დეტალები
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                }
              >
                <RevenueLineChart
                  data={revenueTrend.map((item: any) => ({
                    month: formatDate(item.month),
                    revenue: parseFloat(item.revenue) || 0,
                    purchases: parseInt(item.purchases) || 0
                  }))}
                  showPurchases
                  height={300}
                />
              </ChartContainer>

              {/* Revenue Breakdown */}
              <ChartContainer title="შემოსავალი პერიოდების მიხედვით">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-primary-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-500">დღეს</p>
                      <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(dashboard.revenue?.today || 0)}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-primary-900" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-500">ეს თვე</p>
                      <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(dashboard.revenue?.month || 0)}
                      </p>
                    </div>
                    <Calendar className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-accent-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-500">ეს წელი</p>
                      <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(dashboard.revenue?.year || 0)}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-accent-600" />
                  </div>
                </div>
              </ChartContainer>
            </div>

            {/* Student Activity + Top Courses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Student Activity Stats */}
              <ChartContainer
                title="სტუდენტების აქტივობა"
                subtitle="აქტიური მომხმარებლები პერიოდების მიხედვით"
                action={
                  <Link
                    href="/admin/analytics/students"
                    className="text-sm text-primary-900 hover:text-primary-800 flex items-center gap-1"
                  >
                    დეტალები
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                }
              >
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-3xl font-bold text-gray-900">
                      {dashboard.students?.active24h || 0}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">ბოლო 24 სთ</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-3xl font-bold text-gray-900">
                      {dashboard.students?.active7d || 0}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">ბოლო 7 დღე</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-3xl font-bold text-gray-900">
                      {dashboard.students?.active30d || 0}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">ბოლო 30 დღე</p>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">დღევანდელი რეგისტრაციები</span>
                    <span className="text-lg font-semibold text-green-600">
                      +{dashboard.students?.todayRegistrations || 0}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-green-500"
                      style={{
                        width: `${Math.min(
                          ((dashboard.students?.todayRegistrations || 0) /
                            Math.max(dashboard.students?.total || 1, 100)) *
                            100 *
                            10,
                          100
                        )}%`
                      }}
                    />
                  </div>
                </div>
              </ChartContainer>

              {/* Top Courses */}
              <Leaderboard
                title="ყველაზე გაყიდვადი კურსები"
                items={topCourses.map((course: any, index: number) => ({
                  rank: index + 1,
                  name: course.title,
                  value: formatCurrency(parseFloat(course.revenue) || 0),
                  subtitle: `${course.sales} გაყიდვა`
                }))}
              />
            </div>

            {/* Quick Links to Analytics Sections */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {analyticsLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:border-primary-300 hover:shadow-md transition-all"
                  >
                    <div className={`p-3 rounded-lg bg-${link.color}-100`}>
                      <Icon className={`w-6 h-6 text-${link.color}-600`} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{link.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Recent Activities */}
            {dashboard.recentActivities && dashboard.recentActivities.length > 0 && (
              <ChartContainer title="ბოლო შეძენები" subtitle="უახლესი ტრანზაქციები">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">მომხმარებელი</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">კურსი</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">თანხა</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">დრო</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.recentActivities.slice(0, 5).map((activity: any) => (
                        <tr key={activity.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <span className="text-sm font-medium text-gray-900">{activity.userName}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-600 truncate max-w-xs block">
                              {activity.courseName}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-sm font-semibold text-green-600">
                              {formatCurrency(parseFloat(activity.amount) || 0)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-sm text-gray-500">
                              {new Date(activity.createdAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ChartContainer>
            )}
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

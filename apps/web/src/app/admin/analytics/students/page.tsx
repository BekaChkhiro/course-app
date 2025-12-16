'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { comprehensiveAnalyticsApi } from '@/lib/api/adminApi';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  ChartContainer,
  TrendAreaChart,
  SimpleBarChart,
  DonutChart,
  ProgressBars,
  ActivityHeatmap
} from '@/components/analytics/Charts';
import { StatCard, Leaderboard } from '@/components/analytics/StatCards';
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  ArrowLeft,
  RefreshCw,
  Download,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Clock,
  TrendingUp
} from 'lucide-react';

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}

const deviceIcons: Record<string, any> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet
};

export default function StudentAnalyticsPage() {
  const [period, setPeriod] = useState(30);

  // Fetch student analytics
  const { data: studentData, isLoading: studentLoading, refetch } = useQuery({
    queryKey: ['student-analytics', period],
    queryFn: () => comprehensiveAnalyticsApi.getStudentAnalytics({ period }),
    staleTime: 60000
  });

  // Fetch cohort retention
  const { data: cohortData, isLoading: cohortLoading } = useQuery({
    queryKey: ['cohort-retention'],
    queryFn: () => comprehensiveAnalyticsApi.getCohortRetention(),
    staleTime: 60000
  });

  const students = studentData?.data?.data;
  const cohorts = cohortData?.data?.data || [];

  const isLoading = studentLoading || cohortLoading;

  // Handle export
  const handleExport = async () => {
    try {
      const response = await comprehensiveAnalyticsApi.exportStudents();

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `students-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

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
              <span>Students</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/analytics"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Student Analytics</h1>
                <p className="text-gray-500 mt-1">User growth, activity patterns, and demographics</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
            <button
              onClick={() => refetch()}
              className="p-2 text-gray-500 hover:text-primary-900 hover:bg-primary-50 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-xl animate-pulse h-32" />
            ))}
          </div>
        ) : students ? (
          <>
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Students"
                value={students.activeVsInactive?.total || 0}
                icon="users"
                color="indigo"
              />
              <StatCard
                title="Active Students"
                value={students.activeVsInactive?.active || 0}
                subtitle={`${((students.activeVsInactive?.active / students.activeVsInactive?.total) * 100 || 0).toFixed(1)}% of total`}
                icon="users"
                color="green"
              />
              <StatCard
                title="Inactive Students"
                value={students.activeVsInactive?.inactive || 0}
                subtitle="30+ days inactive"
                icon="users"
                color="red"
              />
              <StatCard
                title="New This Period"
                value={(students.registrationTrend || []).reduce(
                  (sum: number, item: any) => sum + parseInt(item.registrations),
                  0
                )}
                icon="users"
                color="blue"
              />
            </div>

            {/* Registration Trend + Active/Inactive */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Registration Trend */}
              <ChartContainer
                title="Registration Trend"
                subtitle={`New signups over the past ${period} days`}
                className="lg:col-span-2"
              >
                <TrendAreaChart
                  data={(students.registrationTrend || []).map((item: any) => ({
                    date: formatDate(item.date),
                    value: parseInt(item.registrations)
                  }))}
                  dataKey="value"
                  height={300}
                />
              </ChartContainer>

              {/* Active vs Inactive */}
              <ChartContainer title="Active vs Inactive">
                <DonutChart
                  data={[
                    { name: 'Active', value: students.activeVsInactive?.active || 0 },
                    { name: 'Inactive', value: students.activeVsInactive?.inactive || 0 }
                  ]}
                  height={250}
                />
              </ChartContainer>
            </div>

            {/* Device Stats & Enrollment Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Device Stats */}
              <ChartContainer title="Device Usage" subtitle="How students access the platform">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {(students.deviceStats || []).map((device: any) => {
                    const Icon = deviceIcons[device.deviceType?.toLowerCase()] || Monitor;
                    return (
                      <div key={device.deviceType} className="text-center p-4 bg-gray-50 rounded-lg">
                        <Icon className="w-8 h-8 text-primary-900 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-gray-900">{device.users}</p>
                        <p className="text-sm text-gray-500 capitalize">{device.deviceType}</p>
                      </div>
                    );
                  })}
                </div>
                <DonutChart
                  data={(students.deviceStats || []).map((device: any) => ({
                    name: device.deviceType,
                    value: parseInt(device.count)
                  }))}
                  height={200}
                  showLabels={false}
                />
              </ChartContainer>

              {/* Enrollment Distribution */}
              <ChartContainer title="Enrollment Distribution" subtitle="Courses per student">
                <ProgressBars
                  data={[
                    { name: '1 Course', value: parseInt(students.enrollmentDistribution?.oneCourse) || 0, color: '#6366f1' },
                    { name: '2-3 Courses', value: parseInt(students.enrollmentDistribution?.twoToThree) || 0, color: '#8b5cf6' },
                    { name: '4-5 Courses', value: parseInt(students.enrollmentDistribution?.fourToFive) || 0, color: '#22c55e' },
                    { name: '5+ Courses', value: parseInt(students.enrollmentDistribution?.moreThanFive) || 0, color: '#f59e0b' }
                  ]}
                  showPercentage={false}
                />
              </ChartContainer>
            </div>

            {/* Login Patterns Heatmap */}
            <ChartContainer title="Login Activity Patterns" subtitle="When students are most active">
              <ActivityHeatmap
                data={(students.loginPatterns || []).map((item: any) => ({
                  hour: parseInt(item.hour),
                  dayOfWeek: parseInt(item.dayOfWeek),
                  value: parseInt(item.sessions)
                }))}
              />
            </ChartContainer>

            {/* Student Lifecycle & Top Students */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Lifecycle Stages */}
              <ChartContainer title="Student Lifecycle Stages">
                <SimpleBarChart
                  data={(students.lifecycleStages || []).map((stage: any) => ({
                    name: stage.stage.replace('_', ' ').charAt(0).toUpperCase() +
                      stage.stage.replace('_', ' ').slice(1),
                    value: parseInt(stage.count)
                  }))}
                  height={300}
                />
              </ChartContainer>

              {/* Top Students */}
              <Leaderboard
                title="Top Students"
                items={(students.topStudents || []).slice(0, 5).map((student: any, index: number) => ({
                  rank: index + 1,
                  name: `${student.name} ${student.surname}`,
                  value: `${student.chaptersCompleted} chapters`,
                  subtitle: `${student.coursesEnrolled} courses | ${student.totalXP} XP`,
                  avatar: student.avatar
                }))}
              />
            </div>

            {/* Cohort Retention Table */}
            {cohorts.length > 0 && (
              <ChartContainer title="Cohort Retention" subtitle="Monthly user retention analysis">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Cohort</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Users</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Month 1</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Month 2</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Month 3</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cohorts.map((cohort: any) => (
                        <tr key={cohort.cohort_month} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm font-medium text-gray-900">
                            {new Date(cohort.cohort_month).toLocaleDateString('en-US', {
                              month: 'short',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="py-3 px-4 text-right text-sm text-gray-700">
                            {cohort.totalUsers}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              (cohort.activeMonth1 / cohort.totalUsers * 100) > 50
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {((cohort.activeMonth1 / cohort.totalUsers) * 100).toFixed(0)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              (cohort.activeMonth2 / cohort.totalUsers * 100) > 30
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {((cohort.activeMonth2 / cohort.totalUsers) * 100).toFixed(0)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              (cohort.activeMonth3 / cohort.totalUsers * 100) > 20
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {((cohort.activeMonth3 / cohort.totalUsers) * 100).toFixed(0)}%
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
            <p className="text-gray-500">No data available</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

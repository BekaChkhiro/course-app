'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  Users,
  BookOpen,
  DollarSign,
  MessageSquare,
  Award
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { analyticsApi } from '@/lib/api/adminApi';
import LoadingSpinner, { PageLoader } from '@/components/ui/LoadingSpinner';
import Badge from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function AdminDashboard() {
  const [period, setPeriod] = useState(30);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', period],
    queryFn: () => analyticsApi.getDashboard({ period }).then(res => res.data)
  });

  if (isLoading) return <PageLoader />;

  const revenue = stats?.revenue || {};
  const students = stats?.students || {};
  const courses = stats?.courses || {};
  const engagement = stats?.engagement || {};

  const statCards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(revenue.total || 0),
      change: `${revenue.purchases || 0} purchases`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Active Students',
      value: students.active || 0,
      change: `${students.growth || 0}% of total`,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Published Courses',
      value: courses.byStatus?.published || 0,
      change: `${courses.byStatus?.draft || 0} drafts`,
      icon: BookOpen,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Recent Comments',
      value: engagement.recentComments || 0,
      change: 'Last 30 days',
      icon: MessageSquare,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Overview of your e-learning platform
            </p>
          </div>

          {/* Period selector */}
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.title}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-500">{stat.title}</h3>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
                  <p className="mt-1 text-sm text-gray-600">{stat.change}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
            {revenue.trend && revenue.trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenue.trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => formatDate(date)}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(date) => formatDate(date)}
                    formatter={(value: any) => formatCurrency(value)}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Revenue"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>

          {/* Popular Courses */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Courses</h3>
            <div className="space-y-4">
              {courses.popular && courses.popular.length > 0 ? (
                courses.popular.map((course: any) => (
                  <div key={course.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{course.title}</p>
                      <p className="text-sm text-gray-500">{course.category}</p>
                    </div>
                    <Badge variant="info">{course.purchases} enrollments</Badge>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No courses yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Course Completion Rates */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Course Completion Rates
          </h3>
          {engagement.completionRates && engagement.completionRates.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={engagement.completionRates}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="title" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completion_rate" fill="#10b981" name="Completion Rate %" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No completion data yet
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

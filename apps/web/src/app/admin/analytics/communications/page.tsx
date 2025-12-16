'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { reviewApi, messagingApi } from '@/lib/api/adminApi';

function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'indigo',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  color?: 'indigo' | 'green' | 'yellow' | 'red' | 'blue' | 'purple';
}) {
  const colorClasses = {
    indigo: 'bg-primary-100 text-primary-900',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
    blue: 'bg-accent-100 text-accent-500',
    purple: 'bg-accent-100 text-accent-500',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <p className={`text-sm mt-2 ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function BarChart({
  data,
  title,
}: {
  data: { label: string; value: number; color?: string }[];
  title: string;
}) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">{item.label}</span>
              <span className="font-medium text-gray-900">{item.value}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${item.color || 'bg-primary-900'}`}
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CommunicationsAnalyticsPage() {
  const [dateRange, setDateRange] = useState('30'); // days

  // Fetch review analytics
  const { data: reviewData, isLoading: reviewLoading } = useQuery({
    queryKey: ['reviewAnalytics', dateRange],
    queryFn: () => reviewApi.getAnalytics({
      startDate: new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
    }),
    staleTime: 60000,
  });

  // Fetch messaging analytics
  const { data: messagingData, isLoading: messagingLoading } = useQuery({
    queryKey: ['messagingAnalytics', dateRange],
    queryFn: () => messagingApi.getAnalytics({
      startDate: new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
    }),
    staleTime: 60000,
  });

  // Fetch team performance
  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: ['teamPerformance', dateRange],
    queryFn: () => messagingApi.getTeamPerformance({
      startDate: new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
    }),
    staleTime: 60000,
  });

  const reviewAnalytics = reviewData?.data?.data || {
    totalReviews: 0,
    pendingReviews: 0,
    approvedReviews: 0,
    rejectedReviews: 0,
    averageRating: 0,
    ratingDistribution: {},
    reviewsOverTime: [],
  };

  const messagingAnalytics = messagingData?.data?.data || {
    totalMessages: 0,
    openMessages: 0,
    resolvedMessages: 0,
    avgResponseTime: 0,
    avgResolutionTime: 0,
    messagesByPriority: {},
    messagesOverTime: [],
  };

  const teamPerformance = teamData?.data?.data || [];

  const isLoading = reviewLoading || messagingLoading || teamLoading;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/admin" className="hover:text-primary-900">Dashboard</Link>
            <span>/</span>
            <span>Analytics</span>
            <span>/</span>
            <span>Communications</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Communication Analytics</h1>
          <p className="text-gray-500 mt-1">Track reviews, messages, and team performance</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-xl animate-pulse h-32" />
          ))}
        </div>
      ) : (
        <>
          {/* Review Stats */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Reviews Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Reviews"
                value={reviewAnalytics.totalReviews}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                }
                color="yellow"
              />
              <StatCard
                title="Pending Reviews"
                value={reviewAnalytics.pendingReviews}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                color="blue"
              />
              <StatCard
                title="Approved"
                value={reviewAnalytics.approvedReviews}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                color="green"
              />
              <StatCard
                title="Average Rating"
                value={reviewAnalytics.averageRating?.toFixed(1) || '0.0'}
                icon={
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                }
                color="yellow"
              />
            </div>
          </div>

          {/* Messaging Stats */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Messaging Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Messages"
                value={messagingAnalytics.totalMessages}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
                color="indigo"
              />
              <StatCard
                title="Open Messages"
                value={messagingAnalytics.openMessages}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                  </svg>
                }
                color="blue"
              />
              <StatCard
                title="Avg Response Time"
                value={messagingAnalytics.avgResponseTime ? `${Math.round(messagingAnalytics.avgResponseTime / 60)}m` : 'N/A'}
                subtitle="minutes"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                color="purple"
              />
              <StatCard
                title="Resolution Rate"
                value={
                  messagingAnalytics.totalMessages > 0
                    ? `${Math.round((messagingAnalytics.resolvedMessages / messagingAnalytics.totalMessages) * 100)}%`
                    : 'N/A'
                }
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                color="green"
              />
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Rating Distribution */}
            <BarChart
              title="Rating Distribution"
              data={[
                { label: '5 Stars', value: reviewAnalytics.ratingDistribution?.[5] || 0, color: 'bg-green-500' },
                { label: '4 Stars', value: reviewAnalytics.ratingDistribution?.[4] || 0, color: 'bg-lime-500' },
                { label: '3 Stars', value: reviewAnalytics.ratingDistribution?.[3] || 0, color: 'bg-yellow-500' },
                { label: '2 Stars', value: reviewAnalytics.ratingDistribution?.[2] || 0, color: 'bg-orange-500' },
                { label: '1 Star', value: reviewAnalytics.ratingDistribution?.[1] || 0, color: 'bg-red-500' },
              ]}
            />

            {/* Messages by Priority */}
            <BarChart
              title="Messages by Priority"
              data={[
                { label: 'Urgent', value: messagingAnalytics.messagesByPriority?.URGENT || 0, color: 'bg-red-500' },
                { label: 'High', value: messagingAnalytics.messagesByPriority?.HIGH || 0, color: 'bg-orange-500' },
                { label: 'Medium', value: messagingAnalytics.messagesByPriority?.MEDIUM || 0, color: 'bg-accent-500' },
                { label: 'Low', value: messagingAnalytics.messagesByPriority?.LOW || 0, color: 'bg-gray-500' },
              ]}
            />
          </div>

          {/* Team Performance */}
          {teamPerformance.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Team Member</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Messages Handled</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Resolved</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Avg Response Time</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Resolution Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamPerformance.map((member: any) => (
                      <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary-900">
                                {member.name?.charAt(0) || '?'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{member.name} {member.surname}</p>
                              <p className="text-sm text-gray-500">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-medium text-gray-900">{member.messagesHandled || 0}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-medium text-green-600">{member.messagesResolved || 0}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-gray-700">
                            {member.avgResponseTime ? `${Math.round(member.avgResponseTime / 60)}m` : 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            (member.resolutionRate || 0) >= 80
                              ? 'bg-green-100 text-green-700'
                              : (member.resolutionRate || 0) >= 50
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {member.resolutionRate?.toFixed(0) || 0}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/admin/reviews"
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow flex items-center gap-4"
            >
              <div className="p-3 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Manage Reviews</h3>
                <p className="text-sm text-gray-500">Moderate and respond to course reviews</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href="/admin/messages"
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow flex items-center gap-4"
            >
              <div className="p-3 bg-primary-100 rounded-lg">
                <svg className="w-6 h-6 text-primary-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Message Inbox</h3>
                <p className="text-sm text-gray-500">View and respond to student messages</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

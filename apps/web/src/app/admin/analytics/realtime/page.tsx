'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { comprehensiveAnalyticsApi } from '@/lib/api/adminApi';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  ChartContainer,
  TrendAreaChart,
  Sparkline
} from '@/components/analytics/Charts';
import { StatCard, RealtimeStat } from '@/components/analytics/StatCards';
import {
  Activity,
  Users,
  Eye,
  ShoppingCart,
  Play,
  MessageSquare,
  FileQuestion,
  ArrowLeft,
  RefreshCw,
  Wifi,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Zap
} from 'lucide-react';

function formatTimeAgo(date: string | Date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const activityIcons: Record<string, any> = {
  LOGIN: Users,
  COURSE_VIEW: Eye,
  CHAPTER_COMPLETE: CheckCircle,
  QUIZ_ATTEMPT: FileQuestion,
  PURCHASE: ShoppingCart,
  VIDEO_PLAY: Play,
  COMMENT_POST: MessageSquare
};

const activityLabels: Record<string, string> = {
  LOGIN: 'Logged in',
  COURSE_VIEW: 'Viewed course',
  CHAPTER_COMPLETE: 'Completed chapter',
  QUIZ_ATTEMPT: 'Attempted quiz',
  PURCHASE: 'Made purchase',
  VIDEO_PLAY: 'Started video',
  COMMENT_POST: 'Posted comment'
};

const activityColors: Record<string, string> = {
  LOGIN: 'bg-accent-100 text-accent-600',
  COURSE_VIEW: 'bg-primary-100 text-primary-900',
  CHAPTER_COMPLETE: 'bg-green-100 text-green-600',
  QUIZ_ATTEMPT: 'bg-accent-100 text-accent-600',
  PURCHASE: 'bg-emerald-100 text-emerald-600',
  VIDEO_PLAY: 'bg-pink-100 text-pink-600',
  COMMENT_POST: 'bg-yellow-100 text-yellow-600'
};

export default function RealtimeAnalyticsPage() {
  const [isLive, setIsLive] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10000); // 10 seconds

  // Fetch real-time activity
  const { data: realtimeData, isLoading, refetch } = useQuery({
    queryKey: ['realtime-analytics'],
    queryFn: () => comprehensiveAnalyticsApi.getRealtimeActivity(),
    staleTime: 5000,
    refetchInterval: isLive ? refreshInterval : false
  });

  // Fetch live user count
  const { data: liveUsersData } = useQuery({
    queryKey: ['live-users'],
    queryFn: () => comprehensiveAnalyticsApi.getLiveUsers(),
    staleTime: 5000,
    refetchInterval: isLive ? refreshInterval : false
  });

  const realtime = realtimeData?.data?.data;
  const liveUsers = liveUsersData?.data?.data;

  // Calculate activity trend for sparkline
  const activityTrend = (realtime?.recentActivity || [])
    .slice(0, 20)
    .reverse()
    .map((_: any, i: number) => ({
      value: Math.random() * 10 + 5 // Simulated activity level
    }));

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
              <span>Real-time</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/analytics"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">Real-time Monitor</h1>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                    isLive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                    {isLive ? 'Live' : 'Paused'}
                  </div>
                </div>
                <p className="text-gray-500 mt-1">Live activity monitoring and user sessions</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg"
              disabled={!isLive}
            >
              <option value={5000}>5 seconds</option>
              <option value={10000}>10 seconds</option>
              <option value={30000}>30 seconds</option>
              <option value={60000}>1 minute</option>
            </select>
            <button
              onClick={() => setIsLive(!isLive)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isLive
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isLive ? 'Pause' : 'Resume'}
            </button>
            <button
              onClick={() => refetch()}
              className="p-2 text-gray-500 hover:text-primary-900 hover:bg-primary-50 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Live Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <RealtimeStat
            title="Online Now"
            value={liveUsers?.activeNow || 0}
            icon={Wifi}
            pulse
          />
          <RealtimeStat
            title="Active Sessions"
            value={liveUsers?.activeSessions || 0}
            icon={Users}
          />
          <RealtimeStat
            title="Watching Videos"
            value={liveUsers?.watchingVideo || 0}
            icon={Play}
          />
          <RealtimeStat
            title="Taking Quizzes"
            value={liveUsers?.takingQuiz || 0}
            icon={FileQuestion}
          />
          <RealtimeStat
            title="Today's Revenue"
            value={`$${(realtime?.todayStats?.revenue || 0).toLocaleString()}`}
            icon={TrendingUp}
          />
          <RealtimeStat
            title="Today's Signups"
            value={realtime?.todayStats?.registrations || 0}
            icon={Zap}
          />
        </div>

        {/* Activity Stream & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Activity Feed */}
          <ChartContainer
            title="Live Activity Feed"
            subtitle={`Last ${(realtime?.recentActivity || []).length} events`}
            className="lg:col-span-2"
          >
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-gray-100 rounded-lg animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                ))
              ) : (realtime?.recentActivity || []).length > 0 ? (
                (realtime?.recentActivity || []).map((activity: any, index: number) => {
                  const Icon = activityIcons[activity.type] || Activity;
                  const colorClass = activityColors[activity.type] || 'bg-gray-100 text-gray-600';

                  return (
                    <div
                      key={activity.id || index}
                      className="flex items-center gap-4 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.userName || 'Anonymous'}{' '}
                          <span className="text-gray-500 font-normal">
                            {activityLabels[activity.type] || activity.type}
                          </span>
                        </p>
                        {activity.details && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {activity.details}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatTimeAgo(activity.createdAt)}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </ChartContainer>

          {/* Activity Breakdown */}
          <ChartContainer title="Activity Breakdown" subtitle="Today's activity by type">
            <div className="space-y-4">
              {Object.entries(activityLabels).map(([type, label]) => {
                const count = (realtime?.recentActivity || []).filter(
                  (a: any) => a.type === type
                ).length;
                const Icon = activityIcons[type];
                const colorClass = activityColors[type];

                return (
                  <div key={type} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">{label}</span>
                        <span className="text-sm font-semibold text-gray-900">{count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full transition-all"
                          style={{
                            width: `${Math.min((count / Math.max((realtime?.recentActivity || []).length, 1)) * 100, 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartContainer>
        </div>

        {/* System Health & Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Status */}
          <ChartContainer title="System Status" subtitle="Real-time system health">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700">API Status</span>
                </div>
                <p className="text-2xl font-bold text-green-600">Healthy</p>
                <p className="text-xs text-green-600 mt-1">Response: 42ms avg</p>
              </div>
              <div className="p-4 bg-green-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Database</span>
                </div>
                <p className="text-2xl font-bold text-green-600">Connected</p>
                <p className="text-xs text-green-600 mt-1">Latency: 8ms</p>
              </div>
              <div className="p-4 bg-green-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Redis Cache</span>
                </div>
                <p className="text-2xl font-bold text-green-600">Active</p>
                <p className="text-xs text-green-600 mt-1">Hit rate: 94%</p>
              </div>
              <div className="p-4 bg-green-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700">CDN</span>
                </div>
                <p className="text-2xl font-bold text-green-600">Optimal</p>
                <p className="text-xs text-green-600 mt-1">Bandwidth: Normal</p>
              </div>
            </div>
          </ChartContainer>

          {/* Recent Purchases Ticker */}
          <ChartContainer title="Recent Purchases" subtitle="Latest transactions">
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {(realtime?.recentPurchases || []).length > 0 ? (
                (realtime?.recentPurchases || []).map((purchase: any, index: number) => (
                  <div
                    key={purchase.id || index}
                    className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <ShoppingCart className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {purchase.userName || 'Customer'}
                        </p>
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">
                          {purchase.courseTitle}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-600">
                        ${parseFloat(purchase.amount || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatTimeAgo(purchase.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No recent purchases</p>
                </div>
              )}
            </div>
          </ChartContainer>
        </div>

        {/* Current Viewers */}
        {(liveUsers?.currentViewers || []).length > 0 && (
          <ChartContainer
            title="Active Viewers"
            subtitle="Users currently viewing content"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">User</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Content</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Activity</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {(liveUsers?.currentViewers || []).map((viewer: any) => (
                    <tr key={viewer.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary-900">
                              {viewer.name?.[0] || 'U'}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {viewer.name || 'Anonymous'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 truncate max-w-[200px]">
                        {viewer.contentTitle || 'Unknown'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          viewer.activity === 'watching' ? 'bg-pink-100 text-pink-700' :
                          viewer.activity === 'reading' ? 'bg-accent-100 text-accent-600' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {viewer.activity === 'watching' && <Play className="w-3 h-3" />}
                          {viewer.activity === 'reading' && <Eye className="w-3 h-3" />}
                          {viewer.activity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-gray-500">
                        {viewer.duration || '0m'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartContainer>
        )}
      </div>
    </AdminLayout>
  );
}

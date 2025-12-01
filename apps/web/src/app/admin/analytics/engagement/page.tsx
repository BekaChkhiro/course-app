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
  MessageSquare,
  Star,
  Video,
  FileQuestion,
  ArrowLeft,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  StickyNote,
  Activity,
  Clock
} from 'lucide-react';

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export default function EngagementAnalyticsPage() {
  const [period, setPeriod] = useState(30);

  // Fetch engagement metrics
  const { data: engagementData, isLoading, refetch } = useQuery({
    queryKey: ['engagement-analytics', period],
    queryFn: () => comprehensiveAnalyticsApi.getEngagementMetrics({ period }),
    staleTime: 60000
  });

  const engagement = engagementData?.data?.data;

  // Map video completion to chart data
  const videoCompletionData = (engagement?.videoCompletionRates || []).map((item: any) => ({
    name: item.bucket,
    value: parseInt(item.count),
    color: item.bucket === '100%' ? '#22c55e' : item.bucket.startsWith('75') ? '#84cc16' : '#6366f1'
  }));

  // Map review sentiment
  const sentimentData = (engagement?.reviewSentiment || []).map((item: any) => ({
    name: item.sentiment.charAt(0).toUpperCase() + item.sentiment.slice(1),
    value: parseInt(item.count)
  }));

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link href="/admin" className="hover:text-indigo-600">Dashboard</Link>
              <span>/</span>
              <Link href="/admin/analytics" className="hover:text-indigo-600">Analytics</Link>
              <span>/</span>
              <span>Engagement</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/analytics"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Engagement Metrics</h1>
                <p className="text-gray-500 mt-1">Comments, reviews, video views, and feature usage</p>
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
            </select>
            <button
              onClick={() => refetch()}
              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-xl animate-pulse h-32" />
            ))}
          </div>
        ) : engagement ? (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard
                title="Comments"
                value={engagement.summary?.totalComments || 0}
                icon="messages"
                color="indigo"
                size="sm"
              />
              <StatCard
                title="Reviews"
                value={engagement.summary?.totalReviews || 0}
                icon="rating"
                color="yellow"
                size="sm"
              />
              <StatCard
                title="Quiz Attempts"
                value={engagement.summary?.totalQuizAttempts || 0}
                icon="target"
                color="purple"
                size="sm"
              />
              <StatCard
                title="Watch Time"
                value={formatDuration(parseInt(engagement.summary?.totalWatchTime) || 0)}
                icon="time"
                color="blue"
                size="sm"
              />
              <StatCard
                title="Notes Created"
                value={engagement.summary?.totalNotes || 0}
                icon="bar"
                color="green"
                size="sm"
              />
              <StatCard
                title="Bookmarks"
                value={engagement.summary?.totalBookmarks || 0}
                icon="target"
                color="pink"
                size="sm"
              />
            </div>

            {/* Video Completion & Review Sentiment */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Video Completion Rates */}
              <ChartContainer title="Video Completion Rates" subtitle="How much of videos students watch">
                <ProgressBars data={videoCompletionData} showPercentage={false} />
              </ChartContainer>

              {/* Review Sentiment */}
              <ChartContainer title="Review Sentiment" subtitle="Based on star ratings">
                <DonutChart
                  data={sentimentData}
                  height={250}
                />
                <div className="flex justify-center gap-6 mt-4">
                  {sentimentData.map((item: any) => (
                    <div key={item.name} className="flex items-center gap-2">
                      {item.name === 'Positive' && <ThumbsUp className="w-4 h-4 text-green-500" />}
                      {item.name === 'Neutral' && <Activity className="w-4 h-4 text-yellow-500" />}
                      {item.name === 'Negative' && <ThumbsDown className="w-4 h-4 text-red-500" />}
                      <span className="text-sm text-gray-600">{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </ChartContainer>
            </div>

            {/* Comments by Course */}
            {engagement.commentsPerCourse && engagement.commentsPerCourse.length > 0 && (
              <ChartContainer title="Comments by Course" subtitle="Most discussed courses">
                <SimpleBarChart
                  data={engagement.commentsPerCourse.map((course: any) => ({
                    name: course.courseTitle?.substring(0, 25) + (course.courseTitle?.length > 25 ? '...' : ''),
                    value: parseInt(course.comments)
                  }))}
                  height={300}
                  horizontal
                />
              </ChartContainer>
            )}

            {/* Quiz Attempt Rates */}
            {engagement.quizAttemptRates && engagement.quizAttemptRates.length > 0 && (
              <ChartContainer title="Quiz Engagement" subtitle="Most attempted quizzes">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Quiz</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Chapter</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Unique Users</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Total Attempts</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Avg Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {engagement.quizAttemptRates.map((quiz: any) => (
                        <tr key={quiz.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm font-medium text-gray-900">{quiz.title}</td>
                          <td className="py-3 px-4 text-sm text-gray-500">{quiz.chapterTitle}</td>
                          <td className="py-3 px-4 text-right text-sm text-gray-700">
                            {quiz.uniqueAttempts}
                          </td>
                          <td className="py-3 px-4 text-right text-sm text-gray-700">
                            {quiz.totalAttempts}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              parseFloat(quiz.avgScore) >= 70
                                ? 'bg-green-100 text-green-700'
                                : parseFloat(quiz.avgScore) >= 50
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {parseFloat(quiz.avgScore)?.toFixed(1) || 0}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ChartContainer>
            )}

            {/* Feature Usage */}
            {engagement.featureUsage && engagement.featureUsage.length > 0 && (
              <ChartContainer title="Feature Usage" subtitle="How students use platform features">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {engagement.featureUsage.map((feature: any) => {
                    const icons: Record<string, any> = {
                      video_watched: Video,
                      comment_posted: MessageSquare,
                      quiz_attempted: FileQuestion,
                      note_created: StickyNote,
                      bookmark_created: Bookmark
                    };
                    const Icon = icons[feature.feature] || Activity;
                    const labels: Record<string, string> = {
                      video_watched: 'Videos Watched',
                      comment_posted: 'Comments Posted',
                      quiz_attempted: 'Quizzes Attempted',
                      note_created: 'Notes Created',
                      bookmark_created: 'Bookmarks Added'
                    };

                    return (
                      <div key={feature.feature} className="text-center p-4 bg-gray-50 rounded-xl">
                        <Icon className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-gray-900">{feature.usage}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {labels[feature.feature] || feature.feature.replace('_', ' ')}
                        </p>
                      </div>
                    );
                  })}
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

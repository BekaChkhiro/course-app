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
  ProgressBars,
  ActivityHeatmap
} from '@/components/analytics/Charts';
import { StatCard, Leaderboard } from '@/components/analytics/StatCards';
import {
  Target,
  Clock,
  TrendingUp,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Zap,
  Award,
  Brain,
  BarChart3
} from 'lucide-react';

export default function LearningAnalyticsPage() {
  const [period, setPeriod] = useState(30);

  // Fetch learning analytics
  const { data: learningData, isLoading, refetch } = useQuery({
    queryKey: ['learning-analytics', period],
    queryFn: () => comprehensiveAnalyticsApi.getLearningAnalytics({ period }),
    staleTime: 60000
  });

  const learning = learningData?.data?.data;

  // Map progress distribution to chart data
  const progressData = learning?.progressDistribution
    ? [
        { name: 'Not Started', value: learning.progressDistribution.find((p: any) => p.bucket === 'not_started')?.count || 0, color: '#94a3b8' },
        { name: '1-25%', value: learning.progressDistribution.find((p: any) => p.bucket === '1-25%')?.count || 0, color: '#f59e0b' },
        { name: '25-50%', value: learning.progressDistribution.find((p: any) => p.bucket === '25-50%')?.count || 0, color: '#6366f1' },
        { name: '50-75%', value: learning.progressDistribution.find((p: any) => p.bucket === '50-75%')?.count || 0, color: '#8b5cf6' },
        { name: '75-99%', value: learning.progressDistribution.find((p: any) => p.bucket === '75-99%')?.count || 0, color: '#22c55e' },
        { name: 'Completed', value: learning.progressDistribution.find((p: any) => p.bucket === 'completed')?.count || 0, color: '#10b981' }
      ]
    : [];

  // Map hourly patterns
  const hourlyData = (learning?.hourlyPatterns || []).map((item: any) => ({
    name: `${item.hour}:00`,
    value: parseInt(item.activities)
  }));

  // Map daily patterns
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dailyData = (learning?.dailyPatterns || []).map((item: any) => ({
    name: dayNames[parseInt(item.dayOfWeek)],
    value: parseInt(item.activities)
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
              <span>Learning</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/analytics"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Learning Analytics</h1>
                <p className="text-gray-500 mt-1">Student progress, study patterns, and performance insights</p>
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
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-xl animate-pulse h-32" />
            ))}
          </div>
        ) : learning ? (
          <>
            {/* Progress Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartContainer title="Progress Distribution" subtitle="Course completion levels">
                <DonutChart
                  data={progressData.filter(p => p.value > 0)}
                  height={300}
                />
              </ChartContainer>

              <ChartContainer title="Progress Breakdown">
                <ProgressBars data={progressData} showPercentage={false} />
              </ChartContainer>
            </div>

            {/* Study Time Patterns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Hourly Patterns */}
              <ChartContainer title="Activity by Hour" subtitle="When students study most">
                <SimpleBarChart
                  data={hourlyData}
                  height={250}
                  color="#6366f1"
                />
              </ChartContainer>

              {/* Daily Patterns */}
              <ChartContainer title="Activity by Day" subtitle="Weekly study patterns">
                <SimpleBarChart
                  data={dailyData}
                  height={250}
                  color="#8b5cf6"
                />
              </ChartContainer>
            </div>

            {/* Quiz Performance by Difficulty */}
            {learning.quizPerformanceByDifficulty && (
              <ChartContainer title="Quiz Performance by Difficulty">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {learning.quizPerformanceByDifficulty.map((diff: any) => (
                    <div key={diff.difficulty} className="text-center p-6 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500 capitalize mb-2">{diff.difficulty}</p>
                      <p className="text-3xl font-bold text-gray-900 mb-2">
                        {parseFloat(diff.avgScore)?.toFixed(1) || 0}%
                      </p>
                      <p className="text-sm text-gray-500">Avg Score</p>
                      <div className="mt-4">
                        <p className="text-lg font-semibold text-green-600">
                          {parseFloat(diff.passRate)?.toFixed(0) || 0}%
                        </p>
                        <p className="text-xs text-gray-500">Pass Rate</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ChartContainer>
            )}

            {/* Study Streaks Distribution */}
            {learning.streakDistribution && (
              <ChartContainer title="Study Streak Distribution" subtitle="Daily learning consistency">
                <SimpleBarChart
                  data={(learning.streakDistribution || []).map((streak: any) => ({
                    name: streak.bucket,
                    value: parseInt(streak.count)
                  }))}
                  height={250}
                  color="#22c55e"
                />
              </ChartContainer>
            )}

            {/* At-Risk Students */}
            {learning.atRiskStudents && learning.atRiskStudents.length > 0 && (
              <ChartContainer
                title="At-Risk Students"
                subtitle="Students inactive for 14+ days who may need re-engagement"
              >
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Student</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Email</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Courses</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Progress</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Last Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {learning.atRiskStudents.map((student: any) => (
                        <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                                <AlertTriangle className="w-4 h-4 text-red-600" />
                              </div>
                              <span className="font-medium text-gray-900">
                                {student.name} {student.surname}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500">
                            {student.email}
                          </td>
                          <td className="py-3 px-4 text-center text-sm text-gray-700">
                            {student.enrolledCourses}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              student.avgProgress >= 50
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {student.avgProgress}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-sm text-gray-500">
                            {student.lastActive
                              ? new Date(student.lastActive).toLocaleDateString()
                              : 'Never'
                            }
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

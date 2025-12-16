'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { comprehensiveAnalyticsApi } from '@/lib/api/adminApi';
import AdminLayout from '@/components/admin/AdminLayout';
import { ChartContainer } from '@/components/analytics/Charts';
import {
  FileText,
  Plus,
  ArrowLeft,
  RefreshCw,
  Download,
  Calendar,
  Clock,
  Trash2,
  Play,
  Pause,
  Edit,
  BarChart2,
  PieChart,
  TrendingUp,
  Table,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface ReportConfig {
  id?: string;
  name: string;
  description: string;
  type: 'revenue' | 'students' | 'courses' | 'engagement' | 'custom';
  metrics: string[];
  dateRange: {
    start: string;
    end: string;
  };
  schedule?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    email: string;
  };
  chartType: 'bar' | 'line' | 'pie' | 'table';
}

const reportTemplates = [
  {
    id: 'revenue-monthly',
    name: 'Monthly Revenue Report',
    description: 'Revenue breakdown by course and category',
    type: 'revenue' as const,
    metrics: ['totalRevenue', 'byCourse', 'byCategory'],
    chartType: 'bar' as const
  },
  {
    id: 'student-growth',
    name: 'Student Growth Report',
    description: 'New registrations and active users over time',
    type: 'students' as const,
    metrics: ['registrations', 'activeUsers', 'retention'],
    chartType: 'line' as const
  },
  {
    id: 'course-performance',
    name: 'Course Performance Report',
    description: 'Enrollments, completions, and ratings',
    type: 'courses' as const,
    metrics: ['enrollments', 'completionRate', 'avgRating'],
    chartType: 'table' as const
  },
  {
    id: 'engagement-weekly',
    name: 'Weekly Engagement Report',
    description: 'Comments, reviews, and quiz attempts',
    type: 'engagement' as const,
    metrics: ['comments', 'reviews', 'quizAttempts'],
    chartType: 'bar' as const
  }
];

const availableMetrics = {
  revenue: [
    { id: 'totalRevenue', name: 'Total Revenue' },
    { id: 'byCourse', name: 'Revenue by Course' },
    { id: 'byCategory', name: 'Revenue by Category' },
    { id: 'refunds', name: 'Refunds' },
    { id: 'promoCodeUsage', name: 'Promo Code Usage' }
  ],
  students: [
    { id: 'registrations', name: 'Registrations' },
    { id: 'activeUsers', name: 'Active Users' },
    { id: 'retention', name: 'Retention Rate' },
    { id: 'deviceStats', name: 'Device Statistics' },
    { id: 'loginPatterns', name: 'Login Patterns' }
  ],
  courses: [
    { id: 'enrollments', name: 'Enrollments' },
    { id: 'completionRate', name: 'Completion Rate' },
    { id: 'avgRating', name: 'Average Rating' },
    { id: 'dropoffPoints', name: 'Drop-off Points' },
    { id: 'quizPerformance', name: 'Quiz Performance' }
  ],
  engagement: [
    { id: 'comments', name: 'Comments' },
    { id: 'reviews', name: 'Reviews' },
    { id: 'quizAttempts', name: 'Quiz Attempts' },
    { id: 'videoCompletion', name: 'Video Completion' },
    { id: 'featureUsage', name: 'Feature Usage' }
  ],
  custom: [
    { id: 'all', name: 'All Metrics Available' }
  ]
};

const chartTypeIcons = {
  bar: BarChart2,
  line: TrendingUp,
  pie: PieChart,
  table: Table
};

export default function ReportsBuilderPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingReport, setEditingReport] = useState<ReportConfig | null>(null);
  const [newReport, setNewReport] = useState<ReportConfig>({
    name: '',
    description: '',
    type: 'revenue',
    metrics: [],
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    schedule: {
      enabled: false,
      frequency: 'weekly',
      time: '09:00',
      email: ''
    },
    chartType: 'bar'
  });

  const queryClient = useQueryClient();

  // Fetch saved reports
  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['custom-reports'],
    queryFn: () => comprehensiveAnalyticsApi.getCustomReports(),
    staleTime: 60000
  });

  const reports = reportsData?.data?.data || [];

  // Create report mutation
  const createReportMutation = useMutation({
    mutationFn: (report: ReportConfig) => comprehensiveAnalyticsApi.createCustomReport(report),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-reports'] });
      setIsCreating(false);
      resetForm();
    }
  });

  // Delete report mutation
  const deleteReportMutation = useMutation({
    mutationFn: (id: string) => comprehensiveAnalyticsApi.deleteCustomReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-reports'] });
    }
  });

  // Run report mutation
  const runReportMutation = useMutation({
    mutationFn: (id: string) => comprehensiveAnalyticsApi.runCustomReport(id),
    onSuccess: (data) => {
      // Download the report
      if (data?.data?.url) {
        window.open(data.data.url, '_blank');
      }
    }
  });

  const resetForm = () => {
    setNewReport({
      name: '',
      description: '',
      type: 'revenue',
      metrics: [],
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      },
      schedule: {
        enabled: false,
        frequency: 'weekly',
        time: '09:00',
        email: ''
      },
      chartType: 'bar'
    });
  };

  const handleUseTemplate = (template: typeof reportTemplates[0]) => {
    setNewReport({
      ...newReport,
      name: template.name,
      description: template.description,
      type: template.type,
      metrics: template.metrics,
      chartType: template.chartType
    });
    setIsCreating(true);
  };

  const handleMetricToggle = (metricId: string) => {
    setNewReport(prev => ({
      ...prev,
      metrics: prev.metrics.includes(metricId)
        ? prev.metrics.filter(m => m !== metricId)
        : [...prev.metrics, metricId]
    }));
  };

  const handleSaveReport = () => {
    if (!newReport.name || newReport.metrics.length === 0) {
      return;
    }
    createReportMutation.mutate(newReport);
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
              <span>Reports</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/analytics"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Custom Reports</h1>
                <p className="text-gray-500 mt-1">Create, schedule, and export custom reports</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Report
          </button>
        </div>

        {/* Report Templates */}
        {!isCreating && (
          <ChartContainer title="Quick Start Templates" subtitle="Start with a pre-built template">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {reportTemplates.map((template) => {
                const ChartIcon = chartTypeIcons[template.chartType];
                return (
                  <div
                    key={template.id}
                    className="p-4 border border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50/50 transition-colors cursor-pointer"
                    onClick={() => handleUseTemplate(template)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                        <ChartIcon className="w-5 h-5 text-primary-900" />
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 capitalize">
                        {template.type}
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1">{template.name}</h3>
                    <p className="text-sm text-gray-500">{template.description}</p>
                  </div>
                );
              })}
            </div>
          </ChartContainer>
        )}

        {/* Report Builder Form */}
        {isCreating && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Create New Report</h2>
              <button
                onClick={() => {
                  setIsCreating(false);
                  resetForm();
                }}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Report Name
                  </label>
                  <input
                    type="text"
                    value={newReport.name}
                    onChange={(e) => setNewReport({ ...newReport, name: e.target.value })}
                    placeholder="Enter report name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newReport.description}
                    onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
                    placeholder="Brief description of the report"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Report Type
                  </label>
                  <select
                    value={newReport.type}
                    onChange={(e) => setNewReport({
                      ...newReport,
                      type: e.target.value as ReportConfig['type'],
                      metrics: []
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="revenue">Revenue</option>
                    <option value="students">Students</option>
                    <option value="courses">Courses</option>
                    <option value="engagement">Engagement</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chart Type
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['bar', 'line', 'pie', 'table'] as const).map((type) => {
                      const Icon = chartTypeIcons[type];
                      return (
                        <button
                          key={type}
                          onClick={() => setNewReport({ ...newReport, chartType: type })}
                          className={`p-3 rounded-lg border flex flex-col items-center gap-1 transition-colors ${
                            newReport.chartType === type
                              ? 'border-primary-500 bg-primary-50 text-primary-900'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-xs capitalize">{type}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={newReport.dateRange.start}
                      onChange={(e) => setNewReport({
                        ...newReport,
                        dateRange: { ...newReport.dateRange, start: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={newReport.dateRange.end}
                      onChange={(e) => setNewReport({
                        ...newReport,
                        dateRange: { ...newReport.dateRange, end: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              </div>

              {/* Metrics Selection */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Metrics
                  </label>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {availableMetrics[newReport.type].map((metric) => (
                      <label
                        key={metric.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={newReport.metrics.includes(metric.id)}
                          onChange={() => handleMetricToggle(metric.id)}
                          className="w-4 h-4 text-primary-900 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">{metric.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Schedule Settings */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newReport.schedule?.enabled}
                      onChange={(e) => setNewReport({
                        ...newReport,
                        schedule: { ...newReport.schedule!, enabled: e.target.checked }
                      })}
                      className="w-4 h-4 text-primary-900 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Schedule this report</span>
                  </label>

                  {newReport.schedule?.enabled && (
                    <div className="mt-4 space-y-4 pl-7">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Frequency</label>
                          <select
                            value={newReport.schedule.frequency}
                            onChange={(e) => setNewReport({
                              ...newReport,
                              schedule: {
                                ...newReport.schedule!,
                                frequency: e.target.value as 'daily' | 'weekly' | 'monthly'
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Time</label>
                          <input
                            type="time"
                            value={newReport.schedule.time}
                            onChange={(e) => setNewReport({
                              ...newReport,
                              schedule: { ...newReport.schedule!, time: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Send to email</label>
                        <input
                          type="email"
                          value={newReport.schedule.email}
                          onChange={(e) => setNewReport({
                            ...newReport,
                            schedule: { ...newReport.schedule!, email: e.target.value }
                          })}
                          placeholder="admin@example.com"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsCreating(false);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReport}
                disabled={!newReport.name || newReport.metrics.length === 0 || createReportMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createReportMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Report
              </button>
            </div>
          </div>
        )}

        {/* Saved Reports */}
        <ChartContainer title="Saved Reports" subtitle="Your custom reports">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : reports.length > 0 ? (
            <div className="space-y-4">
              {reports.map((report: any) => {
                const ChartIcon = chartTypeIcons[report.chartType as keyof typeof chartTypeIcons] || BarChart2;
                return (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                        <ChartIcon className="w-6 h-6 text-primary-900" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{report.name}</h3>
                        <p className="text-sm text-gray-500">{report.description}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {report.dateRange?.start} - {report.dateRange?.end}
                          </span>
                          {report.schedule?.enabled && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {report.schedule.frequency}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {report.schedule?.enabled ? (
                        <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                          <CheckCircle className="w-3 h-3" />
                          Scheduled
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                          <Pause className="w-3 h-3" />
                          Manual
                        </span>
                      )}
                      <button
                        onClick={() => runReportMutation.mutate(report.id)}
                        disabled={runReportMutation.isPending}
                        className="p-2 text-primary-900 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Run Report"
                      >
                        {runReportMutation.isPending ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Play className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setEditingReport(report);
                          setNewReport(report);
                          setIsCreating(true);
                        }}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit Report"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this report?')) {
                            deleteReportMutation.mutate(report.id);
                          }
                        }}
                        disabled={deleteReportMutation.isPending}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Report"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No saved reports yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Create a custom report or use a template to get started
              </p>
            </div>
          )}
        </ChartContainer>

        {/* Export Options */}
        <ChartContainer title="Export Data" subtitle="Download analytics data in various formats">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => comprehensiveAnalyticsApi.exportStudents().then(res => {
                const blob = new Blob([res.data], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `students-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
              })}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center">
                <Download className="w-5 h-5 text-accent-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Export Students</p>
                <p className="text-sm text-gray-500">CSV format</p>
              </div>
            </button>

            <button
              onClick={() => comprehensiveAnalyticsApi.exportRevenue({
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0]
              }).then(res => {
                const blob = new Blob([res.data], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `revenue-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
              })}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Download className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Export Revenue</p>
                <p className="text-sm text-gray-500">CSV format</p>
              </div>
            </button>

            <button
              onClick={() => comprehensiveAnalyticsApi.exportCourses().then(res => {
                const blob = new Blob([res.data], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `courses-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
              })}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center">
                <Download className="w-5 h-5 text-accent-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Export Courses</p>
                <p className="text-sm text-gray-500">CSV format</p>
              </div>
            </button>

            <button
              onClick={() => {/* API endpoint for full export */}}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Download className="w-5 h-5 text-orange-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Full Data Export</p>
                <p className="text-sm text-gray-500">GDPR compliant</p>
              </div>
            </button>
          </div>
        </ChartContainer>
      </div>
    </AdminLayout>
  );
}

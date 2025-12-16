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
  FunnelChart
} from '@/components/analytics/Charts';
import { StatCard, ComparisonCard, KPICard } from '@/components/analytics/StatCards';
import {
  DollarSign,
  TrendingUp,
  ArrowLeft,
  RefreshCw,
  Download,
  Calendar,
  CreditCard,
  Tag,
  Users,
  ShoppingCart,
  Percent,
  BarChart3
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
    day: 'numeric'
  });
}

export default function RevenueAnalyticsPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  // Fetch revenue analytics
  const { data: revenueData, isLoading: revenueLoading, refetch } = useQuery({
    queryKey: ['revenue-analytics', dateRange, groupBy],
    queryFn: () => comprehensiveAnalyticsApi.getRevenueAnalytics({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      groupBy
    }),
    staleTime: 60000
  });

  // Fetch recurring revenue
  const { data: recurringData, isLoading: recurringLoading } = useQuery({
    queryKey: ['recurring-revenue'],
    queryFn: () => comprehensiveAnalyticsApi.getRecurringRevenue(),
    staleTime: 60000
  });

  // Fetch CLV
  const { data: clvData, isLoading: clvLoading } = useQuery({
    queryKey: ['clv'],
    queryFn: () => comprehensiveAnalyticsApi.getCustomerLifetimeValue(),
    staleTime: 60000
  });

  // Fetch conversion rates
  const { data: conversionData, isLoading: conversionLoading } = useQuery({
    queryKey: ['conversion-rates'],
    queryFn: () => comprehensiveAnalyticsApi.getConversionRates({ period: 30 }),
    staleTime: 60000
  });

  const revenue = revenueData?.data?.data;
  const recurring = recurringData?.data?.data;
  const clv = clvData?.data?.data;
  const conversion = conversionData?.data?.data;

  const isLoading = revenueLoading || recurringLoading || clvLoading || conversionLoading;

  // Handle export
  const handleExport = async () => {
    try {
      const response = await comprehensiveAnalyticsApi.exportRevenue({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `revenue-${dateRange.startDate}-${dateRange.endDate}.csv`;
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
              <span>Revenue</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/analytics"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Revenue Analytics</h1>
                <p className="text-gray-500 mt-1">Track revenue, MRR, CLV, and conversion rates</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
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
        ) : (
          <>
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Revenue"
                value={formatCurrency(parseFloat(revenue?.totals?.totalRevenue) || 0)}
                subtitle={`${revenue?.totals?.totalPurchases || 0} purchases`}
                icon="revenue"
                color="indigo"
              />
              <StatCard
                title="MRR"
                value={formatCurrency(recurring?.mrr || 0)}
                subtitle={`ARR: ${formatCurrency(recurring?.arr || 0)}`}
                icon="trending"
                color="green"
              />
              <StatCard
                title="Avg Order Value"
                value={formatCurrency(parseFloat(revenue?.totals?.avgOrderValue) || 0)}
                icon="cart"
                color="blue"
              />
              <StatCard
                title="Customer LTV"
                value={formatCurrency(parseFloat(clv?.avgLifetimeValue) || 0)}
                subtitle={`${clv?.avgPurchases?.toFixed(1) || 0} avg purchases`}
                icon="users"
                color="purple"
              />
            </div>

            {/* Conversion Funnel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ChartContainer title="Conversion Funnel" className="lg:col-span-1">
                <FunnelChart
                  data={[
                    { name: 'Registrations', value: conversion?.registrations || 0, color: '#6366f1' },
                    { name: 'Purchasers', value: conversion?.purchasers || 0, color: '#22c55e' }
                  ]}
                />
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Conversion Rate</p>
                  <p className="text-2xl font-bold text-green-600">
                    {conversion?.conversionRate?.toFixed(1) || 0}%
                  </p>
                </div>
              </ChartContainer>

              {/* Revenue Timeline */}
              <ChartContainer
                title="Revenue Over Time"
                subtitle={`${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)} breakdown`}
                className="lg:col-span-2"
              >
                <RevenueLineChart
                  data={(revenue?.timeline || []).map((item: any) => ({
                    month: formatDate(item.period),
                    revenue: parseFloat(item.revenue) || 0,
                    purchases: parseInt(item.purchases) || 0
                  }))}
                  showPurchases
                  height={300}
                />
              </ChartContainer>
            </div>

            {/* Revenue by Course & Category */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* By Course */}
              <ChartContainer title="Revenue by Course" subtitle="Top performing courses">
                <SimpleBarChart
                  data={(revenue?.byCourse || []).slice(0, 10).map((course: any) => ({
                    name: course.title?.substring(0, 20) + (course.title?.length > 20 ? '...' : ''),
                    value: parseFloat(course.revenue) || 0
                  }))}
                  horizontal
                  height={350}
                  formatter={formatCurrency}
                />
              </ChartContainer>

              {/* By Category */}
              <ChartContainer title="Revenue by Category">
                <DonutChart
                  data={(revenue?.byCategory || []).map((cat: any) => ({
                    name: cat.name,
                    value: parseFloat(cat.revenue) || 0
                  }))}
                  height={300}
                  formatter={formatCurrency}
                />
              </ChartContainer>
            </div>

            {/* Promo Code Performance */}
            {revenue?.promoCodePerformance && revenue.promoCodePerformance.length > 0 && (
              <ChartContainer
                title="Promo Code Performance"
                subtitle="Revenue and usage by promotion code"
              >
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Code</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Discount</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Usage</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Total Discount</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Revenue Generated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenue.promoCodePerformance.map((promo: any) => (
                        <tr key={promo.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-primary-100 text-primary-800 rounded font-mono text-sm">
                              {promo.code}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-sm text-gray-700">
                            {parseFloat(promo.discount)}%
                          </td>
                          <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">
                            {promo.usageCount}
                          </td>
                          <td className="py-3 px-4 text-right text-sm text-red-600">
                            -{formatCurrency(parseFloat(promo.totalDiscount) || 0)}
                          </td>
                          <td className="py-3 px-4 text-right text-sm font-medium text-green-600">
                            {formatCurrency(parseFloat(promo.generatedRevenue) || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ChartContainer>
            )}

            {/* Refunds & CLV Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Refunds */}
              <ChartContainer title="Refunds">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Total Refunds</span>
                    <span className="text-2xl font-bold text-red-600">
                      {formatCurrency(parseFloat(revenue?.refunds?.amount) || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Refund Count</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {revenue?.refunds?.count || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Refund Rate</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {revenue?.totals?.totalPurchases > 0
                        ? ((revenue?.refunds?.count / revenue.totals.totalPurchases) * 100).toFixed(2)
                        : 0}%
                    </span>
                  </div>
                </div>
              </ChartContainer>

              {/* CLV Distribution */}
              <ChartContainer title="Customer Value Stats">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Average LTV</span>
                    <span className="text-xl font-bold text-primary-900">
                      {formatCurrency(parseFloat(clv?.avgLifetimeValue) || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Max LTV</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {formatCurrency(parseFloat(clv?.maxLifetimeValue) || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Avg Purchases/Customer</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {parseFloat(clv?.avgPurchases)?.toFixed(2) || 0}
                    </span>
                  </div>
                </div>
              </ChartContainer>

              {/* Total Discount Given */}
              <ChartContainer title="Discount Summary">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Total Discounts</span>
                    <span className="text-2xl font-bold text-orange-600">
                      {formatCurrency(parseFloat(revenue?.totals?.totalDiscount) || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Unique Customers</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {revenue?.totals?.uniqueCustomers || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Discount/Purchase</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {revenue?.totals?.totalPurchases > 0
                        ? formatCurrency(
                            (parseFloat(revenue?.totals?.totalDiscount) || 0) /
                              revenue.totals.totalPurchases
                          )
                        : formatCurrency(0)}
                    </span>
                  </div>
                </div>
              </ChartContainer>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

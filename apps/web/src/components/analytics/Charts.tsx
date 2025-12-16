'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  ReferenceLine
} from 'recharts';
import { cn } from '@/lib/utils';

// Color palettes
const COLORS = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  muted: '#94a3b8'
};

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6'];

// Common chart wrapper
interface ChartContainerProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function ChartContainer({ title, subtitle, children, className, action }: ChartContainerProps) {
  return (
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-100 p-6', className)}>
      {(title || action) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

// Custom tooltip component
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatter?: (value: any, name: string) => string;
}

function CustomTooltip({ active, payload, label, formatter }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-gray-900 mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-medium text-gray-900">
            {formatter ? formatter(entry.value, entry.name) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// Revenue Line Chart
interface RevenueChartProps {
  data: Array<{ month: string; revenue: number; purchases?: number }>;
  showPurchases?: boolean;
  height?: number;
}

export function RevenueLineChart({ data, showPurchases = false, height = 300 }: RevenueChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
            <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: '#6b7280' }}
          axisLine={{ stroke: '#e5e7eb' }}
          tickLine={false}
        />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 12, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatCurrency}
        />
        {showPurchases && (
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
        )}
        <Tooltip
          content={
            <CustomTooltip
              formatter={(value, name) =>
                name === 'revenue' ? formatCurrency(value) : value.toString()
              }
            />
          }
        />
        <Legend />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="revenue"
          stroke={COLORS.primary}
          strokeWidth={2}
          fill="url(#revenueGradient)"
          name="Revenue"
        />
        {showPurchases && (
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="purchases"
            stroke={COLORS.secondary}
            strokeWidth={2}
            dot={{ fill: COLORS.secondary, strokeWidth: 2 }}
            name="Purchases"
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// Area Chart for trends
interface TrendChartProps {
  data: Array<{ date: string; value: number; [key: string]: any }>;
  dataKey: string;
  color?: string;
  height?: number;
  showGrid?: boolean;
  formatter?: (value: number) => string;
}

export function TrendAreaChart({
  data,
  dataKey,
  color = COLORS.primary,
  height = 200,
  showGrid = true,
  formatter
}: TrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <defs>
          <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={{ stroke: '#e5e7eb' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatter}
        />
        <Tooltip
          content={<CustomTooltip formatter={(value) => formatter?.(value) || value.toString()} />}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#gradient-${dataKey})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Bar Chart
interface BarChartProps {
  data: Array<{ name: string; value: number; [key: string]: any }>;
  dataKey?: string;
  color?: string;
  height?: number;
  horizontal?: boolean;
  showValues?: boolean;
  formatter?: (value: number) => string;
}

export function SimpleBarChart({
  data,
  dataKey = 'value',
  color = COLORS.primary,
  height = 300,
  horizontal = false,
  showValues = false,
  formatter
}: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 5, right: 30, left: horizontal ? 100 : 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        {horizontal ? (
          <>
            <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={formatter} />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              width={90}
            />
          </>
        ) : (
          <>
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
            <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={formatter} />
          </>
        )}
        <Tooltip
          content={<CustomTooltip formatter={(value) => formatter?.(value) || value.toString()} />}
        />
        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Grouped Bar Chart
interface GroupedBarChartProps {
  data: Array<{ name: string; [key: string]: any }>;
  bars: Array<{ dataKey: string; color: string; name: string }>;
  height?: number;
  formatter?: (value: number) => string;
}

export function GroupedBarChart({ data, bars, height = 300, formatter }: GroupedBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
        <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={formatter} />
        <Tooltip
          content={<CustomTooltip formatter={(value) => formatter?.(value) || value.toString()} />}
        />
        <Legend />
        {bars.map((bar, index) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            fill={bar.color}
            name={bar.name}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// Pie/Donut Chart
interface PieChartProps {
  data: Array<{ name: string; value: number }>;
  height?: number;
  innerRadius?: number;
  showLabels?: boolean;
  formatter?: (value: number) => string;
}

export function DonutChart({
  data,
  height = 300,
  innerRadius = 60,
  showLabels = true,
  formatter
}: PieChartProps) {
  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
          label={
            showLabels
              ? ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`
              : undefined
          }
          labelLine={showLabels}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          content={
            <CustomTooltip
              formatter={(value) =>
                formatter ? formatter(value) : `${value} (${((value / total) * 100).toFixed(1)}%)`
              }
            />
          }
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Progress Distribution Chart (for completion rates, etc.)
interface ProgressBarProps {
  data: Array<{ name: string; value: number; color?: string }>;
  showPercentage?: boolean;
}

export function ProgressBars({ data, showPercentage = true }: ProgressBarProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-4">
      {data.map((item, index) => (
        <div key={index}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-gray-700">{item.name}</span>
            <span className="text-sm text-gray-500">
              {showPercentage
                ? `${((item.value / maxValue) * 100).toFixed(0)}%`
                : item.value.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full transition-all duration-500"
              style={{
                width: `${(item.value / maxValue) * 100}%`,
                backgroundColor: item.color || PIE_COLORS[index % PIE_COLORS.length]
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Heatmap for time-based patterns
interface HeatmapProps {
  data: Array<{ hour: number; dayOfWeek: number; value: number }>;
  height?: number;
}

export function ActivityHeatmap({ data, height = 200 }: HeatmapProps) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  // Create a 7x24 grid
  const grid = useMemo(() => {
    const result: number[][] = Array(7)
      .fill(null)
      .map(() => Array(24).fill(0));

    data.forEach((item) => {
      if (item.dayOfWeek >= 0 && item.dayOfWeek < 7 && item.hour >= 0 && item.hour < 24) {
        result[item.dayOfWeek][item.hour] = item.value;
      }
    });

    return result;
  }, [data]);

  const getColor = (value: number) => {
    const intensity = value / maxValue;
    if (intensity === 0) return '#f3f4f6';
    if (intensity < 0.25) return '#c7d2fe';
    if (intensity < 0.5) return '#a5b4fc';
    if (intensity < 0.75) return '#818cf8';
    return '#6366f1';
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Hour labels */}
        <div className="flex ml-12 mb-1">
          {Array.from({ length: 24 }, (_, i) => (
            <div key={i} className="flex-1 text-center text-xs text-gray-400">
              {i % 3 === 0 ? `${i}h` : ''}
            </div>
          ))}
        </div>

        {/* Grid */}
        {grid.map((row, dayIndex) => (
          <div key={dayIndex} className="flex items-center">
            <div className="w-12 text-xs text-gray-500 text-right pr-2">{days[dayIndex]}</div>
            <div className="flex flex-1">
              {row.map((value, hourIndex) => (
                <div
                  key={hourIndex}
                  className="flex-1 h-6 m-0.5 rounded cursor-pointer transition-colors hover:ring-2 hover:ring-primary-400"
                  style={{ backgroundColor: getColor(value) }}
                  title={`${days[dayIndex]} ${hourIndex}:00 - ${value} activities`}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center justify-end mt-4 gap-2">
          <span className="text-xs text-gray-500">Less</span>
          {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded"
              style={{
                backgroundColor: getColor(intensity * maxValue)
              }}
            />
          ))}
          <span className="text-xs text-gray-500">More</span>
        </div>
      </div>
    </div>
  );
}

// Sparkline for compact trends
interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  showArea?: boolean;
}

export function Sparkline({ data, color = COLORS.primary, height = 40, showArea = true }: SparklineProps) {
  const chartData = data.map((value, index) => ({ index, value }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <defs>
          <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={showArea ? 0.3 : 0} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={showArea ? 'url(#sparklineGradient)' : 'transparent'}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Comparison bar (for vs period comparisons)
interface ComparisonBarProps {
  current: number;
  previous: number;
  label: string;
  formatter?: (value: number) => string;
}

export function ComparisonBar({ current, previous, label, formatter }: ComparisonBarProps) {
  const change = previous > 0 ? ((current - previous) / previous) * 100 : 100;
  const isPositive = change >= 0;

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div
          className={cn(
            'flex items-center gap-1 text-sm font-medium',
            isPositive ? 'text-green-600' : 'text-red-600'
          )}
        >
          {isPositive ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          )}
          {Math.abs(change).toFixed(1)}%
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">
        {formatter ? formatter(current) : current.toLocaleString()}
      </div>
      <div className="text-sm text-gray-500 mt-1">
        vs {formatter ? formatter(previous) : previous.toLocaleString()} previous
      </div>
    </div>
  );
}

// Funnel chart for conversion tracking
interface FunnelChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
}

export function FunnelChart({ data }: FunnelChartProps) {
  const maxValue = data[0]?.value || 1;

  return (
    <div className="space-y-3">
      {data.map((item, index) => {
        const width = (item.value / maxValue) * 100;
        const conversionRate = index > 0 ? ((item.value / data[index - 1].value) * 100).toFixed(1) : 100;

        return (
          <div key={index} className="relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">{item.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-900 font-medium">{item.value.toLocaleString()}</span>
                {index > 0 && (
                  <span className="text-xs text-gray-500">({conversionRate}%)</span>
                )}
              </div>
            </div>
            <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
              <div
                className="h-full rounded-lg flex items-center px-3 transition-all duration-500"
                style={{
                  width: `${width}%`,
                  backgroundColor: item.color || PIE_COLORS[index % PIE_COLORS.length]
                }}
              >
                <span className="text-white text-xs font-medium truncate">
                  {width.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { COLORS, PIE_COLORS };

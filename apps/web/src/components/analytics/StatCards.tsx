'use client';

import { cn } from '@/lib/utils';
import { Sparkline } from './Charts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  BookOpen,
  Star,
  Activity,
  Clock,
  ShoppingCart,
  Eye,
  Target,
  Zap,
  Award,
  MessageSquare,
  BarChart3,
  PieChart
} from 'lucide-react';

// Icon map for dynamic icon rendering
const iconMap = {
  revenue: DollarSign,
  users: Users,
  courses: BookOpen,
  rating: Star,
  activity: Activity,
  time: Clock,
  cart: ShoppingCart,
  views: Eye,
  target: Target,
  performance: Zap,
  awards: Award,
  messages: MessageSquare,
  bar: BarChart3,
  pie: PieChart,
  trending: TrendingUp
};

type IconType = keyof typeof iconMap;

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  icon?: IconType;
  color?: 'indigo' | 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'pink' | 'cyan';
  trend?: number[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const colorClasses = {
  indigo: {
    bg: 'bg-primary-50',
    icon: 'text-primary-900',
    ring: 'ring-primary-900/10'
  },
  green: {
    bg: 'bg-green-50',
    icon: 'text-green-600',
    ring: 'ring-green-600/10'
  },
  yellow: {
    bg: 'bg-yellow-50',
    icon: 'text-yellow-600',
    ring: 'ring-yellow-600/10'
  },
  red: {
    bg: 'bg-red-50',
    icon: 'text-red-600',
    ring: 'ring-red-600/10'
  },
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    ring: 'ring-blue-600/10'
  },
  purple: {
    bg: 'bg-accent-50',
    icon: 'text-accent-600',
    ring: 'ring-accent-600/10'
  },
  pink: {
    bg: 'bg-pink-50',
    icon: 'text-pink-600',
    ring: 'ring-pink-600/10'
  },
  cyan: {
    bg: 'bg-cyan-50',
    icon: 'text-cyan-600',
    ring: 'ring-cyan-600/10'
  }
};

export function StatCard({
  title,
  value,
  subtitle,
  change,
  changeLabel = 'vs last period',
  icon = 'trending',
  color = 'indigo',
  trend,
  size = 'md',
  className
}: StatCardProps) {
  const Icon = iconMap[icon];
  const colors = colorClasses[color];
  const isPositive = change !== undefined ? change >= 0 : true;

  return (
    <div
      className={cn(
        'bg-white rounded-xl shadow-sm border border-gray-100 p-6',
        size === 'sm' && 'p-4',
        size === 'lg' && 'p-8',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={cn('text-gray-500', size === 'sm' ? 'text-xs' : 'text-sm')}>{title}</p>
          <p
            className={cn(
              'font-bold text-gray-900 mt-1',
              size === 'sm' && 'text-xl',
              size === 'md' && 'text-2xl',
              size === 'lg' && 'text-3xl'
            )}
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className={cn('text-gray-500 mt-1', size === 'sm' ? 'text-xs' : 'text-sm')}>
              {subtitle}
            </p>
          )}
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              <div
                className={cn(
                  'flex items-center gap-0.5 text-sm font-medium',
                  isPositive ? 'text-green-600' : 'text-red-600'
                )}
              >
                {isPositive ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {isPositive ? '+' : ''}
                {change.toFixed(1)}%
              </div>
              <span className="text-xs text-gray-500">{changeLabel}</span>
            </div>
          )}
        </div>
        <div className={cn('p-3 rounded-lg ring-1', colors.bg, colors.ring)}>
          <Icon className={cn('w-6 h-6', colors.icon)} />
        </div>
      </div>

      {trend && trend.length > 0 && (
        <div className="mt-4">
          <Sparkline
            data={trend}
            color={isPositive ? '#22c55e' : '#ef4444'}
            height={40}
          />
        </div>
      )}
    </div>
  );
}

// Mini stat card for compact displays
interface MiniStatProps {
  label: string;
  value: string | number;
  change?: number;
  color?: 'green' | 'red' | 'gray';
}

export function MiniStat({ label, value, change, color = 'gray' }: MiniStatProps) {
  const isPositive = change !== undefined ? change >= 0 : true;

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-900">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {change !== undefined && (
          <span
            className={cn(
              'text-xs font-medium',
              isPositive ? 'text-green-600' : 'text-red-600'
            )}
          >
            {isPositive ? '+' : ''}
            {change.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

// Stats grid for dashboard overview
interface StatsGridProps {
  stats: Array<{
    title: string;
    value: string | number;
    subtitle?: string;
    change?: number;
    icon?: IconType;
    color?: StatCardProps['color'];
    trend?: number[];
  }>;
  columns?: 2 | 3 | 4;
}

export function StatsGrid({ stats, columns = 4 }: StatsGridProps) {
  return (
    <div
      className={cn(
        'grid gap-6',
        columns === 2 && 'grid-cols-1 md:grid-cols-2',
        columns === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        columns === 4 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
      )}
    >
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
}

// KPI Card with target tracking
interface KPICardProps {
  title: string;
  current: number;
  target: number;
  unit?: string;
  color?: StatCardProps['color'];
}

export function KPICard({ title, current, target, unit = '', color = 'indigo' }: KPICardProps) {
  const progress = Math.min((current / target) * 100, 100);
  const isOnTrack = progress >= 75;
  const colors = colorClasses[color];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-700">{title}</h4>
        <span
          className={cn(
            'text-xs font-medium px-2 py-1 rounded-full',
            isOnTrack ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
          )}
        >
          {isOnTrack ? 'On Track' : 'Behind'}
        </span>
      </div>

      <div className="flex items-end gap-2 mb-4">
        <span className="text-3xl font-bold text-gray-900">
          {current.toLocaleString()}
          {unit}
        </span>
        <span className="text-sm text-gray-500 mb-1">
          / {target.toLocaleString()}
          {unit}
        </span>
      </div>

      <div className="relative">
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', colors.bg.replace('50', '500'))}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="absolute right-0 -top-6 text-xs text-gray-500">
          {progress.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

// Comparison Card
interface ComparisonCardProps {
  title: string;
  metrics: Array<{
    label: string;
    current: number;
    previous: number;
    format?: (value: number) => string;
  }>;
}

export function ComparisonCard({ title, metrics }: ComparisonCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h4 className="text-lg font-semibold text-gray-900 mb-4">{title}</h4>
      <div className="space-y-4">
        {metrics.map((metric, index) => {
          const change = metric.previous > 0
            ? ((metric.current - metric.previous) / metric.previous) * 100
            : 100;
          const isPositive = change >= 0;
          const format = metric.format || ((v: number) => v.toLocaleString());

          return (
            <div key={index} className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{metric.label}</p>
                <p className="text-xl font-bold text-gray-900">{format(metric.current)}</p>
              </div>
              <div className="text-right">
                <div
                  className={cn(
                    'flex items-center gap-1 text-sm font-medium',
                    isPositive ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {isPositive ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {isPositive ? '+' : ''}
                  {change.toFixed(1)}%
                </div>
                <p className="text-xs text-gray-500">{format(metric.previous)} prev</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Real-time stat with animation
interface RealtimeStatProps {
  title: string;
  value: number | string;
  icon?: React.ComponentType<{ className?: string }>;
  pulse?: boolean;
  className?: string;
}

export function RealtimeStat({ title, value, icon: Icon, pulse = false, className }: RealtimeStatProps) {
  return (
    <div className={cn("bg-white rounded-xl shadow-sm border border-gray-100 p-4", className)}>
      <div className="flex items-center gap-3">
        {pulse && (
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
        )}
        {Icon && !pulse && (
          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary-900" />
          </div>
        )}
        <div className="flex-1">
          <p className="text-xs text-gray-500">{title}</p>
          <p className="text-xl font-bold text-gray-900">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
      </div>
    </div>
  );
}

// Leaderboard/Top list
interface LeaderboardProps {
  title: string;
  items: Array<{
    rank?: number;
    name: string;
    value: string | number;
    avatar?: string;
    subtitle?: string;
    trend?: 'up' | 'down' | 'same';
  }>;
  showRank?: boolean;
}

export function Leaderboard({ title, items, showRank = true }: LeaderboardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h4 className="text-lg font-semibold text-gray-900 mb-4">{title}</h4>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {showRank && (
              <span
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                  index === 0 && 'bg-yellow-100 text-yellow-700',
                  index === 1 && 'bg-gray-100 text-gray-700',
                  index === 2 && 'bg-orange-100 text-orange-700',
                  index > 2 && 'bg-gray-50 text-gray-500'
                )}
              >
                {item.rank || index + 1}
              </span>
            )}
            {item.avatar ? (
              <img src={item.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-sm font-medium text-primary-900">
                  {item.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
              {item.subtitle && (
                <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">
                {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
              </span>
              {item.trend && (
                <span>
                  {item.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                  {item.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

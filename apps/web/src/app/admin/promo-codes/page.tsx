'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  ToggleLeft,
  ToggleRight,
  Copy,
  ChevronLeft,
  ChevronRight,
  Tag,
  Percent,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Users,
  BarChart3,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { promoCodeApi, PromoCodeFilters } from '@/lib/api/adminApi';
import toast from 'react-hot-toast';

interface PromoCode {
  id: string;
  code: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  scope: 'ALL' | 'COURSE' | 'CATEGORY';
  course?: { id: string; title: string; slug: string };
  category?: { id: string; name: string; slug: string };
  singleUsePerUser: boolean;
  minOrderAmount?: number;
  maxUses?: number;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  computedStatus: string;
  purchaseCount: number;
  usageCount: number;
  createdAt: string;
}

const statusConfig: Record<string, { bg: string; text: string; icon: any; label: string }> = {
  active: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'აქტიური' },
  inactive: { bg: 'bg-gray-100', text: 'text-gray-800', icon: XCircle, label: 'გამორთული' },
  expired: { bg: 'bg-red-100', text: 'text-red-800', icon: Clock, label: 'ვადაგასული' },
  upcoming: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock, label: 'მომავალი' },
  exhausted: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: AlertCircle, label: 'ამოწურული' },
};

const scopeLabels: Record<string, string> = {
  ALL: 'ყველა კურსი',
  COURSE: 'კონკრეტული კურსი',
  CATEGORY: 'კატეგორია',
};

export default function AdminPromoCodesPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<PromoCodeFilters>({
    page: 1,
    limit: 10,
    status: 'all',
    scope: 'all',
    search: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Fetch promo codes
  const { data, isLoading } = useQuery({
    queryKey: ['admin-promo-codes', filters],
    queryFn: () => promoCodeApi.getAll(filters),
  });

  // Fetch analytics
  const { data: analyticsData } = useQuery({
    queryKey: ['admin-promo-code-analytics'],
    queryFn: () => promoCodeApi.getAnalytics(),
  });

  // Toggle mutation
  const toggleMutation = useMutation({
    mutationFn: (id: string) => promoCodeApi.toggle(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['admin-promo-codes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-promo-code-analytics'] });
      toast.success(response.data.message);
    },
    onError: () => {
      toast.error('სტატუსის ცვლილება ვერ მოხერხდა');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => promoCodeApi.delete(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['admin-promo-codes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-promo-code-analytics'] });
      toast.success(response.data.message);
      setDeleteId(null);
    },
    onError: () => {
      toast.error('წაშლა ვერ მოხერხდა');
    },
  });

  const handleSearch = () => {
    setFilters({ ...filters, search: searchInput, page: 1 });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('კოდი დაკოპირდა');
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ka-GE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDiscount = (type: string, value: number) => {
    if (type === 'PERCENTAGE') {
      return `${value}%`;
    }
    return `${value} ₾`;
  };

  const promoCodes = data?.data?.data?.promoCodes || [];
  const pagination = data?.data?.data?.pagination || { page: 1, totalPages: 1, total: 0 };
  const analytics = analyticsData?.data?.data;

  if (isLoading) {
    return (
      <AdminLayout>
        <PageLoader />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">პრომო კოდები</h1>
            <p className="text-gray-600 mt-1">მართეთ ფასდაკლებისა და აქციის კოდები</p>
          </div>
          <Link
            href="/admin/promo-codes/new"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            ახალი კოდი
          </Link>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Tag className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">სულ კოდები</p>
                  <p className="text-xl font-bold">{analytics.overview.totalCodes}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">აქტიური</p>
                  <p className="text-xl font-bold">{analytics.overview.activeCodes}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">გამოყენებული</p>
                  <p className="text-xl font-bold">{analytics.overview.totalUsage}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">დაზოგილი</p>
                  <p className="text-xl font-bold">{analytics.revenue.totalSaved.toFixed(2)} ₾</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="ძებნა კოდით ან აღწერით..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as any, page: 1 })}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">ყველა სტატუსი</option>
              <option value="active">აქტიური</option>
              <option value="inactive">გამორთული</option>
              <option value="expired">ვადაგასული</option>
              <option value="upcoming">მომავალი</option>
            </select>

            {/* Scope Filter */}
            <select
              value={filters.scope}
              onChange={(e) => setFilters({ ...filters, scope: e.target.value as any, page: 1 })}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">ყველა არეალი</option>
              <option value="ALL">ყველა კურსი</option>
              <option value="COURSE">კონკრეტული კურსი</option>
              <option value="CATEGORY">კატეგორია</option>
            </select>

            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">კოდი</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ფასდაკლება</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">არეალი</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ვადა</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">გამოყენება</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">სტატუსი</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">მოქმედება</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {promoCodes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      პრომო კოდები ვერ მოიძებნა
                    </td>
                  </tr>
                ) : (
                  promoCodes.map((promo: PromoCode) => {
                    const status = statusConfig[promo.computedStatus] || statusConfig.active;
                    const StatusIcon = status.icon;

                    return (
                      <tr key={promo.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-indigo-600">{promo.code}</span>
                            <button
                              onClick={() => handleCopyCode(promo.code)}
                              className="p-1 hover:bg-gray-100 rounded"
                              title="კოპირება"
                            >
                              <Copy className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                          {promo.description && (
                            <p className="text-sm text-gray-500 mt-1 truncate max-w-xs">{promo.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1">
                            {promo.discountType === 'PERCENTAGE' ? (
                              <Percent className="w-4 h-4 text-green-600" />
                            ) : (
                              <DollarSign className="w-4 h-4 text-green-600" />
                            )}
                            <span className="font-medium">
                              {formatDiscount(promo.discountType, Number(promo.discountValue))}
                            </span>
                          </div>
                          {promo.minOrderAmount && (
                            <p className="text-xs text-gray-500">მინ: {promo.minOrderAmount} ₾</p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm">{scopeLabels[promo.scope]}</span>
                          {promo.scope === 'COURSE' && promo.course && (
                            <p className="text-xs text-gray-500 truncate max-w-[150px]">{promo.course.title}</p>
                          )}
                          {promo.scope === 'CATEGORY' && promo.category && (
                            <p className="text-xs text-gray-500">{promo.category.name}</p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm">
                            <p>{formatDate(promo.validFrom)}</p>
                            <p className="text-gray-500">- {formatDate(promo.validUntil)}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1">
                            <BarChart3 className="w-4 h-4 text-gray-400" />
                            <span>
                              {promo.usedCount}
                              {promo.maxUses && <span className="text-gray-400">/{promo.maxUses}</span>}
                            </span>
                          </div>
                          {promo.singleUsePerUser && (
                            <p className="text-xs text-gray-500">ერთჯერადი</p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => toggleMutation.mutate(promo.id)}
                              className={`p-2 rounded-lg transition-colors ${
                                promo.isActive
                                  ? 'text-green-600 hover:bg-green-50'
                                  : 'text-gray-400 hover:bg-gray-100'
                              }`}
                              title={promo.isActive ? 'გამორთვა' : 'ჩართვა'}
                            >
                              {promo.isActive ? (
                                <ToggleRight className="w-5 h-5" />
                              ) : (
                                <ToggleLeft className="w-5 h-5" />
                              )}
                            </button>
                            <Link
                              href={`/admin/promo-codes/${promo.id}`}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="რედაქტირება"
                            >
                              <Edit className="w-5 h-5" />
                            </Link>
                            <button
                              onClick={() => setDeleteId(promo.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="წაშლა"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-gray-600">
                სულ {pagination.total} კოდი
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilters({ ...filters, page: Math.max(1, (filters.page || 1) - 1) })}
                  disabled={(filters.page || 1) <= 1}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm">
                  {filters.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setFilters({ ...filters, page: Math.min(pagination.totalPages, (filters.page || 1) + 1) })}
                  disabled={(filters.page || 1) >= pagination.totalPages}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">პრომო კოდის წაშლა</h3>
            <p className="text-gray-600 mb-4">
              დარწმუნებული ხართ რომ გსურთ ამ პრომო კოდის წაშლა? თუ კოდი უკვე გამოყენებულია, ის მხოლოდ გაითიშება.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                გაუქმება
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteId)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                წაშლა
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

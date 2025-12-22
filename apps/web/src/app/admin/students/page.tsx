'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Users,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Ban,
  Trash2,
  RotateCcw,
  UserCheck,
  UserX,
  UserPlus,
  ShoppingBag,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { studentsApi } from '@/lib/api/adminApi';
import { PageLoader } from '@/components/ui/LoadingSpinner';

type StatusFilter = 'active' | 'blocked' | 'deleted' | 'all' | '';

interface Student {
  id: string;
  email: string;
  name: string;
  surname: string;
  phone: string | null;
  avatar: string | null;
  isActive: boolean;
  emailVerified: boolean;
  deletedAt: string | null;
  createdAt: string;
  _count: {
    purchases: number;
    deviceSessions: number;
  };
}

interface Analytics {
  totalStudents: number;
  activeStudents: number;
  blockedStudents: number;
  newThisMonth: number;
  withPurchases: number;
}

export default function AdminStudentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [sortBy, setSortBy] = useState('newest');
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; student: Student | null }>({
    open: false,
    student: null,
  });

  // Debounce search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
  };

  // Fetch students
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['adminStudents', page, debouncedSearch, statusFilter, sortBy],
    queryFn: () =>
      studentsApi
        .getAll({
          page,
          limit: 20,
          search: debouncedSearch || undefined,
          status: statusFilter || undefined,
          sortBy: sortBy as any,
        })
        .then((res) => res.data),
  });

  // Fetch analytics
  const { data: analyticsData } = useQuery({
    queryKey: ['studentAnalytics'],
    queryFn: () => studentsApi.getAnalytics().then((res) => res.data),
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: (studentId: string) => studentsApi.toggleActive(studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminStudents'] });
      queryClient.invalidateQueries({ queryKey: ['studentAnalytics'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (studentId: string) => studentsApi.delete(studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminStudents'] });
      queryClient.invalidateQueries({ queryKey: ['studentAnalytics'] });
      setDeleteModal({ open: false, student: null });
    },
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: (studentId: string) => studentsApi.restore(studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminStudents'] });
      queryClient.invalidateQueries({ queryKey: ['studentAnalytics'] });
    },
  });

  const students: Student[] = studentsData?.data?.students || [];
  const pagination = studentsData?.data?.pagination || { total: 0, page: 1, totalPages: 1 };
  const analytics: Analytics = analyticsData?.data || {
    totalStudents: 0,
    activeStudents: 0,
    blockedStudents: 0,
    newThisMonth: 0,
    withPurchases: 0,
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ka-GE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) return <PageLoader />;

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">სტუდენტების მართვა</h1>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-500">
            მართეთ პლატფორმის სტუდენტები
          </p>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 text-gray-500">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm">სულ</span>
            </div>
            <p className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold text-gray-900">{analytics.totalStudents}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 text-green-500">
              <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm text-gray-500">აქტიური</span>
            </div>
            <p className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold text-gray-900">{analytics.activeStudents}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 text-red-500">
              <UserX className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm text-gray-500">დაბლოკ.</span>
            </div>
            <p className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold text-gray-900">{analytics.blockedStudents}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 text-blue-500">
              <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm text-gray-500">ახალი</span>
            </div>
            <p className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold text-gray-900">{analytics.newThisMonth}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-1.5 sm:gap-2 text-purple-500">
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm text-gray-500">შეძენებით</span>
            </div>
            <p className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold text-gray-900">{analytics.withPurchases}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="ძიება სახელით, ელფოსტით..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as StatusFilter);
                  setPage(1);
                }}
                className="flex-1 sm:flex-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="">ყველა</option>
                <option value="active">აქტიური</option>
                <option value="blocked">დაბლოკილი</option>
                <option value="deleted">წაშლილი</option>
              </select>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="newest">ახალი პირველი</option>
              <option value="oldest">ძველი პირველი</option>
              <option value="name">სახელით</option>
              <option value="email">ელფოსტით</option>
            </select>
          </div>
        </div>

        {/* Students List */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">სტუდენტი</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ელფოსტა</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">კურსები</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">სტატუსი</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">რეგისტრაცია</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">მოქმედებები</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {student.avatar ? (
                          <img src={student.avatar} alt={student.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-900">
                              {student.name.charAt(0)}{student.surname.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{student.name} {student.surname}</p>
                          {student.phone && <p className="text-xs text-gray-500">{student.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-900">{student.email}</span>
                        {student.emailVerified ? (
                          <CheckCircle className="w-4 h-4 text-green-500" title="ვერიფიცირებული" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" title="არავერიფიცირებული" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{student._count.purchases}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {student.deletedAt ? (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                          წაშლილი
                        </span>
                      ) : student.isActive ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                          აქტიური
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                          დაბლოკილი
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(student.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => router.push(`/admin/students/${student.id}`)}
                          className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg"
                          title="ნახვა"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {student.deletedAt ? (
                          <button
                            onClick={() => restoreMutation.mutate(student.id)}
                            disabled={restoreMutation.isPending}
                            className="p-2 text-gray-500 hover:text-green-600 hover:bg-gray-100 rounded-lg"
                            title="აღდგენა"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => toggleActiveMutation.mutate(student.id)}
                              disabled={toggleActiveMutation.isPending}
                              className={`p-2 rounded-lg ${
                                student.isActive
                                  ? 'text-gray-500 hover:text-orange-600 hover:bg-gray-100'
                                  : 'text-gray-500 hover:text-green-600 hover:bg-gray-100'
                              }`}
                              title={student.isActive ? 'დაბლოკვა' : 'განბლოკვა'}
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteModal({ open: true, student })}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg"
                              title="წაშლა"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile List */}
          <div className="md:hidden divide-y divide-gray-200">
            {students.map((student) => (
              <div key={student.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {student.avatar ? (
                      <img src={student.avatar} alt={student.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-primary-900">
                          {student.name.charAt(0)}{student.surname.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{student.name} {student.surname}</p>
                      <div className="flex items-center gap-1">
                        <p className="text-xs text-gray-500 truncate">{student.email}</p>
                        {student.emailVerified ? (
                          <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                  {student.deletedAt ? (
                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full flex-shrink-0">
                      წაშლილი
                    </span>
                  ) : student.isActive ? (
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full flex-shrink-0">
                      აქტიური
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full flex-shrink-0">
                      დაბლოკ.
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{student._count.purchases} კურსი</span>
                    <span>{formatDate(student.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => router.push(`/admin/students/${student.id}`)}
                      className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {student.deletedAt ? (
                      <button
                        onClick={() => restoreMutation.mutate(student.id)}
                        className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-gray-100 rounded"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => toggleActiveMutation.mutate(student.id)}
                          className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-gray-100 rounded"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteModal({ open: true, student })}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {students.length === 0 && (
            <div className="p-8 sm:p-12 text-center">
              <Users className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">სტუდენტები არ მოიძებნა</p>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="border-t border-gray-200 bg-gray-50 px-4 sm:px-6 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs sm:text-sm text-gray-500">
                  <span className="hidden sm:inline">გვერდი </span>{pagination.page}/{pagination.totalPages}
                  <span className="hidden sm:inline"> (სულ {pagination.total})</span>
                </p>
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 sm:p-2 text-gray-500 hover:bg-gray-200 rounded-lg disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                    className="p-1.5 sm:p-2 text-gray-500 hover:bg-gray-200 rounded-lg disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Delete Modal */}
        {deleteModal.open && deleteModal.student && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">სტუდენტის წაშლა</h3>
              <p className="text-sm text-gray-500 mb-4">
                დარწმუნებული ხართ, რომ გსურთ <strong>{deleteModal.student.name} {deleteModal.student.surname}</strong>-ის წაშლა?
              </p>
              <p className="text-xs text-gray-400 mb-4">
                სტუდენტი დაიმალება სიიდან, მაგრამ მონაცემები შეინახება და შესაძლებელი იქნება აღდგენა.
              </p>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  onClick={() => setDeleteModal({ open: false, student: null })}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm w-full sm:w-auto"
                >
                  გაუქმება
                </button>
                <button
                  onClick={() => {
                    if (deleteModal.student) {
                      deleteMutation.mutate(deleteModal.student.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm w-full sm:w-auto"
                >
                  წაშლა
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

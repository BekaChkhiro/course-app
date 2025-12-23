'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RefreshCcw,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Banknote,
  User,
  BookOpen,
  Calendar,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import {
  getAllRefundRequests,
  getRefundStats,
  approveRefundRequest,
  rejectRefundRequest,
  completeRefundManually,
  checkRefundStatus,
  RefundRequest,
  RefundStatus,
} from '@/lib/api/refundApi';

const statusConfig: Record<RefundStatus, { bg: string; text: string; icon: any; label: string }> = {
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, label: 'მოლოდინში' },
  APPROVED: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle, label: 'დადასტურებული' },
  PROCESSING: { bg: 'bg-purple-100', text: 'text-purple-800', icon: RefreshCcw, label: 'მუშავდება' },
  COMPLETED: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'დასრულებული' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, label: 'უარყოფილი' },
  FAILED: { bg: 'bg-gray-100', text: 'text-gray-800', icon: AlertCircle, label: 'წარუმატებელი' },
};

export default function AdminRefundsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<RefundStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // Fetch refund requests
  const { data, isLoading } = useQuery({
    queryKey: ['admin-refunds', statusFilter, page],
    queryFn: () => getAllRefundRequests({ status: statusFilter, page, limit: 20 }),
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['admin-refund-stats'],
    queryFn: getRefundStats,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: ({ id, adminNotes }: { id: string; adminNotes?: string }) =>
      approveRefundRequest(id, adminNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
      queryClient.invalidateQueries({ queryKey: ['admin-refund-stats'] });
      setSelectedRefund(null);
      setAdminNotes('');
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, rejectionReason, adminNotes }: { id: string; rejectionReason: string; adminNotes?: string }) =>
      rejectRefundRequest(id, rejectionReason, adminNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
      queryClient.invalidateQueries({ queryKey: ['admin-refund-stats'] });
      setSelectedRefund(null);
      setShowRejectModal(false);
      setRejectionReason('');
      setAdminNotes('');
    },
  });

  // Complete manually mutation (for when BOG callback didn't arrive)
  const completeMutation = useMutation({
    mutationFn: (id: string) => completeRefundManually(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
      queryClient.invalidateQueries({ queryKey: ['admin-refund-stats'] });
      setSelectedRefund(null);
    },
  });

  // Check BOG status mutation
  const checkStatusMutation = useMutation({
    mutationFn: (id: string) => checkRefundStatus(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
      queryClient.invalidateQueries({ queryKey: ['admin-refund-stats'] });
      // If status changed to COMPLETED, close the modal
      if (data.data?.status === 'COMPLETED') {
        setSelectedRefund(null);
      }
    },
  });

  const handleApprove = () => {
    if (selectedRefund) {
      approveMutation.mutate({ id: selectedRefund.id, adminNotes: adminNotes || undefined });
    }
  };

  const handleReject = () => {
    if (selectedRefund && rejectionReason) {
      rejectMutation.mutate({
        id: selectedRefund.id,
        rejectionReason,
        adminNotes: adminNotes || undefined,
      });
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ka-GE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ka-GE', {
      style: 'currency',
      currency: 'GEL',
    }).format(amount);
  };

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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">თანხის დაბრუნება</h1>
            <p className="text-gray-600">მართეთ თანხის დაბრუნების მოთხოვნები</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 text-yellow-600 mb-2">
                <Clock className="h-5 w-5" />
                <span className="text-sm font-medium">მოლოდინში</span>
              </div>
              <p className="text-2xl font-bold">{stats.pending}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 text-purple-600 mb-2">
                <RefreshCcw className="h-5 w-5" />
                <span className="text-sm font-medium">მუშავდება</span>
              </div>
              <p className="text-2xl font-bold">{stats.processing}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">დასრულებული</span>
              </div>
              <p className="text-2xl font-bold">{stats.completed}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <XCircle className="h-5 w-5" />
                <span className="text-sm font-medium">უარყოფილი</span>
              </div>
              <p className="text-2xl font-bold">{stats.rejected}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm font-medium">წარუმატებელი</span>
              </div>
              <p className="text-2xl font-bold">{stats.failed}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 text-primary-600 mb-2">
                <Banknote className="h-5 w-5" />
                <span className="text-sm font-medium">დაბრუნებული</span>
              </div>
              <p className="text-2xl font-bold">{formatAmount(Number(stats.totalRefundedAmount))}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as RefundStatus | 'all');
                  setPage(1);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">ყველა სტატუსი</option>
                <option value="PENDING">მოლოდინში</option>
                <option value="PROCESSING">მუშავდება</option>
                <option value="COMPLETED">დასრულებული</option>
                <option value="REJECTED">უარყოფილი</option>
                <option value="FAILED">წარუმატებელი</option>
              </select>
            </div>
          </div>
        </div>

        {/* Refund List */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {data?.items && data.items.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {data.items.map((refund) => {
                const StatusIcon = statusConfig[refund.status].icon;
                return (
                  <div
                    key={refund.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedRefund?.id === refund.id ? 'bg-primary-50' : ''
                    }`}
                    onClick={() => setSelectedRefund(refund)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                              statusConfig[refund.status].bg
                            } ${statusConfig[refund.status].text}`}
                          >
                            <StatusIcon className="h-3.5 w-3.5" />
                            {statusConfig[refund.status].label}
                          </span>
                          <span className="text-lg font-semibold text-primary-600">
                            {formatAmount(Number(refund.requestedAmount))}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>
                              {refund.user?.name} {refund.user?.surname}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4" />
                            <span className="truncate max-w-[200px]">{refund.course.title}</span>
                          </div>
                        </div>

                        <p className="text-sm text-gray-700 line-clamp-2">{refund.reason}</p>

                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(refund.createdAt)}
                        </div>
                      </div>

                      <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <RefreshCcw className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>მოთხოვნები ვერ მოიძებნა</p>
            </div>
          )}

          {/* Pagination */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-700">
                სულ: <span className="font-medium">{data.pagination.total}</span> მოთხოვნა
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="text-sm text-gray-700">
                  {page} / {data.pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={page === data.pagination.totalPages}
                  className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {selectedRefund && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">დაბრუნების მოთხოვნა</h2>
                  <button
                    onClick={() => {
                      setSelectedRefund(null);
                      setAdminNotes('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Status Badge */}
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${
                      statusConfig[selectedRefund.status].bg
                    } ${statusConfig[selectedRefund.status].text}`}
                  >
                    {statusConfig[selectedRefund.status].label}
                  </span>
                  <span className="text-2xl font-bold text-primary-600">
                    {formatAmount(Number(selectedRefund.requestedAmount))}
                  </span>
                </div>

                {/* User Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">სტუდენტი</h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-gray-500">სახელი:</span>{' '}
                      {selectedRefund.user?.name} {selectedRefund.user?.surname}
                    </p>
                    <p>
                      <span className="text-gray-500">ელ-ფოსტა:</span> {selectedRefund.user?.email}
                    </p>
                  </div>
                </div>

                {/* Course Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">კურსი</h3>
                  <p className="text-sm">{selectedRefund.course.title}</p>
                </div>

                {/* Reason */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">დაბრუნების მიზეზი</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4">
                    {selectedRefund.reason}
                  </p>
                </div>

                {/* Rejection Reason (if rejected) */}
                {selectedRefund.status === 'REJECTED' && selectedRefund.rejectionReason && (
                  <div>
                    <h3 className="font-medium text-red-600 mb-2">უარყოფის მიზეზი</h3>
                    <p className="text-sm text-red-700 bg-red-50 rounded-lg p-4">
                      {selectedRefund.rejectionReason}
                    </p>
                  </div>
                )}

                {/* Admin Notes Input (only for PENDING) */}
                {selectedRefund.status === 'PENDING' && (
                  <div>
                    <label className="block font-medium text-gray-900 mb-2">
                      ადმინის შენიშვნა (არასავალდებულო)
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="დაამატეთ შენიშვნა..."
                    />
                  </div>
                )}

                {/* Dates */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>მოთხოვნა: {formatDate(selectedRefund.createdAt)}</span>
                  </div>
                  {selectedRefund.completedAt && (
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      <span>დასრულდა: {formatDate(selectedRefund.completedAt)}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons (only for PENDING) */}
                {selectedRefund.status === 'PENDING' && (
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={handleApprove}
                      disabled={approveMutation.isPending}
                      className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {approveMutation.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <CheckCircle className="h-5 w-5" />
                      )}
                      დადასტურება
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={rejectMutation.isPending}
                      className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <XCircle className="h-5 w-5" />
                      უარყოფა
                    </button>
                  </div>
                )}

                {/* Actions for PROCESSING status (check BOG or manual complete) */}
                {selectedRefund.status === 'PROCESSING' && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 mb-4">
                      <div className="flex gap-3">
                        <AlertCircle className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-purple-700">
                          <p className="font-medium mb-1">BOG-ში გაიგზავნა</p>
                          <p className="text-purple-600">
                            შეამოწმეთ სტატუსი BOG-ში ან თუ თანხა უკვე დაბრუნდა, დაასრულეთ ხელით.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => checkStatusMutation.mutate(selectedRefund.id)}
                        disabled={checkStatusMutation.isPending || completeMutation.isPending}
                        className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {checkStatusMutation.isPending ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <RefreshCcw className="h-5 w-5" />
                        )}
                        BOG-ში შემოწმება
                      </button>
                      <button
                        onClick={() => completeMutation.mutate(selectedRefund.id)}
                        disabled={completeMutation.isPending || checkStatusMutation.isPending}
                        className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {completeMutation.isPending ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <CheckCircle className="h-5 w-5" />
                        )}
                        ხელით დასრულება
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && selectedRefund && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-red-600">მოთხოვნის უარყოფა</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block font-medium text-gray-900 mb-2">
                    უარყოფის მიზეზი <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="მიუთითეთ უარყოფის მიზეზი..."
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectionReason('');
                    }}
                    className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    გაუქმება
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={!rejectionReason || rejectMutation.isPending}
                    className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {rejectMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <XCircle className="h-5 w-5" />
                    )}
                    უარყოფა
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

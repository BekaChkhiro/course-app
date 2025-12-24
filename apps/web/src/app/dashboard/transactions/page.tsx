'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCcw, X, Loader2, AlertCircle, CheckCircle, Clock, XCircle, ArrowUp } from 'lucide-react';
import Link from 'next/link';
import StudentLayout from '@/components/student/StudentLayout';
import { studentApiClient, Transaction } from '@/lib/api/studentApi';
import { createRefundRequest, getMyRefundRequests, RefundRequest } from '@/lib/api/refundApi';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ka-GE', {
    style: 'currency',
    currency: 'GEL',
  }).format(amount);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ka-GE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    COMPLETED: { bg: 'bg-green-100', text: 'text-green-700', label: 'დასრულებული' },
    PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'მოლოდინში' },
    FAILED: { bg: 'bg-red-100', text: 'text-red-700', label: 'ჩაიშალა' },
    REFUNDED: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'დაბრუნებული' },
  };

  const config = statusConfig[status] || statusConfig.PENDING;

  return (
    <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

// Refund status badge
function RefundStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string; label: string; icon: any }> = {
    PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'მოლოდინში', icon: Clock },
    APPROVED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'დადასტურებული', icon: CheckCircle },
    PROCESSING: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'მუშავდება', icon: RefreshCcw },
    COMPLETED: { bg: 'bg-green-100', text: 'text-green-700', label: 'დასრულებული', icon: CheckCircle },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-700', label: 'უარყოფილი', icon: XCircle },
    FAILED: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'წარუმატებელი', icon: AlertCircle },
  };

  const config = statusConfig[status] || statusConfig.PENDING;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 10;

  // Refund modal state
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [refundReason, setRefundReason] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['transactions', page, limit],
    queryFn: () => studentApiClient.getTransactionHistory({ page, limit }),
    staleTime: 60000,
  });

  // Fetch existing refund requests
  const { data: myRefundRequests } = useQuery({
    queryKey: ['my-refund-requests'],
    queryFn: getMyRefundRequests,
  });

  // Create refund request mutation
  const refundMutation = useMutation({
    mutationFn: ({ purchaseId, reason }: { purchaseId: string; reason: string }) =>
      createRefundRequest(purchaseId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-refund-requests'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setShowRefundModal(false);
      setSelectedTransaction(null);
      setRefundReason('');
    },
  });

  const handleRefundClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowRefundModal(true);
  };

  const handleRefundSubmit = () => {
    if (selectedTransaction && refundReason.trim()) {
      refundMutation.mutate({
        purchaseId: selectedTransaction.id,
        reason: refundReason.trim(),
      });
    }
  };

  // Check if transaction has refund request (by purchaseId, not course.id)
  const getRefundForTransaction = (transaction: Transaction): RefundRequest | undefined => {
    return myRefundRequests?.find((r) => r.purchaseId === transaction.id);
  };

  const transactions = data?.data.transactions || [];
  const pagination = data?.data.pagination;
  const summary = data?.data.summary;

  // Check if can request refund (COMPLETED and no active refund request)
  const canRequestRefund = (transaction: Transaction): boolean => {
    if (transaction.status !== 'COMPLETED') return false;
    const existingRefund = getRefundForTransaction(transaction);
    if (!existingRefund) return true;
    // Can request again only if previous was rejected
    return existingRefund.status === 'REJECTED';
  };

  return (
    <StudentLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">ტრანზაქციების ისტორია</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-0.5 sm:mt-1">ნახეთ ყველა თქვენი კურსის შეძენა</p>
          </div>
          {myRefundRequests && myRefundRequests.length > 0 && (
            <Link
              href="/dashboard/refunds"
              className="flex items-center gap-2 px-4 py-2 bg-primary-900 text-white rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors"
            >
              <RefreshCcw className="h-4 w-4" />
              <span className="hidden sm:inline">ჩემი მოთხოვნები</span>
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {myRefundRequests.filter(r => r.status === 'PENDING' || r.status === 'PROCESSING').length}
              </span>
            </Link>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-primary-100 rounded-lg sm:rounded-xl">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">სულ შეძენები</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{summary?.totalPurchases || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-green-100 rounded-lg sm:rounded-xl">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">სულ დახარჯული</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{formatCurrency(summary?.totalSpent || 0)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="p-6 sm:p-8 text-center">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary-900 mx-auto"></div>
              <p className="text-gray-500 text-sm sm:text-base mt-3 sm:mt-4">ტრანზაქციების ჩატვირთვა...</p>
            </div>
          ) : error ? (
            <div className="p-6 sm:p-8 text-center">
              <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-400 mx-auto mb-3 sm:mb-4" />
              <p className="text-red-600 font-medium text-sm sm:text-base">ტრანზაქციების ჩატვირთვა ვერ მოხერხდა</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <svg className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1">ტრანზაქციები არ არის</h3>
              <p className="text-sm sm:text-base text-gray-500">თქვენი შეძენების ისტორია აქ გამოჩნდება</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {transactions.map((transaction) => {
                  const refundRequest = getRefundForTransaction(transaction);
                  return (
                    <div key={transaction.id} className={`p-4 ${transaction.isUpgrade ? 'bg-purple-50/50' : ''}`}>
                      {transaction.isUpgrade && (
                        <div className="flex items-center gap-1.5 text-purple-600 text-xs font-medium mb-2">
                          <ArrowUp className="h-3.5 w-3.5" />
                          <span>კურსის განახლება</span>
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden ${transaction.isUpgrade ? 'ring-2 ring-purple-300' : 'bg-gray-200'}`}>
                          {transaction.course.thumbnail ? (
                            <img
                              src={transaction.course.thumbnail}
                              alt={transaction.course.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary-900">
                              <svg className="w-5 h-5 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 line-clamp-1">{transaction.course.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{formatDate(transaction.purchasedAt)}</p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900">{formatCurrency(transaction.finalAmount)}</span>
                            </div>
                            <StatusBadge status={transaction.status} />
                          </div>

                          {/* Refund Status or Button */}
                          <div className="mt-3">
                            {refundRequest && refundRequest.status !== 'REJECTED' ? (
                              <div className="flex items-center gap-2">
                                <RefundStatusBadge status={refundRequest.status} />
                              </div>
                            ) : canRequestRefund(transaction) ? (
                              <button
                                onClick={() => handleRefundClick(transaction)}
                                className="flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-medium"
                              >
                                <RefreshCcw className="h-3.5 w-3.5" />
                                თანხის დაბრუნება
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        კურსი
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        თანხა
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ფასდაკლება
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        სტატუსი
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        მოქმედება
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((transaction) => {
                      const refundRequest = getRefundForTransaction(transaction);
                      return (
                        <tr key={transaction.id} className={`hover:bg-gray-50 transition-colors ${transaction.isUpgrade ? 'bg-purple-50/50' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden ${transaction.isUpgrade ? 'ring-2 ring-purple-300' : 'bg-gray-200'}`}>
                                {transaction.course.thumbnail ? (
                                  <img
                                    src={transaction.course.thumbnail}
                                    alt={transaction.course.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-primary-900">
                                    <svg className="w-6 h-6 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div>
                                {transaction.isUpgrade && (
                                  <div className="flex items-center gap-1.5 text-purple-600 text-xs font-medium mb-0.5">
                                    <ArrowUp className="h-3 w-3" />
                                    <span>კურსის განახლება</span>
                                  </div>
                                )}
                                <p className="font-medium text-gray-900">{transaction.course.title}</p>
                                <p className="text-sm text-gray-500">{formatDate(transaction.purchasedAt)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {transaction.discount ? (
                              <div className="space-y-1">
                                <p className="text-sm text-gray-500 line-through">{formatCurrency(transaction.originalAmount)}</p>
                                <p className="font-medium text-gray-900">{formatCurrency(transaction.finalAmount)}</p>
                              </div>
                            ) : (
                              <p className="font-medium text-gray-900">{formatCurrency(transaction.finalAmount)}</p>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {transaction.discount ? (
                              <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                                {transaction.discount.code} (-{transaction.discount.percentage}%)
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={transaction.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {refundRequest && refundRequest.status !== 'REJECTED' ? (
                              <RefundStatusBadge status={refundRequest.status} />
                            ) : canRequestRefund(transaction) ? (
                              <button
                                onClick={() => handleRefundClick(transaction)}
                                className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium"
                              >
                                <RefreshCcw className="h-4 w-4" />
                                თანხის დაბრუნება
                              </button>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                    {(page - 1) * limit + 1}-{Math.min(page * limit, pagination.total)} / {pagination.total}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      წინა
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={page === pagination.totalPages}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      შემდეგი
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Refund Request Modal */}
      {showRefundModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">თანხის დაბრუნების მოთხოვნა</h2>
                <button
                  onClick={() => {
                    setShowRefundModal(false);
                    setSelectedTransaction(null);
                    setRefundReason('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Course Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-gray-200">
                    {selectedTransaction.course.thumbnail ? (
                      <img
                        src={selectedTransaction.course.thumbnail}
                        alt={selectedTransaction.course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary-900">
                        <svg className="w-6 h-6 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{selectedTransaction.course.title}</p>
                    <p className="text-lg font-bold text-primary-600">{formatCurrency(selectedTransaction.finalAmount)}</p>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-orange-50 border border-orange-100 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-orange-700">
                    <p className="font-medium mb-1">გაითვალისწინეთ:</p>
                    <ul className="list-disc list-inside space-y-1 text-orange-600">
                      <li>მოთხოვნა განიხილება ადმინისტრატორის მიერ</li>
                      <li>დადასტურების შემდეგ თანხა დაგიბრუნდებათ</li>
                      <li>კურსზე წვდომა შეწყდება</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Reason Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  დაბრუნების მიზეზი <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="გთხოვთ, მიუთითოთ რატომ გსურთ თანხის დაბრუნება..."
                  required
                />
              </div>

              {/* Error Message */}
              {refundMutation.isError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {(refundMutation.error as any)?.message || 'შეცდომა მოთხოვნის გაგზავნისას'}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowRefundModal(false);
                    setSelectedTransaction(null);
                    setRefundReason('');
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  გაუქმება
                </button>
                <button
                  onClick={handleRefundSubmit}
                  disabled={!refundReason.trim() || refundMutation.isPending}
                  className="flex-1 bg-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {refundMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      იგზავნება...
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="h-5 w-5" />
                      მოთხოვნის გაგზავნა
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  );
}

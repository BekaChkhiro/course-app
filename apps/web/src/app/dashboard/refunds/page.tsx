'use client';

import { useQuery } from '@tanstack/react-query';
import {
  RefreshCcw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Banknote,
} from 'lucide-react';
import Link from 'next/link';
import StudentLayout from '@/components/student/StudentLayout';
import { getMyRefundRequests, RefundRequest, RefundStatus } from '@/lib/api/refundApi';

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
    hour: '2-digit',
    minute: '2-digit',
  });
}

const statusConfig: Record<RefundStatus, { bg: string; text: string; label: string; icon: any; description: string }> = {
  PENDING: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    label: 'მოლოდინში',
    icon: Clock,
    description: 'თქვენი მოთხოვნა ელოდება განხილვას',
  },
  APPROVED: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    label: 'დადასტურებული',
    icon: CheckCircle,
    description: 'მოთხოვნა დადასტურებულია, მუშავდება',
  },
  PROCESSING: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    label: 'მუშავდება',
    icon: RefreshCcw,
    description: 'თანხის დაბრუნება მუშავდება ბანკში',
  },
  COMPLETED: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    label: 'დასრულებული',
    icon: CheckCircle,
    description: 'თანხა წარმატებით დაგიბრუნდათ',
  },
  REJECTED: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    label: 'უარყოფილი',
    icon: XCircle,
    description: 'მოთხოვნა უარყოფილია',
  },
  FAILED: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    label: 'წარუმატებელი',
    icon: AlertCircle,
    description: 'დაბრუნება ვერ განხორციელდა',
  },
};

function RefundCard({ refund }: { refund: RefundRequest }) {
  const config = statusConfig[refund.status];
  const StatusIcon = config.icon;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header with status */}
      <div className={`px-4 py-3 ${config.bg} border-b border-gray-200`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${config.text}`} />
            <span className={`font-medium ${config.text}`}>{config.label}</span>
          </div>
          <span className="text-lg font-bold text-gray-900">
            {formatCurrency(Number(refund.requestedAmount))}
          </span>
        </div>
        <p className={`text-sm mt-1 ${config.text} opacity-80`}>{config.description}</p>
      </div>

      {/* Course info */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-200">
            {refund.course.thumbnail ? (
              <img
                src={refund.course.thumbnail}
                alt={refund.course.title}
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
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">{refund.course.title}</h3>
            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
              <Calendar className="h-4 w-4" />
              {formatDate(refund.createdAt)}
            </div>
          </div>
        </div>

        {/* Reason */}
        <div className="mt-4">
          <p className="text-sm text-gray-500 mb-1">მიზეზი:</p>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{refund.reason}</p>
        </div>

        {/* Rejection reason if rejected */}
        {refund.status === 'REJECTED' && refund.rejectionReason && (
          <div className="mt-4">
            <p className="text-sm text-red-500 mb-1">უარყოფის მიზეზი:</p>
            <p className="text-sm text-red-700 bg-red-50 rounded-lg p-3">{refund.rejectionReason}</p>
          </div>
        )}

        {/* Refunded amount if completed */}
        {refund.status === 'COMPLETED' && refund.refundedAmount && (
          <div className="mt-4 flex items-center gap-2 text-green-600">
            <Banknote className="h-5 w-5" />
            <span className="font-medium">დაბრუნებული: {formatCurrency(Number(refund.refundedAmount))}</span>
          </div>
        )}

        {/* Completion date */}
        {refund.completedAt && (
          <div className="mt-2 text-sm text-gray-500">
            დასრულდა: {formatDate(refund.completedAt)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentRefundsPage() {
  const { data: refunds, isLoading, error } = useQuery({
    queryKey: ['my-refund-requests'],
    queryFn: getMyRefundRequests,
  });

  // Group refunds by status
  const activeRefunds = refunds?.filter((r) => ['PENDING', 'APPROVED', 'PROCESSING'].includes(r.status)) || [];
  const completedRefunds = refunds?.filter((r) => ['COMPLETED', 'REJECTED', 'FAILED'].includes(r.status)) || [];

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/transactions"
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">ჩემი მოთხოვნები</h1>
            <p className="text-sm sm:text-base text-gray-500">თანხის დაბრუნების მოთხოვნების ისტორია</p>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-900 mx-auto"></div>
            <p className="text-gray-500 mt-4">იტვირთება...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600 font-medium">შეცდომა მოთხოვნების ჩატვირთვისას</p>
          </div>
        ) : !refunds || refunds.length === 0 ? (
          <div className="bg-white rounded-xl p-8 sm:p-12 text-center">
            <RefreshCcw className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">მოთხოვნები არ არის</h3>
            <p className="text-gray-500 mb-6">თანხის დაბრუნების მოთხოვნები აქ გამოჩნდება</p>
            <Link
              href="/dashboard/transactions"
              className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              ტრანზაქციებზე დაბრუნება
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Requests */}
            {activeRefunds.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  აქტიური მოთხოვნები ({activeRefunds.length})
                </h2>
                <div className="space-y-4">
                  {activeRefunds.map((refund) => (
                    <RefundCard key={refund.id} refund={refund} />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Requests */}
            {completedRefunds.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-gray-600" />
                  დასრულებული ({completedRefunds.length})
                </h2>
                <div className="space-y-4">
                  {completedRefunds.map((refund) => (
                    <RefundCard key={refund.id} refund={refund} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}

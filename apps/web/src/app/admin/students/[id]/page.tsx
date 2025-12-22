'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Mail,
  MailCheck,
  Phone,
  Calendar,
  ShoppingBag,
  BookOpen,
  Monitor,
  Ban,
  Trash2,
  RotateCcw,
  Send,
  RefreshCw,
  X,
  Smartphone,
  Tablet,
  Laptop,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { studentsApi } from '@/lib/api/adminApi';
import { PageLoader } from '@/components/ui/LoadingSpinner';

interface Purchase {
  id: string;
  courseId: string;
  amount: string;
  finalAmount: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  bogOrderId: string | null;
  paidAt: string | null;
  createdAt: string;
  course: {
    id: string;
    title: string;
    slug: string;
    thumbnail: string | null;
  };
}

interface DeviceSession {
  id: string;
  deviceName: string;
  deviceType: string;
  browser: string | null;
  ipAddress: string;
  lastActiveAt: string;
  createdAt: string;
}

interface StudentDetails {
  id: string;
  email: string;
  name: string;
  surname: string;
  phone: string | null;
  avatar: string | null;
  bio: string | null;
  isActive: boolean;
  emailVerified: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  purchases: Purchase[];
  deviceSessions: DeviceSession[];
  progress: { id: string; isCompleted: boolean }[];
  preferences: any;
  studyStreak: { currentStreak: number; longestStreak: number } | null;
}

interface Stats {
  totalCourses: number;
  totalSpent: number;
  completedChapters: number;
  totalChapters: number;
  activeDevices: number;
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'მოლოდინში' },
  COMPLETED: { bg: 'bg-green-100', text: 'text-green-700', label: 'შეძენილი' },
  FAILED: { bg: 'bg-red-100', text: 'text-red-700', label: 'წარუმატებელი' },
  REFUNDED: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'დაბრუნებული' },
};

const deviceIcons: Record<string, any> = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: Laptop,
};

export default function StudentDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'courses' | 'devices'>('courses');
  const [emailModal, setEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [refundModal, setRefundModal] = useState<{ open: boolean; purchase: Purchase | null }>({
    open: false,
    purchase: null,
  });
  const [refundReason, setRefundReason] = useState('');

  // Fetch student details
  const { data, isLoading, error } = useQuery({
    queryKey: ['student', id],
    queryFn: () => studentsApi.getById(id as string).then((res) => res.data),
    enabled: !!id,
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: () => studentsApi.toggleActive(id as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => studentsApi.delete(id as string),
    onSuccess: () => {
      router.push('/admin/students');
    },
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: () => studentsApi.restore(id as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] });
    },
  });

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: () => studentsApi.sendEmail(id as string, emailSubject, emailContent),
    onSuccess: () => {
      setEmailModal(false);
      setEmailSubject('');
      setEmailContent('');
    },
  });

  // Refund mutation
  const refundMutation = useMutation({
    mutationFn: (purchaseId: string) => studentsApi.refundPurchase(id as string, purchaseId, refundReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] });
      setRefundModal({ open: false, purchase: null });
      setRefundReason('');
    },
  });

  // Revoke device mutation
  const revokeDeviceMutation = useMutation({
    mutationFn: (sessionId: string) => studentsApi.revokeDevice(id as string, sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] });
    },
  });

  // Resend verification email mutation
  const resendVerificationMutation = useMutation({
    mutationFn: () => studentsApi.resendVerification(id as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] });
    },
  });

  const student: StudentDetails | null = data?.data?.student || null;
  const stats: Stats = data?.data?.stats || {
    totalCourses: 0,
    totalSpent: 0,
    completedChapters: 0,
    totalChapters: 0,
    activeDevices: 0,
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ka-GE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ka-GE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) return <PageLoader />;

  if (error || !student) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">სტუდენტი ვერ მოიძებნა</p>
          <button
            onClick={() => router.push('/admin/students')}
            className="mt-4 text-primary-600 hover:text-primary-700"
          >
            უკან დაბრუნება
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Back Button */}
        <button
          onClick={() => router.push('/admin/students')}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">უკან</span>
        </button>

        {/* Profile Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Avatar */}
            {student.avatar ? (
              <img
                src={student.avatar}
                alt={student.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover mx-auto sm:mx-0"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary-100 flex items-center justify-center mx-auto sm:mx-0">
                <span className="text-xl sm:text-2xl font-bold text-primary-900">
                  {student.name.charAt(0)}{student.surname.charAt(0)}
                </span>
              </div>
            )}

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {student.name} {student.surname}
                </h1>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  {student.deletedAt ? (
                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                      წაშლილი
                    </span>
                  ) : student.isActive ? (
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                      აქტიური
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                      დაბლოკილი
                    </span>
                  )}
                  {student.emailVerified ? (
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                      ვერიფიცირებული
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
                      არავერიფიცირებული
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 text-sm text-gray-500">
                <div className="flex items-center justify-center sm:justify-start gap-1.5">
                  <Mail className="w-4 h-4" />
                  <span>{student.email}</span>
                </div>
                {student.phone && (
                  <div className="flex items-center justify-center sm:justify-start gap-1.5">
                    <Phone className="w-4 h-4" />
                    <span>{student.phone}</span>
                  </div>
                )}
                <div className="flex items-center justify-center sm:justify-start gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>რეგისტრაცია: {formatDate(student.createdAt)}</span>
                </div>
              </div>

              {student.bio && (
                <p className="mt-3 text-sm text-gray-600">{student.bio}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap justify-center sm:justify-end gap-2">
              {!student.emailVerified && (
                <button
                  onClick={() => resendVerificationMutation.mutate()}
                  disabled={resendVerificationMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-sm hover:bg-yellow-200 disabled:opacity-50"
                >
                  <MailCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">ვერიფიკაციის გაგზავნა</span>
                </button>
              )}
              <button
                onClick={() => setEmailModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg text-sm hover:bg-primary-200"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">ელფოსტა</span>
              </button>
              {student.deletedAt ? (
                <button
                  onClick={() => restoreMutation.mutate()}
                  disabled={restoreMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">აღდგენა</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => toggleActiveMutation.mutate()}
                    disabled={toggleActiveMutation.isPending}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${
                      student.isActive
                        ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    <Ban className="w-4 h-4" />
                    <span className="hidden sm:inline">{student.isActive ? 'დაბლოკვა' : 'განბლოკვა'}</span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('დარწმუნებული ხართ?')) {
                        deleteMutation.mutate();
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">წაშლა</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 text-purple-500">
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm text-gray-500">კურსები</span>
            </div>
            <p className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 text-green-500">
              <span className="text-lg">₾</span>
              <span className="text-xs sm:text-sm text-gray-500">დახარჯული</span>
            </div>
            <p className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold text-gray-900">{stats.totalSpent.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 text-blue-500">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm text-gray-500">დასრულ.</span>
            </div>
            <p className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold text-gray-900">
              {stats.completedChapters}/{stats.totalChapters}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 text-orange-500">
              <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm text-gray-500">მოწყობ.</span>
            </div>
            <p className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold text-gray-900">{stats.activeDevices}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('courses')}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'courses'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                შეძენილი კურსები ({student.purchases.length})
              </button>
              <button
                onClick={() => setActiveTab('devices')}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'devices'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                მოწყობილობები ({student.deviceSessions.length})
              </button>
            </div>
          </div>

          {/* Courses Tab */}
          {activeTab === 'courses' && (
            <div className="divide-y divide-gray-200">
              {student.purchases.length === 0 ? (
                <div className="p-8 text-center">
                  <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">კურსები არ არის შეძენილი</p>
                </div>
              ) : (
                student.purchases.map((purchase) => (
                  <div key={purchase.id} className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                      {/* Thumbnail */}
                      {purchase.course.thumbnail ? (
                        <img
                          src={purchase.course.thumbnail}
                          alt={purchase.course.title}
                          className="w-full sm:w-24 h-32 sm:h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-full sm:w-24 h-32 sm:h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-gray-400" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{purchase.course.title}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-gray-500">
                          <span>{Number(purchase.finalAmount).toFixed(2)} ₾</span>
                          <span>{formatDate(purchase.createdAt)}</span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[purchase.status].bg} ${statusColors[purchase.status].text}`}>
                            {statusColors[purchase.status].label}
                          </span>
                        </div>
                      </div>

                      {/* Refund Button */}
                      {purchase.status === 'COMPLETED' && (
                        <button
                          onClick={() => setRefundModal({ open: true, purchase })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                        >
                          <RefreshCw className="w-4 h-4" />
                          რეფანდი
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Devices Tab */}
          {activeTab === 'devices' && (
            <div className="divide-y divide-gray-200">
              {student.deviceSessions.length === 0 ? (
                <div className="p-8 text-center">
                  <Monitor className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">აქტიური მოწყობილობები არ არის</p>
                </div>
              ) : (
                student.deviceSessions.map((session) => {
                  const DeviceIcon = deviceIcons[session.deviceType] || Laptop;
                  return (
                    <div key={session.id} className="p-4 sm:p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <DeviceIcon className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{session.deviceName}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            {session.browser && <span>{session.browser}</span>}
                            <span>•</span>
                            <span>{session.ipAddress}</span>
                            <span>•</span>
                            <span>ბოლო აქტივობა: {formatDateTime(session.lastActiveAt)}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => revokeDeviceMutation.mutate(session.id)}
                          disabled={revokeDeviceMutation.isPending}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          title="გაუქმება"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Email Modal */}
        {emailModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-lg w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                ელფოსტის გაგზავნა
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                მიმღები: <strong>{student.name} {student.surname}</strong> ({student.email})
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">სათაური</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="შეიყვანეთ სათაური..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">შინაარსი</label>
                  <textarea
                    value={emailContent}
                    onChange={(e) => setEmailContent(e.target.value)}
                    placeholder="დაწერეთ შეტყობინება..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                    rows={5}
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  onClick={() => setEmailModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
                >
                  გაუქმება
                </button>
                <button
                  onClick={() => sendEmailMutation.mutate()}
                  disabled={!emailSubject || !emailContent || sendEmailMutation.isPending}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm"
                >
                  გაგზავნა
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Refund Modal */}
        {refundModal.open && refundModal.purchase && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">თანხის დაბრუნება</h3>
              <p className="text-sm text-gray-500 mb-2">
                კურსი: <strong>{refundModal.purchase.course.title}</strong>
              </p>
              <p className="text-sm text-gray-500 mb-4">
                თანხა: <strong>{Number(refundModal.purchase.finalAmount).toFixed(2)} ₾</strong>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">მიზეზი (არასავალდებულო)</label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="შეიყვანეთ მიზეზი..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                  rows={3}
                />
              </div>
              <div className="mt-4 flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  onClick={() => setRefundModal({ open: false, purchase: null })}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
                >
                  გაუქმება
                </button>
                <button
                  onClick={() => refundMutation.mutate(refundModal.purchase!.id)}
                  disabled={refundMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
                >
                  დაბრუნება
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

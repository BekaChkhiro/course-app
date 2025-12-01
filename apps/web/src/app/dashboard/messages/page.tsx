'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import StudentLayout from '@/components/student/StudentLayout';
import { studentApiClient } from '@/lib/api/studentApi';
import MessageComposer from '@/components/student/messaging/MessageComposer';
import MessageThread from '@/components/student/messaging/MessageThread';

type FilterStatus = 'all' | 'OPEN' | 'IN_PROGRESS' | 'AWAITING_RESPONSE' | 'RESOLVED' | 'CLOSED';

function MessageListItem({
  message,
  isSelected,
  onClick,
}: {
  message: any;
  isSelected: boolean;
  onClick: () => void;
}) {
  const statusColors: Record<string, string> = {
    OPEN: 'bg-blue-100 text-blue-700',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
    AWAITING_RESPONSE: 'bg-purple-100 text-purple-700',
    RESOLVED: 'bg-green-100 text-green-700',
    CLOSED: 'bg-gray-100 text-gray-700',
  };

  const priorityIndicators: Record<string, string> = {
    LOW: 'border-l-gray-300',
    MEDIUM: 'border-l-blue-500',
    HIGH: 'border-l-orange-500',
    URGENT: 'border-l-red-500',
  };

  const hasUnread = !message.isRead;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 border-b border-gray-100 transition-colors border-l-4 ${
        priorityIndicators[message.priority] || 'border-l-gray-300'
      } ${isSelected ? 'bg-indigo-50' : hasUnread ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h4 className={`text-sm truncate ${hasUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
          {message.subject}
        </h4>
        {hasUnread && (
          <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full"></span>
        )}
      </div>
      <p className="text-xs text-gray-500 truncate mb-2">{message.content}</p>
      <div className="flex items-center justify-between">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[message.status] || 'bg-gray-100 text-gray-700'}`}>
          {message.status?.replace('_', ' ')}
        </span>
        <span className="text-xs text-gray-400">
          {new Date(message.updatedAt).toLocaleDateString()}
        </span>
      </div>
      {message.course && (
        <p className="text-xs text-gray-400 mt-1 truncate">
          {message.course.title}
        </p>
      )}
    </button>
  );
}

export default function MessagesPage() {
  const queryClient = useQueryClient();
  const [showComposer, setShowComposer] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['myMessages', filterStatus],
    queryFn: () =>
      studentApiClient.getMyMessages({
        status: filterStatus !== 'all' ? filterStatus : undefined,
        limit: 50,
      }),
    staleTime: 30000,
  });

  const { data: unreadData } = useQuery({
    queryKey: ['unreadMessageCount'],
    queryFn: () => studentApiClient.getUnreadMessageCount(),
    staleTime: 30000,
    refetchInterval: 60000, // Poll for new messages
  });

  const deleteMutation = useMutation({
    mutationFn: (messageId: string) => studentApiClient.deleteMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myMessages'] });
      queryClient.invalidateQueries({ queryKey: ['unreadMessageCount'] });
      setSelectedMessageId(null);
    },
  });

  const messages = data?.data?.messages || [];
  const unreadCount = unreadData?.data?.count || 0;

  const filterOptions: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: 'ყველა შეტყობინება' },
    { value: 'OPEN', label: 'ღია' },
    { value: 'IN_PROGRESS', label: 'მიმდინარე' },
    { value: 'AWAITING_RESPONSE', label: 'პასუხის მოლოდინში' },
    { value: 'RESOLVED', label: 'გადაჭრილი' },
    { value: 'CLOSED', label: 'დახურული' },
  ];

  // For mobile: determine what to show
  const showMessageList = !selectedMessageId || window.innerWidth >= 1024;
  const showMessageThread = selectedMessageId;

  return (
    <StudentLayout>
      <div className="h-[calc(100vh-180px)] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">შეტყობინებები</h1>
            <p className="text-gray-500 mt-1">
              {unreadCount > 0 ? `${unreadCount} წაუკითხავი შეტყობინება` : 'დაუკავშირდით მხარდაჭერას'}
            </p>
          </div>
          <button
            onClick={() => {
              setShowComposer(true);
              setSelectedMessageId(null);
            }}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            ახალი შეტყობინება
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex">
          {/* Message List */}
          <div className={`w-full lg:w-96 border-r border-gray-200 flex flex-col ${
            selectedMessageId ? 'hidden lg:flex' : 'flex'
          }`}>
            {/* Filters */}
            <div className="flex-shrink-0 p-3 border-b border-gray-200">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {filterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-24" />
                  ))}
                </div>
              ) : error ? (
                <div className="p-4 text-center text-red-500">
                  შეტყობინებების ჩატვირთვა ვერ მოხერხდა
                </div>
              ) : messages.length === 0 ? (
                <div className="p-8 text-center">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-500">შეტყობინებები ჯერ არ არის</p>
                  <button
                    onClick={() => setShowComposer(true)}
                    className="mt-4 text-indigo-600 hover:underline"
                  >
                    საუბრის დაწყება
                  </button>
                </div>
              ) : (
                messages.map((message: any) => (
                  <MessageListItem
                    key={message.id}
                    message={message}
                    isSelected={message.id === selectedMessageId}
                    onClick={() => {
                      setSelectedMessageId(message.id);
                      setShowComposer(false);
                    }}
                  />
                ))
              )}
            </div>
          </div>

          {/* Message Detail / Composer */}
          <div className={`flex-1 flex flex-col ${
            !selectedMessageId && !showComposer ? 'hidden lg:flex' : 'flex'
          }`}>
            {showComposer ? (
              <div className="h-full overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">ახალი შეტყობინება</h2>
                    <button
                      onClick={() => setShowComposer(false)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <MessageComposer
                    onSuccess={() => {
                      setShowComposer(false);
                      queryClient.invalidateQueries({ queryKey: ['myMessages'] });
                    }}
                    onCancel={() => setShowComposer(false)}
                  />
                </div>
              </div>
            ) : selectedMessageId ? (
              <MessageThread
                messageId={selectedMessageId}
                onBack={() => setSelectedMessageId(null)}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-center p-8">
                <div>
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">აირჩიეთ შეტყობინება</h3>
                  <p className="text-gray-500 mb-4">
                    აირჩიეთ საუბარი სიიდან ან დაიწყეთ ახალი
                  </p>
                  <button
                    onClick={() => setShowComposer(true)}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    ახალი შეტყობინება
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Help Section */}
        <div className="flex-shrink-0 mt-4 bg-blue-50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-blue-900">გჭირდებათ დახმარება?</h4>
              <p className="text-sm text-blue-700 mt-1">
                ჩვენი მხარდაჭერის გუნდი ჩვეულებრივ პასუხობს 24 საათში. სასწრაფო საკითხებისთვის, გთხოვთ მონიშნოთ თქვენი შეტყობინება როგორც "სასწრაფო" პრიორიტეტი.
              </p>
            </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}

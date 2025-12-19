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
    AWAITING_RESPONSE: 'bg-accent-100 text-accent-600',
    RESOLVED: 'bg-green-100 text-green-700',
    CLOSED: 'bg-gray-100 text-gray-700',
  };

  const statusLabels: Record<string, string> = {
    OPEN: 'ღია',
    IN_PROGRESS: 'მიმდინარე',
    AWAITING_RESPONSE: 'პასუხის მოლოდინში',
    RESOLVED: 'გადაჭრილი',
    CLOSED: 'დახურული',
  };

  const priorityIndicators: Record<string, string> = {
    LOW: 'border-l-gray-300',
    MEDIUM: 'border-l-blue-500',
    HIGH: 'border-l-orange-500',
    URGENT: 'border-l-red-500',
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const hasUnread = !message.isRead;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 sm:p-4 border-b border-gray-100 transition-colors border-l-4 ${
        priorityIndicators[message.priority] || 'border-l-gray-300'
      } ${isSelected ? 'bg-primary-50' : hasUnread ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
    >
      <div className="flex items-start justify-between gap-2 mb-0.5 sm:mb-1">
        <h4 className={`text-xs sm:text-sm truncate ${hasUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
          {message.subject}
        </h4>
        {hasUnread && (
          <span className="flex-shrink-0 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full mt-1"></span>
        )}
      </div>
      <p className="text-[11px] sm:text-xs text-gray-500 truncate mb-1.5 sm:mb-2">{message.content}</p>
      <div className="flex items-center justify-between gap-2">
        <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${statusColors[message.status] || 'bg-gray-100 text-gray-700'}`}>
          {statusLabels[message.status] || message.status}
        </span>
        <span className="text-[10px] sm:text-xs text-gray-400 flex-shrink-0">
          {formatDate(message.updatedAt)}
        </span>
      </div>
      {message.course && (
        <p className="text-[10px] sm:text-xs text-gray-400 mt-1 truncate">
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
    { value: 'all', label: 'ყველა' },
    { value: 'OPEN', label: 'ღია' },
    { value: 'IN_PROGRESS', label: 'მიმდინარე' },
    { value: 'AWAITING_RESPONSE', label: 'მოლოდინში' },
    { value: 'RESOLVED', label: 'გადაჭრილი' },
    { value: 'CLOSED', label: 'დახურული' },
  ];

  // For mobile: determine what to show
  const showMessageList = !selectedMessageId || window.innerWidth >= 1024;
  const showMessageThread = selectedMessageId;

  return (
    <StudentLayout>
      <div className="h-[calc(100vh-140px)] sm:h-[calc(100vh-180px)] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between gap-3 mb-3 sm:mb-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">შეტყობინებები</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-0.5 sm:mt-1 truncate">
              {unreadCount > 0 ? `${unreadCount} წაუკითხავი` : 'დაუკავშირდით მხარდაჭერას'}
            </p>
          </div>
          <button
            onClick={() => {
              setShowComposer(true);
              setSelectedMessageId(null);
            }}
            className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 bg-accent-600 text-white rounded-full sm:rounded-lg hover:bg-accent-700 transition-colors"
          >
            <svg className="w-5 h-5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">ახალი შეტყობინება</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex">
          {/* Message List */}
          <div className={`w-full lg:w-96 border-r border-gray-200 flex flex-col ${
            selectedMessageId ? 'hidden lg:flex' : 'flex'
          }`}>
            {/* Filters */}
            <div className="flex-shrink-0 p-2 sm:p-3 border-b border-gray-200">
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFilterStatus(option.value)}
                    className={`flex-shrink-0 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium rounded-full transition-colors ${
                      filterStatus === option.value
                        ? 'bg-primary-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-16 sm:h-24" />
                  ))}
                </div>
              ) : error ? (
                <div className="p-4 text-center text-red-500 text-sm">
                  შეტყობინებების ჩატვირთვა ვერ მოხერხდა
                </div>
              ) : messages.length === 0 ? (
                <div className="p-6 sm:p-8 text-center">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-500 text-sm sm:text-base">შეტყობინებები ჯერ არ არის</p>
                  <button
                    onClick={() => setShowComposer(true)}
                    className="mt-3 sm:mt-4 text-sm text-primary-900 hover:underline"
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
              <div className="h-full overflow-y-auto p-4 sm:p-6">
                <div className="max-w-2xl mx-auto">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900">ახალი შეტყობინება</h2>
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
              <div className="h-full flex items-center justify-center text-center p-6 sm:p-8">
                <div>
                  <svg className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1">აირჩიეთ შეტყობინება</h3>
                  <p className="text-sm sm:text-base text-gray-500 mb-3 sm:mb-4">
                    აირჩიეთ საუბარი სიიდან ან დაიწყეთ ახალი
                  </p>
                  <button
                    onClick={() => setShowComposer(true)}
                    className="inline-flex items-center px-3 sm:px-4 py-2 text-sm bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    ახალი შეტყობინება
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Help Section - Hidden on mobile */}
        <div className="hidden sm:block flex-shrink-0 mt-3 sm:mt-4 bg-blue-50 rounded-xl p-3 sm:p-4">
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-medium text-blue-900">გჭირდებათ დახმარება?</h4>
              <p className="text-xs sm:text-sm text-blue-700 mt-0.5 sm:mt-1">
                ჩვენი გუნდი პასუხობს 24 საათში. სასწრაფოდ მონიშნეთ "სასწრაფო" პრიორიტეტი.
              </p>
            </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}

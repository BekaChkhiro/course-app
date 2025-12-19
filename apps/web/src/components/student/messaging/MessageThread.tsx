'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApiClient } from '@/lib/api/studentApi';

interface MessageThreadProps {
  messageId: string;
  onBack?: () => void;
}

export default function MessageThread({ messageId, onBack }: MessageThreadProps) {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [replyContent, setReplyContent] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['message', messageId],
    queryFn: () => studentApiClient.getMessage(messageId),
    staleTime: 30000,
    refetchInterval: 30000, // Poll for new replies
  });

  const replyMutation = useMutation({
    mutationFn: (content: string) => studentApiClient.replyToMessage(messageId, content),
    onSuccess: () => {
      setReplyContent('');
      queryClient.invalidateQueries({ queryKey: ['message', messageId] });
      queryClient.invalidateQueries({ queryKey: ['myMessages'] });
    },
  });

  const message = data?.data;

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [message?.replies]);

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (replyContent.trim()) {
      replyMutation.mutate(replyContent.trim());
    }
  };

  const priorityColors: Record<string, string> = {
    LOW: 'bg-gray-100 text-gray-700',
    MEDIUM: 'bg-blue-100 text-blue-700',
    HIGH: 'bg-orange-100 text-orange-700',
    URGENT: 'bg-red-100 text-red-700',
  };

  const statusColors: Record<string, string> = {
    OPEN: 'bg-blue-100 text-blue-700',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
    AWAITING_RESPONSE: 'bg-accent-100 text-accent-600',
    RESOLVED: 'bg-green-100 text-green-700',
    CLOSED: 'bg-gray-100 text-gray-700',
  };

  const statusLabels: Record<string, string> = {
    OPEN: 'ღია',
    IN_PROGRESS: 'მუშავდება',
    AWAITING_RESPONSE: 'პასუხის მოლოდინში',
    RESOLVED: 'გადაწყვეტილი',
    CLOSED: 'დახურული',
  };

  const priorityLabels: Record<string, string> = {
    LOW: 'დაბალი',
    MEDIUM: 'საშუალო',
    HIGH: 'მაღალი',
    URGENT: 'სასწრაფო',
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-900"></div>
      </div>
    );
  }

  if (error || !message) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-500">შეტყობინების ჩატვირთვა ვერ მოხერხდა</p>
          {onBack && (
            <button onClick={onBack} className="mt-4 text-primary-900 hover:underline">
              უკან დაბრუნება
            </button>
          )}
        </div>
      </div>
    );
  }

  const isResolved = message.status === 'RESOLVED' || message.status === 'CLOSED';

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 p-4">
        <div className="flex items-start gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 truncate">{message.subject}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[message.status] || 'bg-gray-100 text-gray-700'}`}>
                {statusLabels[message.status] || message.status}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[message.priority] || 'bg-gray-100 text-gray-700'}`}>
                {priorityLabels[message.priority] || message.priority} პრიორიტეტი
              </span>
              {message.course && (
                <span className="text-xs text-gray-500">
                  • {message.course.title}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {/* Original Message - Student's message on right */}
        <div className="flex justify-end">
          <div className="max-w-[80%]">
            <div className="flex items-center gap-2 mb-1 justify-end">
              <span className="text-xs text-gray-500">
                {formatDate(message.createdAt)}
              </span>
              <span className="font-medium text-gray-900 text-sm">
                მე
              </span>
            </div>
            <div className="bg-primary-900 text-white rounded-2xl rounded-tr-md p-3">
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
            </div>
          </div>
        </div>

        {/* Replies */}
        {message.replies?.map((reply: any) => {
          const isAdmin = reply.user?.role === 'ADMIN';
          return (
            <div key={reply.id} className={`flex ${isAdmin ? 'justify-start' : 'justify-end'}`}>
              <div className="max-w-[80%]">
                <div className={`flex items-center gap-2 mb-1 ${isAdmin ? 'justify-start' : 'justify-end'}`}>
                  {isAdmin ? (
                    <>
                      <span className="font-medium text-gray-900 text-sm">
                        მხარდაჭერა
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(reply.createdAt)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-gray-500">
                        {formatDate(reply.createdAt)}
                      </span>
                      <span className="font-medium text-gray-900 text-sm">
                        მე
                      </span>
                    </>
                  )}
                </div>
                <div className={`rounded-2xl p-3 ${
                  isAdmin
                    ? 'bg-white border border-gray-200 rounded-tl-md text-gray-800'
                    : 'bg-primary-900 text-white rounded-tr-md'
                }`}>
                  <p className="whitespace-pre-wrap text-sm">{reply.content}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Input */}
      {!isResolved ? (
        <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-white">
          <form onSubmit={handleSubmitReply}>
            <div className="flex gap-3">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="დაწერეთ პასუხი..."
                rows={2}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
              />
              <button
                type="submit"
                disabled={!replyContent.trim() || replyMutation.isPending}
                className="px-4 py-2 bg-primary-900 text-white rounded-xl hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-end"
              >
                {replyMutation.isPending ? (
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
            {replyMutation.error && (
              <p className="mt-2 text-sm text-red-600">
                პასუხის გაგზავნა ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან.
              </p>
            )}
          </form>
        </div>
      ) : (
        <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-gray-50 text-center">
          <p className="text-sm text-gray-500">
            ეს საუბარი {message.status === 'RESOLVED' ? 'გადაწყვეტილია' : 'დახურულია'}.
            თუ დამატებით დახმარება გჭირდებათ, გთხოვთ გახსნათ ახალი შეტყობინება.
          </p>
        </div>
      )}
    </div>
  );
}

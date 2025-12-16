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
    OPEN: 'Open',
    IN_PROGRESS: 'In Progress',
    AWAITING_RESPONSE: 'Awaiting Response',
    RESOLVED: 'Resolved',
    CLOSED: 'Closed',
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
          <p className="text-gray-500">Failed to load message</p>
          {onBack && (
            <button onClick={onBack} className="mt-4 text-primary-900 hover:underline">
              Go back
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
                {message.priority} Priority
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Original Message */}
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-sm font-medium text-primary-900">
              {message.user?.name?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-900">
                {message.user?.name} {message.user?.surname}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(message.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="bg-primary-50 rounded-lg p-4 text-gray-800">
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        </div>

        {/* Replies */}
        {message.replies?.map((reply: any) => {
          const isAdmin = reply.user?.role === 'ADMIN';
          return (
            <div key={reply.id} className={`flex gap-3 ${isAdmin ? '' : 'flex-row-reverse'}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                isAdmin ? 'bg-green-100' : 'bg-primary-100'
              }`}>
                <span className={`text-sm font-medium ${isAdmin ? 'text-green-600' : 'text-primary-900'}`}>
                  {reply.user?.name?.charAt(0) || '?'}
                </span>
              </div>
              <div className={`flex-1 ${isAdmin ? '' : 'text-right'}`}>
                <div className={`flex items-center gap-2 mb-1 ${isAdmin ? '' : 'justify-end'}`}>
                  <span className="font-medium text-gray-900">
                    {reply.user?.name} {reply.user?.surname}
                    {isAdmin && (
                      <span className="ml-1 text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                        Support
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(reply.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className={`rounded-lg p-4 text-gray-800 inline-block max-w-[80%] ${
                  isAdmin ? 'bg-green-50 text-left' : 'bg-primary-50 text-left'
                }`}>
                  <p className="whitespace-pre-wrap">{reply.content}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Input */}
      {!isResolved ? (
        <div className="flex-shrink-0 border-t border-gray-200 p-4">
          <form onSubmit={handleSubmitReply}>
            <div className="flex gap-3">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Type your reply..."
                rows={3}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
              />
              <button
                type="submit"
                disabled={!replyContent.trim() || replyMutation.isPending}
                className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-end"
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
                Failed to send reply. Please try again.
              </p>
            )}
          </form>
        </div>
      ) : (
        <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-gray-50 text-center">
          <p className="text-sm text-gray-500">
            This conversation has been {message.status === 'RESOLVED' ? 'resolved' : 'closed'}.
            If you need further assistance, please open a new message.
          </p>
        </div>
      )}
    </div>
  );
}

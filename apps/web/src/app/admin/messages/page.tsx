'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Send,
  Filter,
  Search,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  Archive,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Tag,
  UserCheck,
  BarChart3,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { messagingApi, cannedResponseApi } from '@/lib/api/adminApi';
import { PageLoader } from '@/components/ui/LoadingSpinner';

type MessageStatus = 'NEW' | 'READ' | 'IN_PROGRESS' | 'ANSWERED' | 'RESOLVED' | 'ARCHIVED';
type MessagePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

interface Message {
  id: string;
  subject: string;
  content: string;
  status: MessageStatus;
  priority: MessagePriority;
  attachmentUrl?: string;
  internalNotes?: string;
  createdAt: string;
  firstResponseAt?: string;
  resolvedAt?: string;
  user: {
    id: string;
    name: string;
    surname: string;
    email: string;
    avatar?: string;
  };
  course?: {
    id: string;
    title: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    surname: string;
    avatar?: string;
  };
  replies: Array<{
    id: string;
    content: string;
    isInternal: boolean;
    createdAt: string;
    user: {
      id: string;
      name: string;
      surname: string;
      role: string;
      avatar?: string;
    };
  }>;
  _count?: {
    replies: number;
  };
}

const statusColors: Record<MessageStatus, { bg: string; text: string; icon: any }> = {
  NEW: { bg: 'bg-accent-100', text: 'text-accent-600', icon: MessageSquare },
  READ: { bg: 'bg-gray-100', text: 'text-gray-800', icon: MessageSquare },
  IN_PROGRESS: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
  ANSWERED: { bg: 'bg-primary-100', text: 'text-primary-800', icon: Send },
  RESOLVED: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
  ARCHIVED: { bg: 'bg-gray-100', text: 'text-gray-600', icon: Archive },
};

const priorityColors: Record<MessagePriority, { bg: string; text: string }> = {
  LOW: { bg: 'bg-gray-100', text: 'text-gray-600' },
  MEDIUM: { bg: 'bg-accent-100', text: 'text-accent-600' },
  HIGH: { bg: 'bg-orange-100', text: 'text-orange-700' },
  URGENT: { bg: 'bg-red-100', text: 'text-red-700' },
};

export default function AdminMessagesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<MessageStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<MessagePriority | ''>('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [showCannedResponses, setShowCannedResponses] = useState(false);

  // Fetch messages
  const { data: messagesData, isLoading } = useQuery({
    queryKey: ['adminMessages', statusFilter, priorityFilter, search, sortBy, page],
    queryFn: () =>
      messagingApi
        .getAll({
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          search: search || undefined,
          sortBy,
          page,
          limit: 20,
        })
        .then((res) => res.data),
  });

  // Fetch selected message details
  const { data: messageDetails } = useQuery({
    queryKey: ['messageDetails', selectedMessage],
    queryFn: () =>
      selectedMessage
        ? messagingApi.getMessage(selectedMessage).then((res) => res.data)
        : null,
    enabled: !!selectedMessage,
  });

  // Fetch analytics
  const { data: analyticsData } = useQuery({
    queryKey: ['messagingAnalytics'],
    queryFn: () => messagingApi.getAnalytics().then((res) => res.data),
  });

  // Fetch canned responses
  const { data: cannedResponsesData } = useQuery({
    queryKey: ['cannedResponses'],
    queryFn: () => cannedResponseApi.getAll().then((res) => res.data),
  });

  // Mutations
  const replyMutation = useMutation({
    mutationFn: ({
      messageId,
      content,
      isInternal,
    }: {
      messageId: string;
      content: string;
      isInternal?: boolean;
    }) => messagingApi.addReply(messageId, content, isInternal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMessages'] });
      queryClient.invalidateQueries({ queryKey: ['messageDetails', selectedMessage] });
      setReplyContent('');
      setIsInternalNote(false);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ messageId, status }: { messageId: string; status: MessageStatus }) =>
      messagingApi.updateStatus(messageId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMessages'] });
      queryClient.invalidateQueries({ queryKey: ['messageDetails', selectedMessage] });
      queryClient.invalidateQueries({ queryKey: ['messagingAnalytics'] });
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: ({ messageId, priority }: { messageId: string; priority: MessagePriority }) =>
      messagingApi.updatePriority(messageId, priority),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMessages'] });
    },
  });

  const messages: Message[] = messagesData?.data?.messages || [];
  const pagination = messagesData?.data?.pagination || { total: 0, page: 1, totalPages: 1 };
  const analytics = analyticsData?.data || {};
  const cannedResponses = cannedResponsesData?.data || [];
  const currentMessage: Message | null = messageDetails?.data || null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const handleSendReply = () => {
    if (!selectedMessage || !replyContent.trim()) return;
    replyMutation.mutate({
      messageId: selectedMessage,
      content: replyContent,
      isInternal: isInternalNote,
    });
  };

  const insertCannedResponse = (content: string) => {
    setReplyContent((prev) => prev + content);
    setShowCannedResponses(false);
  };

  if (isLoading) return <PageLoader />;

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-120px)] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 mb-4">
          <h1 className="text-3xl font-bold text-gray-900">შეტყობინებები</h1>
          <p className="mt-1 text-sm text-gray-500">
            მართეთ და უპასუხეთ სტუდენტების შეკითხვებს
          </p>
        </div>

        {/* Analytics Cards */}
        <div className="flex-shrink-0 grid grid-cols-4 gap-4 mb-4">
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">სულ</span>
              <MessageSquare className="w-4 h-4 text-gray-400" />
            </div>
            <p className="mt-1 text-2xl font-bold text-gray-900">{analytics.total || 0}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">ახალი</span>
              <AlertCircle className="w-4 h-4 text-accent-500" />
            </div>
            <p className="mt-1 text-2xl font-bold text-accent-500">{analytics.newMessages || 0}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">გადაწყვეტილი</span>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <p className="mt-1 text-2xl font-bold text-green-600">{analytics.resolved || 0}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">საშ. პასუხი</span>
              <Clock className="w-4 h-4 text-gray-400" />
            </div>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {analytics.avgResponseTimeMinutes || 0}წ
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Message List */}
          <div className="w-1/3 bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden">
            {/* Filters */}
            <div className="flex-shrink-0 p-3 border-b border-gray-200 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="შეტყობინებების ძიება..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as MessageStatus | '')}
                  className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="">ყველა სტატუსი</option>
                  <option value="NEW">ახალი</option>
                  <option value="IN_PROGRESS">მუშავდება</option>
                  <option value="ANSWERED">უპასუხა</option>
                  <option value="RESOLVED">გადაწყვეტილი</option>
                </select>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as MessagePriority | '')}
                  className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="">ყველა პრიორიტეტი</option>
                  <option value="URGENT">სასწრაფო</option>
                  <option value="HIGH">მაღალი</option>
                  <option value="MEDIUM">საშუალო</option>
                  <option value="LOW">დაბალი</option>
                </select>
              </div>
            </div>

            {/* Message List */}
            <div className="flex-1 overflow-y-auto">
              {messages.map((message) => {
                const StatusIcon = statusColors[message.status].icon;
                return (
                  <div
                    key={message.id}
                    onClick={() => setSelectedMessage(message.id)}
                    className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedMessage === message.id ? 'bg-primary-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {message.user.avatar ? (
                          <img
                            src={message.user.avatar}
                            alt=""
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-900">
                              {message.user.name.charAt(0)}
                              {message.user.surname.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-gray-900 truncate">
                            {message.user.name} {message.user.surname}
                          </p>
                          <span className="flex-shrink-0 text-xs text-gray-500">
                            {formatDate(message.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {message.subject}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {message.content.substring(0, 50)}...
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded ${
                              statusColors[message.status].bg
                            } ${statusColors[message.status].text}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {message.status.replace('_', ' ')}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                              priorityColors[message.priority].bg
                            } ${priorityColors[message.priority].text}`}
                          >
                            {message.priority}
                          </span>
                          {message._count && message._count.replies > 0 && (
                            <span className="text-xs text-gray-400">
                              {message._count.replies} პასუხი
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {messages.length === 0 && (
                <div className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">შეტყობინებები არ მოიძებნა</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex-shrink-0 border-t border-gray-200 p-2 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  გვერდი {pagination.page}/{pagination.totalPages}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Message Detail */}
          <div className="flex-1 bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden">
            {currentMessage ? (
              <>
                {/* Message Header */}
                <div className="flex-shrink-0 p-4 border-b border-gray-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {currentMessage.subject}
                      </h2>
                      <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                        <span>
                          From: {currentMessage.user.name} {currentMessage.user.surname}
                        </span>
                        <span>{currentMessage.user.email}</span>
                        {currentMessage.course && (
                          <span>კურსი: {currentMessage.course.title}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={currentMessage.status}
                        onChange={(e) =>
                          updateStatusMutation.mutate({
                            messageId: currentMessage.id,
                            status: e.target.value as MessageStatus,
                          })
                        }
                        className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
                      >
                        <option value="NEW">ახალი</option>
                        <option value="IN_PROGRESS">მუშავდება</option>
                        <option value="ANSWERED">უპასუხა</option>
                        <option value="RESOLVED">გადაწყვეტილი</option>
                        <option value="ARCHIVED">დაარქივებული</option>
                      </select>
                      <select
                        value={currentMessage.priority}
                        onChange={(e) =>
                          updatePriorityMutation.mutate({
                            messageId: currentMessage.id,
                            priority: e.target.value as MessagePriority,
                          })
                        }
                        className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
                      >
                        <option value="LOW">დაბალი</option>
                        <option value="MEDIUM">საშუალო</option>
                        <option value="HIGH">მაღალი</option>
                        <option value="URGENT">სასწრაფო</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Conversation */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Original Message */}
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      {currentMessage.user.avatar ? (
                        <img
                          src={currentMessage.user.avatar}
                          alt=""
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-xs font-medium text-primary-900">
                            {currentMessage.user.name.charAt(0)}
                            {currentMessage.user.surname.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {currentMessage.user.name} {currentMessage.user.surname}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(currentMessage.createdAt)}
                        </span>
                      </div>
                      <div className="mt-1 p-3 bg-gray-100 rounded-lg">
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {currentMessage.content}
                        </p>
                        {currentMessage.attachmentUrl && (
                          <a
                            href={currentMessage.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-sm text-primary-900 hover:text-primary-800"
                          >
                            <Paperclip className="w-4 h-4" />
                            მიმაგრებული ფაილი
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Replies */}
                  {currentMessage.replies?.map((reply) => (
                    <div
                      key={reply.id}
                      className={`flex gap-3 ${reply.isInternal ? 'opacity-70' : ''}`}
                    >
                      <div className="flex-shrink-0">
                        {reply.user.avatar ? (
                          <img
                            src={reply.user.avatar}
                            alt=""
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              reply.user.role === 'ADMIN' ? 'bg-primary-100' : 'bg-gray-100'
                            }`}
                          >
                            <span
                              className={`text-xs font-medium ${
                                reply.user.role === 'ADMIN'
                                  ? 'text-primary-900'
                                  : 'text-gray-600'
                              }`}
                            >
                              {reply.user.name.charAt(0)}
                              {reply.user.surname.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {reply.user.name} {reply.user.surname}
                          </span>
                          {reply.user.role === 'ADMIN' && (
                            <span className="px-1.5 py-0.5 bg-primary-100 text-primary-800 text-xs rounded">
                              ადმინი
                            </span>
                          )}
                          {reply.isInternal && (
                            <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
                              შიდა
                            </span>
                          )}
                          <span className="text-sm text-gray-500">
                            {formatDate(reply.createdAt)}
                          </span>
                        </div>
                        <div
                          className={`mt-1 p-3 rounded-lg ${
                            reply.isInternal
                              ? 'bg-yellow-50 border border-yellow-200'
                              : reply.user.role === 'ADMIN'
                              ? 'bg-primary-50'
                              : 'bg-gray-100'
                          }`}
                        >
                          <p className="text-gray-700 whitespace-pre-wrap">{reply.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply Box */}
                <div className="flex-shrink-0 border-t border-gray-200 p-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isInternalNote}
                          onChange={(e) => setIsInternalNote(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        შიდა ჩანაწერი (სტუდენტისთვის არ ჩანს)
                      </label>
                      <button
                        onClick={() => setShowCannedResponses(!showCannedResponses)}
                        className="ml-auto text-sm text-primary-900 hover:text-primary-800"
                      >
                        შაბლონის ჩასმა
                      </button>
                    </div>

                    {showCannedResponses && cannedResponses.length > 0 && (
                      <div className="p-2 bg-gray-50 rounded-lg border border-gray-200 max-h-32 overflow-y-auto">
                        {cannedResponses.map((response: any) => (
                          <button
                            key={response.id}
                            onClick={() => insertCannedResponse(response.content)}
                            className="w-full text-left px-2 py-1 text-sm hover:bg-primary-50 rounded"
                          >
                            {response.title}
                          </button>
                        ))}
                      </div>
                    )}

                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder={
                        isInternalNote
                          ? 'დაწერეთ შიდა ჩანაწერი...'
                          : 'დაწერეთ პასუხი...'
                      }
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                        isInternalNote ? 'border-yellow-300 bg-yellow-50' : 'border-gray-300'
                      }`}
                      rows={3}
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handleSendReply}
                        disabled={!replyContent.trim() || replyMutation.isPending}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        {isInternalNote ? 'ჩანაწერის დამატება' : 'პასუხის გაგზავნა'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p>აირჩიეთ შეტყობინება დეტალების სანახავად</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

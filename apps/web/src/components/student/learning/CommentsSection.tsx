'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    surname: string;
    avatar: string | null;
    role: string;
  };
  replies: Comment[];
}

interface CommentsSectionProps {
  chapterId: string;
}

export default function CommentsSection({ chapterId }: CommentsSectionProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // Fetch comments
  const { data, isLoading, error } = useQuery({
    queryKey: ['chapterComments', chapterId],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/student/chapters/${chapterId}/comments`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );
      return response.json();
    },
    staleTime: 30000,
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/student/chapters/${chapterId}/comments`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content, parentId }),
        }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapterComments', chapterId] });
      setNewComment('');
      setReplyingTo(null);
      setReplyContent('');
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/student/comments/${commentId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapterComments', chapterId] });
    },
  });

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      createCommentMutation.mutate({ content: newComment });
    }
  };

  const handleSubmitReply = (parentId: string) => {
    if (replyContent.trim()) {
      createCommentMutation.mutate({ content: replyContent, parentId });
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (confirm('Are you sure you want to delete this comment?')) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const comments: Comment[] = data?.data?.comments || [];

  const CommentItem = ({
    comment,
    isReply = false,
  }: {
    comment: Comment;
    isReply?: boolean;
  }) => {
    const isOwnComment = comment.user.id === user?.id;
    const isAdmin = comment.user.role === 'ADMIN';

    return (
      <div className={`${isReply ? 'ml-12 mt-4' : ''}`}>
        <div className="flex space-x-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {comment.user.avatar ? (
              <img
                src={comment.user.avatar}
                alt={comment.user.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-sm font-medium text-primary-900">
                  {comment.user.name.charAt(0)}{comment.user.surname.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">
                {comment.user.name} {comment.user.surname}
              </span>
              {isAdmin && (
                <span className="px-2 py-0.5 bg-primary-100 text-primary-800 text-xs font-medium rounded-full">
                  Instructor
                </span>
              )}
              <span className="text-sm text-gray-500">
                {formatDate(comment.createdAt)}
              </span>
            </div>

            <p className="mt-1 text-gray-700 whitespace-pre-wrap">{comment.content}</p>

            {/* Actions */}
            <div className="mt-2 flex items-center space-x-4">
              {!isReply && (
                <button
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Reply
                </button>
              )}
              {isOwnComment && (
                <button
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-sm text-red-500 hover:text-red-700 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>

            {/* Reply Form */}
            {replyingTo === comment.id && (
              <div className="mt-4 flex space-x-3">
                <div className="flex-shrink-0">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">
                        {user?.name?.charAt(0)}{user?.surname?.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Write a reply..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                    rows={2}
                    autoFocus
                  />
                  <div className="mt-2 flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyContent('');
                      }}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSubmitReply(comment.id)}
                      disabled={!replyContent.trim() || createCommentMutation.isPending}
                      className="px-3 py-1.5 text-sm bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-4 space-y-4">
                {comment.replies.map((reply) => (
                  <CommentItem key={reply.id} comment={reply} isReply />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-900 flex items-center">
          <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Discussion ({comments.length})
        </h3>
      </div>

      {/* New Comment Form */}
      <div className="p-6 border-b border-gray-200">
        <form onSubmit={handleSubmitComment}>
          <div className="flex space-x-3">
            <div className="flex-shrink-0">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-900">
                    {user?.name?.charAt(0)}{user?.surname?.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Ask a question or share your thoughts..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                rows={3}
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={!newComment.trim() || createCommentMutation.isPending}
                  className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {createCommentMutation.isPending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Posting...
                    </>
                  ) : (
                    'Post Comment'
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Comments List */}
      <div className="p-6">
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex space-x-3 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500">Failed to load comments</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-gray-500">No comments yet</p>
            <p className="text-sm text-gray-400 mt-1">Be the first to start the discussion!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

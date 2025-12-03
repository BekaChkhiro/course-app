'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApiClient, ChapterForLearning, Note, Bookmark } from '@/lib/api/studentApi';
import VideoPlayer from './VideoPlayer';
import TheorySection from './TheorySection';
import AssignmentSection from './AssignmentSection';
import CommentsSection from './CommentsSection';
import AttachmentsPreview from './AttachmentsPreview';

type ActiveTab = 'video' | 'theory' | 'materials' | 'assignment' | 'quiz';

interface ChapterViewProps {
  courseSlug: string;
  chapterId: string;
  courseId: string;
  courseTitle: string;
  hasPrevChapter: boolean;
  hasNextChapter: boolean;
  onNavigate: (direction: 'prev' | 'next') => void;
  onChapterComplete: () => void;
}

export default function ChapterView({
  courseSlug,
  chapterId,
  courseId,
  courseTitle,
  hasPrevChapter,
  hasNextChapter,
  onNavigate,
  onChapterComplete,
}: ChapterViewProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ActiveTab>('video');
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);

  // Fetch chapter data
  const { data, isLoading, error } = useQuery({
    queryKey: ['chapterForLearning', chapterId],
    queryFn: () => studentApiClient.getChapterForLearning(chapterId),
    staleTime: 30000,
  });

  const chapterData = data?.data;

  // Set initial tab based on available content
  useEffect(() => {
    if (chapterData?.chapter) {
      const ch = chapterData.chapter;
      if (ch.video) setActiveTab('video');
      else if (ch.theory) setActiveTab('theory');
      else if (ch.assignmentFile) setActiveTab('assignment');
      else if (ch.quiz) setActiveTab('quiz');
    }
  }, [chapterData]);

  // Mark chapter as complete
  const handleMarkComplete = async () => {
    setIsMarkingComplete(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/student/chapters/${chapterId}/complete`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['chapterForLearning', chapterId] });
        onChapterComplete();
      }
    } catch (error) {
      console.error('Failed to mark chapter as complete:', error);
    } finally {
      setIsMarkingComplete(false);
    }
  };

  // Update progress
  const handleProgressUpdate = useCallback(
    async (progressData: { watchPercentage?: number; lastPosition?: number }) => {
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/student/chapters/${chapterId}/progress`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(progressData),
          }
        );
      } catch (error) {
        console.error('Failed to update progress:', error);
      }
    },
    [chapterId]
  );

  // Create bookmark
  const handleCreateBookmark = async (timestamp: number, title: string, description?: string) => {
    try {
      await studentApiClient.createBookmark({
        chapterId,
        videoId: chapterData?.chapter.video?.id,
        timestamp,
        title,
        description,
      });
      queryClient.invalidateQueries({ queryKey: ['chapterForLearning', chapterId] });
    } catch (error) {
      console.error('Failed to create bookmark:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading chapter...</p>
        </div>
      </div>
    );
  }

  if (error || !chapterData) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center max-w-md">
          <svg
            className="w-16 h-16 text-red-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Unable to load chapter
          </h2>
          <p className="text-gray-500">
            Please try again or select a different chapter.
          </p>
        </div>
      </div>
    );
  }

  const { chapter, progress, notes, bookmarks } = chapterData;

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode; available: boolean }[] = [
    {
      id: 'video',
      label: 'Video',
      available: !!chapter.video,
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
        </svg>
      ),
    },
    {
      id: 'theory',
      label: 'Theory',
      available: !!chapter.theory,
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      id: 'materials',
      label: 'მასალები',
      available: true, // Always show materials tab
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-5L9 4H4zm7 5a1 1 0 00-2 0v1H8a1 1 0 000 2h1v1a1 1 0 002 0v-1h1a1 1 0 000-2h-1V9z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      id: 'assignment',
      label: 'Assignment',
      available: !!chapter.assignmentFile,
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      id: 'quiz',
      label: 'Quiz',
      available: !!chapter.quiz,
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      ),
    },
  ];

  const availableTabs = tabs.filter((t) => t.available);

  return (
    <div className="flex flex-col h-full">
      {/* Chapter Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-14 z-10">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
              <span>Chapter {chapter.order}</span>
              {chapter.description && (
                <>
                  <span>-</span>
                  <span className="truncate">{chapter.description}</span>
                </>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900">{chapter.title}</h1>
          </div>

          <div className="flex items-center space-x-3 ml-4">
            {/* Progress indicator */}
            {progress.watchPercentage > 0 && !progress.isCompleted && (
              <span className="text-sm text-gray-500">
                {Math.round(progress.watchPercentage)}% watched
              </span>
            )}

            {/* Complete button or status */}
            {progress.isCompleted ? (
              <span className="inline-flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Completed
              </span>
            ) : (
              <button
                onClick={handleMarkComplete}
                disabled={isMarkingComplete}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {isMarkingComplete ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Marking...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Mark Complete
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        {availableTabs.length > 1 && (
          <div className="flex space-x-1 mt-4 -mb-px">
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {/* Video Tab */}
        {activeTab === 'video' && (
          <VideoPlayer
            video={chapter.video}
            progress={progress}
            bookmarks={bookmarks}
            onProgressUpdate={handleProgressUpdate}
            onCreateBookmark={handleCreateBookmark}
          />
        )}

        {/* Theory Tab */}
        {activeTab === 'theory' && (
          <TheorySection
            content={chapter.theory}
            chapterId={chapterId}
            notes={notes}
            onNoteCreated={() => {
              queryClient.invalidateQueries({ queryKey: ['chapterForLearning', chapterId] });
            }}
          />
        )}

        {/* Materials Tab */}
        {activeTab === 'materials' && (
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <AttachmentsPreview chapterId={chapterId} />
            </div>
          </div>
        )}

        {/* Assignment Tab */}
        {activeTab === 'assignment' && (
          <AssignmentSection
            assignmentFile={chapter.assignmentFile}
            answerFile={chapter.answerFile}
          />
        )}

        {/* Quiz Tab */}
        {activeTab === 'quiz' && chapter.quiz && (
          <div className="p-6">
            <div className="max-w-2xl mx-auto bg-white rounded-xl border border-gray-200 p-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{chapter.quiz.title}</h3>
                <div className="text-sm text-gray-500 space-y-1 mb-8">
                  <p className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {chapter.quiz.questionCount} questions
                  </p>
                  <p className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Passing score: {chapter.quiz.passingScore}%
                  </p>
                  {chapter.quiz.timeLimit && (
                    <p className="flex items-center justify-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Time limit: {chapter.quiz.timeLimit} minutes
                    </p>
                  )}
                </div>
                <Link
                  href={`/quiz/${chapter.quiz.id}`}
                  className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Start Quiz
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Chapter Discussion Section */}
        <div className="p-6 pt-0">
          <div className="max-w-4xl mx-auto">
            <CommentsSection chapterId={chapterId} />
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-80 bg-white border-t border-gray-200 px-6 py-3 z-10">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <button
            onClick={() => onNavigate('prev')}
            disabled={!hasPrevChapter}
            className={`inline-flex items-center px-4 py-2 rounded-lg transition-colors ${
              hasPrevChapter
                ? 'text-gray-700 hover:bg-gray-100'
                : 'text-gray-300 cursor-not-allowed'
            }`}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Previous</span>
          </button>

          <div className="flex items-center space-x-4">
            {/* Keyboard shortcut hints */}
            <div className="hidden md:flex items-center space-x-2 text-xs text-gray-400">
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">K</kbd>
              <span>/</span>
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">J</kbd>
              <span>Navigate</span>
            </div>
          </div>

          <button
            onClick={() => onNavigate('next')}
            disabled={!hasNextChapter}
            className={`inline-flex items-center px-4 py-2 rounded-lg transition-colors ${
              hasNextChapter
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <span className="hidden sm:inline">Next</span>
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

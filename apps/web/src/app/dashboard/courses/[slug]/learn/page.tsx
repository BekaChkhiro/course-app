'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApiClient, ChapterProgress, ChapterForLearning } from '@/lib/api/studentApi';
import { useAuthStore } from '@/store/authStore';

type ActiveTab = 'video' | 'theory' | 'assignment' | 'quiz';

// Custom hook for detecting mobile screens
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

// Custom hook for swipe gestures
function useSwipeGesture(onSwipeLeft?: () => void, onSwipeRight?: () => void) {
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }
  };

  return { onTouchStart, onTouchMove, onTouchEnd };
}

function ChapterSidebar({
  chapters,
  activeChapterId,
  onSelectChapter,
  isCollapsed,
  onToggleCollapse,
  courseTitle,
  overallProgress,
  isMobile,
  isOpen,
  onClose,
}: {
  chapters: ChapterProgress[];
  activeChapterId: string | null;
  onSelectChapter: (id: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  courseTitle: string;
  overallProgress: number;
  isMobile: boolean;
  isOpen: boolean;
  onClose: () => void;
}) {
  // On mobile, sidebar is hidden by default and shown as overlay
  // On desktop, sidebar follows normal collapsed/expanded behavior
  const shouldShow = isMobile ? isOpen : true;
  const sidebarWidth = isMobile ? 'w-80' : (isCollapsed ? 'w-16' : 'w-80');

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 ${
          isMobile ? 'z-40' : 'z-20'
        } ${sidebarWidth} ${
          isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {(isMobile || !isCollapsed) && (
            <div className="flex-1 min-w-0 pr-2">
              <Link href="/dashboard/courses" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center mb-1">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Courses
              </Link>
              <h2 className="font-semibold text-gray-900 truncate">{courseTitle}</h2>
            </div>
          )}
          {isMobile ? (
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              aria-label="Close sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <button
              onClick={onToggleCollapse}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg
                className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Progress */}
        {(isMobile || !isCollapsed) && (
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">Course Progress</span>
              <span className="font-medium text-gray-900">{overallProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  overallProgress === 100 ? 'bg-green-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Chapters List */}
        <div className="flex-1 overflow-y-auto">
          {chapters.map((chapter, index) => {
            const isActive = chapter.id === activeChapterId;
            const isCompleted = chapter.progress.isCompleted;

            const handleChapterClick = () => {
              onSelectChapter(chapter.id);
              if (isMobile) {
                onClose();
              }
            };

            return (
              <button
                key={chapter.id}
                onClick={handleChapterClick}
                className={`w-full text-left transition-colors ${
                  isActive
                    ? 'bg-indigo-50 border-r-2 border-indigo-600'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className={`p-4 flex items-start gap-3 ${!isMobile && isCollapsed ? 'justify-center' : ''}`}>
                  {/* Status Icon */}
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? 'bg-green-100 text-green-600'
                        : isActive
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>

                  {(isMobile || !isCollapsed) && (
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isActive ? 'text-indigo-600' : 'text-gray-900'}`}>
                        {chapter.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {chapter.hasVideo && (
                          <span className="text-xs text-gray-400" title="Video">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </span>
                        )}
                        {chapter.hasTheory && (
                          <span className="text-xs text-gray-400" title="Theory">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </span>
                        )}
                        {chapter.hasAssignment && (
                          <span className="text-xs text-gray-400" title="Assignment">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </span>
                        )}
                        {chapter.hasQuiz && (
                          <span className="text-xs text-gray-400" title="Quiz">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </span>
                        )}
                      </div>
                      {chapter.progress.watchPercentage > 0 && !isCompleted && (
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                          <div
                            className="bg-indigo-400 h-1 rounded-full"
                            style={{ width: `${chapter.progress.watchPercentage}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function ChapterContent({
  chapterData,
  activeTab,
  onTabChange,
  onMarkComplete,
  isMarkingComplete,
}: {
  chapterData: ChapterForLearning;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onMarkComplete: () => void;
  isMarkingComplete: boolean;
}) {
  const { chapter, progress } = chapterData;
  const [showAnswer, setShowAnswer] = useState(false);

  const tabs: { id: ActiveTab; label: string; available: boolean }[] = [
    { id: 'video', label: 'Video', available: !!chapter.video },
    { id: 'theory', label: 'Theory', available: !!chapter.theory },
    { id: 'assignment', label: 'Assignment', available: !!chapter.assignmentFile },
    { id: 'quiz', label: 'Quiz', available: !!chapter.quiz },
  ];

  const availableTabs = tabs.filter((t) => t.available);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Chapter Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Chapter {chapter.order}</p>
            <h1 className="text-xl font-bold text-gray-900">{chapter.title}</h1>
          </div>
          {!progress.isCompleted && (
            <button
              onClick={onMarkComplete}
              disabled={isMarkingComplete}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center"
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
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Mark Complete
                </>
              )}
            </button>
          )}
          {progress.isCompleted && (
            <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Completed
            </span>
          )}
        </div>

        {/* Tabs */}
        {availableTabs.length > 1 && (
          <div className="flex gap-1 mt-4 border-b border-gray-200 -mb-4">
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Video Tab */}
        {activeTab === 'video' && chapter.video && (
          <div className="bg-black rounded-xl overflow-hidden aspect-video mb-6">
            {chapter.video.hlsMasterUrl ? (
              <video
                controls
                className="w-full h-full"
                src={chapter.video.hlsMasterUrl}
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>Video is being processed...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Theory Tab */}
        {activeTab === 'theory' && chapter.theory && (
          <div
            className="prose prose-indigo max-w-none"
            dangerouslySetInnerHTML={{ __html: chapter.theory }}
          />
        )}

        {/* Assignment Tab */}
        {activeTab === 'assignment' && (
          <div className="space-y-6">
            {/* Download Assignment */}
            {chapter.assignmentFile && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Assignment</h3>
                <a
                  href={chapter.assignmentFile}
                  download
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Assignment
                </a>
              </div>
            )}

            {/* View Answer */}
            {chapter.answerFile && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Answer</h3>
                {!showAnswer ? (
                  <button
                    onClick={() => setShowAnswer(true)}
                    className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Reveal Answer
                  </button>
                ) : (
                  <div className="space-y-4">
                    <a
                      href={chapter.answerFile}
                      download
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Answer
                    </a>
                    <button
                      onClick={() => setShowAnswer(false)}
                      className="ml-3 text-sm text-gray-500 hover:text-gray-700"
                    >
                      Hide Answer
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quiz Tab */}
        {activeTab === 'quiz' && chapter.quiz && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{chapter.quiz.title}</h3>
              <div className="text-sm text-gray-500 space-y-1 mb-6">
                <p>{chapter.quiz.questionCount} questions</p>
                <p>Passing score: {chapter.quiz.passingScore}%</p>
                {chapter.quiz.timeLimit && <p>Time limit: {chapter.quiz.timeLimit} minutes</p>}
              </div>
              <Link
                href={`/quiz/${chapter.quiz.id}`}
                className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Start Quiz
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
        )}

        {/* No content for selected tab */}
        {activeTab === 'video' && !chapter.video && (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No video available for this chapter</p>
          </div>
        )}

        {activeTab === 'theory' && !chapter.theory && (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No theory content available for this chapter</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CourseLearningPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const slug = params.slug as string;
  const isMobile = useIsMobile();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('video');

  // Fetch course data
  const { data: courseData, isLoading: isCourseLoading, error: courseError } = useQuery({
    queryKey: ['courseForLearning', slug],
    queryFn: () => studentApiClient.getCourseForLearning(slug),
    staleTime: 60000,
  });

  // Fetch chapter data
  const { data: chapterData, isLoading: isChapterLoading } = useQuery({
    queryKey: ['chapterForLearning', activeChapterId],
    queryFn: () => studentApiClient.getChapterForLearning(activeChapterId!),
    enabled: !!activeChapterId,
    staleTime: 60000,
  });

  // Mark chapter as complete mutation
  const markCompleteMutation = useMutation({
    mutationFn: async (chapterId: string) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/progress/chapters/${chapterId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseForLearning', slug] });
      queryClient.invalidateQueries({ queryKey: ['chapterForLearning', activeChapterId] });
    },
  });

  // Set initial chapter when course data loads
  useEffect(() => {
    if (courseData?.data.chapters.length && !activeChapterId) {
      // Find first incomplete chapter or default to first chapter
      const firstIncomplete = courseData.data.chapters.find((c) => !c.progress.isCompleted);
      setActiveChapterId(firstIncomplete?.id || courseData.data.chapters[0].id);
    }
  }, [courseData, activeChapterId]);

  // Set initial tab based on available content
  useEffect(() => {
    if (chapterData?.data.chapter) {
      const ch = chapterData.data.chapter;
      if (ch.video) setActiveTab('video');
      else if (ch.theory) setActiveTab('theory');
      else if (ch.assignmentFile) setActiveTab('assignment');
      else if (ch.quiz) setActiveTab('quiz');
    }
  }, [chapterData]);

  const handleSelectChapter = (chapterId: string) => {
    setActiveChapterId(chapterId);
  };

  const handleMarkComplete = () => {
    if (activeChapterId) {
      markCompleteMutation.mutate(activeChapterId);
    }
  };

  // Navigate to next/previous chapter
  const navigateChapter = useCallback(
    (direction: 'prev' | 'next') => {
      if (!courseData?.data.chapters || !activeChapterId) return;

      const currentIndex = courseData.data.chapters.findIndex((c) => c.id === activeChapterId);
      const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

      if (newIndex >= 0 && newIndex < courseData.data.chapters.length) {
        setActiveChapterId(courseData.data.chapters[newIndex].id);
      }
    },
    [courseData, activeChapterId]
  );

  if (isCourseLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (courseError || !courseData?.data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center max-w-md">
          <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Course Not Found</h2>
          <p className="text-gray-500 mb-4">This course may not exist or you may not have access to it.</p>
          <Link
            href="/dashboard/courses"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Back to My Courses
          </Link>
        </div>
      </div>
    );
  }

  const { course, chapters, progress } = courseData.data;
  const currentChapterIndex = chapters.findIndex((c) => c.id === activeChapterId);
  const hasPrevChapter = currentChapterIndex > 0;
  const hasNextChapter = currentChapterIndex < chapters.length - 1;

  // Swipe gestures for mobile navigation
  const swipeHandlers = useSwipeGesture(
    hasNextChapter ? () => navigateChapter('next') : undefined,
    hasPrevChapter ? () => navigateChapter('prev') : undefined
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Chapter Sidebar */}
      <ChapterSidebar
        chapters={chapters}
        activeChapterId={activeChapterId}
        onSelectChapter={handleSelectChapter}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        courseTitle={course.title}
        overallProgress={progress.overallProgress}
        isMobile={isMobile}
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-10 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Open chapters menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex-1 text-center px-2">
              <h1 className="text-sm font-medium text-gray-900 truncate">{course.title}</h1>
              <p className="text-xs text-gray-500">{progress.overallProgress}% complete</p>
            </div>
            <Link
              href="/dashboard/courses"
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Back to courses"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Link>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div
        className={`transition-all duration-300 ${
          isMobile ? 'ml-0 pt-16' : (sidebarCollapsed ? 'ml-16' : 'ml-80')
        }`}
        {...(isMobile ? swipeHandlers : {})}
      >
        {isChapterLoading || !chapterData?.data ? (
          <div className="flex items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <ChapterContent
            chapterData={chapterData.data}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onMarkComplete={handleMarkComplete}
            isMarkingComplete={markCompleteMutation.isPending}
          />
        )}

        {/* Navigation Footer */}
        <div
          className={`fixed bottom-0 right-0 bg-white border-t border-gray-200 py-3 px-4 sm:py-4 sm:px-6 flex items-center justify-between ${
            isMobile ? 'left-0' : ''
          }`}
          style={!isMobile ? { left: sidebarCollapsed ? '4rem' : '20rem' } : undefined}
        >
          <button
            onClick={() => navigateChapter('prev')}
            disabled={!hasPrevChapter}
            className={`flex items-center px-3 py-2 sm:px-4 rounded-lg transition-colors ${
              hasPrevChapter
                ? 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                : 'text-gray-300 cursor-not-allowed'
            }`}
          >
            <svg className="w-5 h-5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Previous</span>
          </button>

          <span className="text-xs sm:text-sm text-gray-500 text-center">
            <span className="hidden sm:inline">Chapter </span>{currentChapterIndex + 1}<span className="hidden sm:inline"> of</span><span className="sm:hidden">/</span> {chapters.length}
          </span>

          <button
            onClick={() => navigateChapter('next')}
            disabled={!hasNextChapter}
            className={`flex items-center px-3 py-2 sm:px-4 rounded-lg transition-colors ${
              hasNextChapter
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <span className="hidden sm:inline">Next</span>
            <svg className="w-5 h-5 sm:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Swipe hint for mobile */}
        {isMobile && (
          <div className="fixed bottom-16 left-0 right-0 flex justify-center pointer-events-none">
            <div className="bg-gray-900 bg-opacity-70 text-white text-xs px-3 py-1.5 rounded-full opacity-0 animate-pulse">
              Swipe to navigate chapters
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

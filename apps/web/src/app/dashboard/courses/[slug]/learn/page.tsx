'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApiClient, ChapterProgress, ChapterForLearning } from '@/lib/api/studentApi';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import QuizPlayer from '@/components/quiz/QuizPlayer';
import QuizResults from '@/components/quiz/QuizResults';
import CourseCompletionModal from '@/components/student/learning/CourseCompletionModal';
import FinalExamSection from '@/components/student/learning/FinalExamSection';
import FinalExamIntro from '@/components/student/learning/FinalExamIntro';
import VideoPlayer from '@/components/student/VideoPlayer';
import { QuizAttempt, quizAttemptApi } from '@/lib/api/quizApi';
import toast from 'react-hot-toast';

type ActiveTab = 'video' | 'theory' | 'files' | 'quiz';

// Helper function to extract YouTube video ID
const getYouTubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
};

// File icon helper
const getFileIconConfig = (previewType: string | null) => {
  if (previewType === 'pdf') {
    return {
      bg: 'bg-red-100',
      icon: (
        <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
          <path d="M8 12h1.5v4H8v-4zm3 0h1.2l.8 2.5.8-2.5H15v4h-1v-2.5l-.7 2.5h-.6l-.7-2.5V16h-1v-4zm5 0h2v1h-1v.5h1v1h-1v.5h1v1h-2v-4z"/>
        </svg>
      )
    };
  }
  if (previewType === 'image') {
    return {
      bg: 'bg-green-100',
      icon: (
        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    };
  }
  if (previewType === 'text') {
    return {
      bg: 'bg-yellow-100',
      icon: (
        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    };
  }
  return {
    bg: 'bg-primary-100',
    icon: (
      <svg className="w-5 h-5 text-primary-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  };
};

// File Section Component
function FileSection({
  title,
  files,
  getPreviewType,
  handleFilePreview,
  isAnswer = false,
  showAnswer = true,
  setShowAnswer,
}: {
  title: string;
  files: any[];
  getPreviewType: (mimeType: string, fileName: string) => string | null;
  handleFilePreview: (url: string, title: string, mimeType: string, fileName: string) => void;
  isAnswer?: boolean;
  showAnswer?: boolean;
  setShowAnswer?: (show: boolean) => void;
}) {
  // For answers, show hide/reveal functionality
  if (isAnswer && !showAnswer) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-medium text-gray-900">{title}</h3>
        </div>
        <div className="p-6 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-gray-600 mb-3">ჯერ სცადეთ დავალების შესრულება</p>
          <button
            onClick={() => setShowAnswer?.(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            პასუხების ნახვა
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-medium text-gray-900">{title}</h3>
        {isAnswer && showAnswer && setShowAnswer && (
          <button
            onClick={() => setShowAnswer(false)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            დამალვა
          </button>
        )}
      </div>
      <div className="divide-y divide-gray-100">
        {files.map((attachment: any) => {
          const previewType = getPreviewType(attachment.mimeType, attachment.fileName);
          const canPreview = previewType !== null;
          const fileIcon = getFileIconConfig(previewType);

          return (
            <div key={attachment.id} className="p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${fileIcon.bg}`}>
                {fileIcon.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{attachment.title}</p>
                {attachment.description && (
                  <p className="text-sm text-gray-500 truncate">{attachment.description}</p>
                )}
                <p className="text-xs text-gray-400">
                  {(attachment.fileSize / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canPreview && (
                  <button
                    onClick={() => handleFilePreview(attachment.url, attachment.title, attachment.mimeType, attachment.fileName)}
                    className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    ნახვა
                  </button>
                )}
                <a
                  href={attachment.url}
                  download={attachment.fileName}
                  className="px-3 py-2 bg-accent-500 text-white text-sm font-medium rounded-lg hover:bg-accent-600 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  ჩამოტვირთვა
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface FinalExamData {
  id: string;
  title: string;
  type: string;
  passingScore: number;
  timeLimit: number | null;
  lockUntilChaptersComplete: boolean;
  isUnlocked: boolean;
}

interface FinalExamAttempt {
  id: string;
  score: number;
  passed: boolean;
  completedAt: string;
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
  finalExam,
  lastFinalExamAttempt,
  onStartFinalExam,
  onResetProgress,
  isResetting,
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
  finalExam?: FinalExamData | null;
  lastFinalExamAttempt?: FinalExamAttempt | null;
  onStartFinalExam?: () => void;
  onResetProgress?: () => void;
  isResetting?: boolean;
}) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
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
              <Link href="/dashboard/courses" className="text-sm text-primary-900 hover:text-primary-800 flex items-center mb-1">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                კურსებზე დაბრუნება
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
              <span className="text-gray-600">კურსის პროგრესი</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{overallProgress}%</span>
                {onResetProgress && (
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                    title="პროგრესის რესეტი (ტესტირებისთვის)"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  overallProgress === 100 ? 'bg-green-500' : 'bg-accent-500'
                }`}
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                პროგრესის წაშლა
              </h3>
              <p className="text-gray-500 text-center text-sm mb-6">
                დარწმუნებული ხართ რომ გსურთ ამ კურსის მთლიანი პროგრესის წაშლა?
                ეს წაშლის ყველა თავის პროგრესს, ქვიზის მცდელობებს და სერტიფიკატებს.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  გაუქმება
                </button>
                <button
                  onClick={() => {
                    setShowResetConfirm(false);
                    onResetProgress?.();
                  }}
                  disabled={isResetting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {isResetting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      იშლება...
                    </>
                  ) : (
                    'წაშლა'
                  )}
                </button>
              </div>
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
                    ? 'bg-primary-50 border-r-2 border-primary-900'
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
                        ? 'bg-primary-100 text-primary-900'
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
                      <p className={`text-sm font-medium truncate ${isActive ? 'text-primary-900' : 'text-gray-900'}`}>
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
                            className="bg-accent-400 h-1 rounded-full"
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

        {/* Final Exam Section */}
        {finalExam && onStartFinalExam && (
          <FinalExamSection
            finalExam={finalExam}
            lastAttempt={lastFinalExamAttempt}
            onStartExam={() => {
              onStartFinalExam();
              if (isMobile) {
                onClose();
              }
            }}
            isCollapsed={isCollapsed}
            isMobile={isMobile}
          />
        )}
      </div>
    </aside>
    </>
  );
}

function ChapterContent({
  chapterData,
  activeTab,
  onTabChange,
  onMarkComplete,
  isMarkingComplete,
  quizMode,
  completedAttemptId,
  onQuizComplete,
  onQuizRetry,
}: {
  chapterData: ChapterForLearning;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onMarkComplete: () => void;
  isMarkingComplete: boolean;
  quizMode: 'start' | 'playing' | 'results';
  completedAttemptId: string | null;
  onQuizComplete: (attempt: QuizAttempt) => void;
  onQuizRetry: () => void;
}) {
  const { chapter, progress } = chapterData;
  const [showAnswer, setShowAnswer] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    title: string;
    type: 'pdf' | 'image' | 'text';
    blobUrl?: string;
    textContent?: string;
  } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Determine file preview type
  const getPreviewType = (mimeType: string, fileName: string): 'pdf' | 'image' | 'text' | null => {
    const ext = fileName?.toLowerCase().split('.').pop();

    if (mimeType === 'application/pdf' || ext === 'pdf') return 'pdf';
    if (mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'image';
    if (mimeType === 'text/plain' || ext === 'txt') return 'text';

    return null;
  };

  // Load file for preview (handles CORS issues)
  const handleFilePreview = async (url: string, title: string, mimeType: string, fileName: string) => {
    const previewType = getPreviewType(mimeType, fileName);
    if (!previewType) return;

    setPreviewFile({ url, title, type: previewType });
    setIsLoadingPreview(true);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });

      if (response.ok) {
        if (previewType === 'text') {
          const textContent = await response.text();
          setPreviewFile({ url, title, type: previewType, textContent });
        } else {
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          setPreviewFile({ url, title, type: previewType, blobUrl });
        }
      }
    } catch (error) {
      console.error('Failed to load file:', error);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Cleanup blob URL when modal closes
  const closeFilePreview = () => {
    if (previewFile?.blobUrl) {
      URL.revokeObjectURL(previewFile.blobUrl);
    }
    setPreviewFile(null);
  };

  // Fetch secure video URL
  const { data: secureVideoData, isLoading: isSecureUrlLoading } = useQuery({
    queryKey: ['secureVideoUrl', chapter.video?.id],
    queryFn: () => studentApiClient.getSecureVideoUrl(chapter.video!.id),
    enabled: !!chapter.video?.id && activeTab === 'video' && !chapter.video.hlsMasterUrl?.includes('youtube.com') && !chapter.video.hlsMasterUrl?.includes('youtu.be'),
    staleTime: 30 * 60 * 1000, // 30 minutes (URL expires in 2 hours)
    refetchOnWindowFocus: false,
  });

  // Check if there are any files
  const hasFiles =
    (chapter.materials && chapter.materials.length > 0) ||
    (chapter.assignments && chapter.assignments.length > 0) ||
    (chapter.answers && chapter.answers.length > 0);

  const tabs: { id: ActiveTab; label: string; available: boolean }[] = [
    { id: 'video', label: 'ვიდეო', available: !!chapter.video },
    { id: 'theory', label: 'თეორია', available: !!chapter.theory },
    { id: 'files', label: 'ფაილები', available: hasFiles },
    { id: 'quiz', label: 'ტესტი', available: !!chapter.quiz },
  ];

  const availableTabs = tabs.filter((t) => t.available);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Chapter Header - Sticky */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">თავი {chapter.order}</p>
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
                  მონიშვნა...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  დასრულებულად მონიშვნა
                </>
              )}
            </button>
          )}
          {progress.isCompleted && (
            <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              დასრულებული
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
                    ? 'border-primary-900 text-primary-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        {/* Video Tab */}
        {activeTab === 'video' && chapter.video && (
          <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 230px)' }}>
            {chapter.video.hlsMasterUrl ? (
              // Check if it's a YouTube URL
              chapter.video.hlsMasterUrl.includes('youtube.com') || chapter.video.hlsMasterUrl.includes('youtu.be') ? (
                <div className="bg-black rounded-xl overflow-hidden aspect-video w-full max-h-full">
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${getYouTubeVideoId(chapter.video.hlsMasterUrl)}?rel=0&modestbranding=1`}
                    title="Video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ) : isSecureUrlLoading ? (
                // Loading secure URL
                <div className="bg-black rounded-xl overflow-hidden aspect-video w-full max-w-[1200px] flex items-center justify-center text-white">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
                    <p>ვიდეო იტვირთება...</p>
                  </div>
                </div>
              ) : secureVideoData?.data ? (
                // Use secure signed URL with watermark
                <div className="w-full max-w-[1200px]">
                  <VideoPlayer
                    src={secureVideoData.data.url}
                    title={chapter.title}
                    initialTime={progress.lastPosition || 0}
                    watermark={secureVideoData.data.watermark}
                    onProgress={() => {
                      // Optional: Save progress to backend periodically
                    }}
                    onEnded={() => {
                      // Optional: Mark as completed when video ends
                    }}
                  />
                </div>
              ) : (
                // Fallback to direct URL (for development or if secure URL fails)
                <div className="w-full max-w-[1200px]">
                  <VideoPlayer
                    src={chapter.video.hlsMasterUrl}
                    title={chapter.title}
                    initialTime={progress.lastPosition || 0}
                    onProgress={() => {
                      // Optional: Save progress to backend periodically
                    }}
                    onEnded={() => {
                      // Optional: Mark as completed when video ends
                    }}
                  />
                </div>
              )
            ) : (
              <div className="bg-black rounded-xl overflow-hidden aspect-video w-full max-h-full flex items-center justify-center text-white">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>ვიდეო მუშავდება...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Theory Tab */}
        {activeTab === 'theory' && chapter.theory && (
          <div
            className="prose prose-primary max-w-none prose-headings:text-primary-900 prose-a:text-accent-500 hover:prose-a:text-accent-600"
            dangerouslySetInnerHTML={{ __html: chapter.theory }}
          />
        )}

        {/* Files Tab */}
        {activeTab === 'files' && (
          <div className="space-y-4">
            {/* File Preview Modal */}
            {previewFile && (
              <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                <div className={`bg-white rounded-xl w-full flex flex-col ${
                  previewFile.type === 'image' ? 'max-w-4xl max-h-[90vh]' : 'max-w-5xl h-[90vh]'
                }`}>
                  <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-medium text-gray-900 truncate">{previewFile.title}</h3>
                    <div className="flex items-center gap-2">
                      <a
                        href={previewFile.url}
                        download
                        className="px-3 py-1.5 bg-accent-500 text-white text-sm rounded-lg hover:bg-accent-600 flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        ჩამოტვირთვა
                      </a>
                      <button
                        onClick={closeFilePreview}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className={`flex-1 overflow-hidden ${previewFile.type === 'text' ? 'overflow-y-auto' : ''}`}>
                    {isLoadingPreview ? (
                      <div className="w-full h-full flex items-center justify-center min-h-[200px]">
                        <div className="text-center">
                          <div className="w-12 h-12 border-4 border-gray-200 border-t-primary-900 rounded-full animate-spin mx-auto mb-4" />
                          <p className="text-gray-600">იტვირთება...</p>
                        </div>
                      </div>
                    ) : previewFile.type === 'pdf' && previewFile.blobUrl ? (
                      <iframe
                        src={`${previewFile.blobUrl}#toolbar=1&navpanes=0`}
                        className="w-full h-full"
                        title={previewFile.title}
                      />
                    ) : previewFile.type === 'image' && previewFile.blobUrl ? (
                      <div className="p-4 flex items-center justify-center">
                        <img
                          src={previewFile.blobUrl}
                          alt={previewFile.title}
                          className="max-w-full max-h-[70vh] object-contain rounded-lg"
                        />
                      </div>
                    ) : previewFile.type === 'text' && previewFile.textContent !== undefined ? (
                      <pre className="p-6 text-sm text-gray-800 whitespace-pre-wrap font-mono bg-gray-50 min-h-full">
                        {previewFile.textContent}
                      </pre>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center min-h-[200px]">
                        <div className="text-center text-red-500">
                          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <p>ფაილის ჩატვირთვა ვერ მოხერხდა</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Materials Section */}
            {chapter.materials && chapter.materials.length > 0 && (
              <FileSection
                title="დამატებითი მასალები"
                files={chapter.materials}
                getPreviewType={getPreviewType}
                handleFilePreview={handleFilePreview}
              />
            )}

            {/* Assignments Section */}
            {chapter.assignments && chapter.assignments.length > 0 && (
              <FileSection
                title="დავალებები"
                files={chapter.assignments}
                getPreviewType={getPreviewType}
                handleFilePreview={handleFilePreview}
              />
            )}

            {/* Answers Section */}
            {chapter.answers && chapter.answers.length > 0 && (
              <FileSection
                title="პასუხები"
                files={chapter.answers}
                getPreviewType={getPreviewType}
                handleFilePreview={handleFilePreview}
                isAnswer={true}
                showAnswer={showAnswer}
                setShowAnswer={setShowAnswer}
              />
            )}

          </div>
        )}

        {/* Quiz Tab */}
        {activeTab === 'quiz' && chapter.quiz && (
          <div className="rounded-xl overflow-hidden">
            {quizMode === 'results' && completedAttemptId ? (
              <QuizResults
                attemptId={completedAttemptId}
                onRetry={onQuizRetry}
              />
            ) : (
              <QuizPlayer
                quizId={chapter.quiz.id}
                onComplete={onQuizComplete}
              />
            )}
          </div>
        )}

        {/* No content for selected tab */}
        {activeTab === 'video' && !chapter.video && (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>ამ თავისთვის ვიდეო არ არის ხელმისაწვდომი</p>
          </div>
        )}

        {activeTab === 'theory' && !chapter.theory && (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>ამ თავისთვის თეორიული მასალა არ არის ხელმისაწვდომი</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CourseLearningPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const slug = params.slug as string;
  const isMobile = useIsMobile();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('video');
  const [quizMode, setQuizMode] = useState<'start' | 'playing' | 'results'>('start');
  const [completedAttemptId, setCompletedAttemptId] = useState<string | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [hasShownCompletionModal, setHasShownCompletionModal] = useState(false);

  // Final Exam states
  const [showFinalExamIntro, setShowFinalExamIntro] = useState(false);
  const [finalExamMode, setFinalExamMode] = useState<'idle' | 'playing' | 'results'>('idle');
  const [finalExamAttemptId, setFinalExamAttemptId] = useState<string | null>(null);

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

  // Fetch final exam attempts
  const finalExamId = courseData?.data?.finalExam?.id;
  const { data: finalExamAttemptsData } = useQuery({
    queryKey: ['finalExamAttempts', finalExamId],
    queryFn: () => quizAttemptApi.getUserAttempts(finalExamId!),
    enabled: !!finalExamId,
  });

  const finalExamAttempts = finalExamAttemptsData?.data?.attempts || [];
  const lastFinalExamAttempt = finalExamAttempts[0] ? {
    id: finalExamAttempts[0].id,
    attemptNumber: finalExamAttempts[0].attemptNumber,
    score: finalExamAttempts[0].score || 0,
    passed: finalExamAttempts[0].passed || false,
    completedAt: finalExamAttempts[0].completedAt,
    timeSpent: finalExamAttempts[0].timeSpent,
  } : null;

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

  // Reset course progress mutation (for testing)
  const resetProgressMutation = useMutation({
    mutationFn: async () => {
      if (!courseData?.data?.course?.id) throw new Error('Course ID not found');
      return studentApiClient.resetCourseProgress(courseData.data.course.id);
    },
    onSuccess: (result) => {
      toast.success(`პროგრესი წაიშალა: ${result.data.deletedProgress} თავი, ${result.data.deletedAttempts} ქვიზი, ${result.data.deletedCertificates} სერტიფიკატი`);
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['courseForLearning', slug] });
      queryClient.invalidateQueries({ queryKey: ['chapterForLearning'] });
      queryClient.invalidateQueries({ queryKey: ['finalExamAttempts'] });
      // Reset local states
      setHasShownCompletionModal(false);
      setFinalExamMode('idle');
      setFinalExamAttemptId(null);
      setQuizMode('start');
      setCompletedAttemptId(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'პროგრესის წაშლა ვერ მოხერხდა');
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
      const hasFilesContent =
        (ch.materials && ch.materials.length > 0) ||
        (ch.assignments && ch.assignments.length > 0) ||
        (ch.answers && ch.answers.length > 0);
      if (ch.video) setActiveTab('video');
      else if (ch.theory) setActiveTab('theory');
      else if (hasFilesContent) setActiveTab('files');
      else if (ch.quiz) setActiveTab('quiz');
    }
  }, [chapterData]);

  // Check if course is completed and show modal
  useEffect(() => {
    if (courseData?.data && !hasShownCompletionModal) {
      const allCompleted = courseData.data.chapters.every((c) => c.progress.isCompleted);
      if (allCompleted && courseData.data.chapters.length > 0) {
        setShowCompletionModal(true);
        setHasShownCompletionModal(true);
      }
    }
  }, [courseData, hasShownCompletionModal]);

  const handleSelectChapter = (chapterId: string) => {
    setActiveChapterId(chapterId);
    // Reset quiz state when changing chapters
    setQuizMode('start');
    setCompletedAttemptId(null);
    // Exit final exam mode when selecting a chapter
    setFinalExamMode('idle');
  };

  const handleMarkComplete = () => {
    if (activeChapterId) {
      markCompleteMutation.mutate(activeChapterId);
    }
  };

  // Final Exam handlers
  const handleOpenFinalExamIntro = () => {
    setShowFinalExamIntro(true);
  };

  const handleStartFinalExam = () => {
    setShowFinalExamIntro(false);
    // If already passed, show results
    if (lastFinalExamAttempt?.passed && lastFinalExamAttempt?.id) {
      setFinalExamAttemptId(lastFinalExamAttempt.id);
      setFinalExamMode('results');
    } else {
      setFinalExamMode('playing');
    }
    setActiveChapterId(null); // Deselect chapter
  };

  const handleFinalExamComplete = (attempt: QuizAttempt) => {
    setFinalExamAttemptId(attempt.id);
    setFinalExamMode('results');
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['finalExamAttempts', finalExamId] });
    queryClient.invalidateQueries({ queryKey: ['courseForLearning', slug] });
  };

  const handleFinalExamRetry = () => {
    setFinalExamMode('playing');
    setFinalExamAttemptId(null);
  };

  const handleCloseFinalExam = () => {
    setFinalExamMode('idle');
    setFinalExamAttemptId(null);
    // Select first chapter
    if (chapters.length > 0) {
      setActiveChapterId(chapters[0].id);
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

  // Calculate chapter navigation state (used by swipe gesture hook)
  const chapters = courseData?.data?.chapters || [];
  const currentChapterIndex = chapters.findIndex((c) => c.id === activeChapterId);
  const hasPrevChapter = currentChapterIndex > 0;
  const hasNextChapter = currentChapterIndex >= 0 && currentChapterIndex < chapters.length - 1;

  // Swipe gestures for mobile navigation - must be called before any conditional returns
  const swipeHandlers = useSwipeGesture(
    hasNextChapter ? () => navigateChapter('next') : undefined,
    hasPrevChapter ? () => navigateChapter('prev') : undefined
  );

  if (isCourseLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-900"></div>
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">კურსი ვერ მოიძებნა</h2>
          <p className="text-gray-500 mb-4">ეს კურსი შესაძლოა არ არსებობდეს ან თქვენ არ გაქვთ მასზე წვდომა.</p>
          <Link
            href="/dashboard/courses"
            className="inline-flex items-center px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors"
          >
            ჩემს კურსებზე დაბრუნება
          </Link>
        </div>
      </div>
    );
  }

  const { course, progress, upgradeInfo, versionNumber } = courseData.data;

  // Handle upgrade button click
  const handleUpgrade = async () => {
    if (!upgradeInfo) return;
    try {
      const result = await studentApiClient.initiateUpgrade(
        course.id,
        upgradeInfo.availableVersionId
      );
      if (result.success && result.data?.redirectUrl) {
        window.location.href = result.data.redirectUrl;
      } else {
        toast.error(result.message || 'განახლების დაწყება ვერ მოხერხდა');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'განახლების დაწყება ვერ მოხერხდა');
    }
  };

  return (
    <div className="h-screen bg-gray-50 overflow-hidden">
      {/* Upgrade Banner */}
      {upgradeInfo && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-accent-500 text-white px-4 py-3 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-1.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-sm">
                  ახალი ვერსია ხელმისაწვდომია! v{upgradeInfo.currentVersionNumber} → v{upgradeInfo.availableVersionNumber}
                </p>
                <p className="text-xs text-white/90">
                  {upgradeInfo.availableVersionTitle}
                </p>
              </div>
            </div>
            <button
              onClick={handleUpgrade}
              className="px-4 py-1.5 bg-white text-accent-600 rounded-lg text-sm font-medium hover:bg-accent-50 transition-colors"
            >
              განახლება {upgradeInfo.upgradePrice > 0 && `- ${upgradeInfo.upgradePrice.toFixed(2)} ₾`}
            </button>
          </div>
        </div>
      )}

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
        finalExam={courseData.data.finalExam}
        lastFinalExamAttempt={lastFinalExamAttempt}
        onStartFinalExam={handleOpenFinalExamIntro}
        onResetProgress={() => resetProgressMutation.mutate()}
        isResetting={resetProgressMutation.isPending}
      />

      {/* Final Exam Intro Modal */}
      {courseData.data.finalExam && (
        <FinalExamIntro
          isOpen={showFinalExamIntro}
          onClose={() => setShowFinalExamIntro(false)}
          onStartExam={handleStartFinalExam}
          finalExam={courseData.data.finalExam}
          attempts={finalExamAttempts}
        />
      )}

      {/* Mobile Header */}
      {isMobile && (
        <div className={`fixed left-0 right-0 bg-white border-b border-gray-200 z-40 px-4 py-3 ${upgradeInfo ? 'top-12' : 'top-0'}`}>
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
        className={`transition-all duration-300 h-screen flex flex-col ${
          isMobile
            ? `ml-0 ${upgradeInfo ? 'pt-28' : 'pt-16'}`
            : `${sidebarCollapsed ? 'ml-16' : 'ml-80'} ${upgradeInfo ? 'pt-12' : ''}`
        }`}
        {...(isMobile ? swipeHandlers : {})}
      >
        {/* Final Exam Mode */}
        {finalExamMode !== 'idle' && courseData.data.finalExam ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Final Exam Header */}
            <div className="bg-primary-900 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold">{courseData.data.finalExam.title}</h1>
                  <p className="text-white/80 text-sm">საფინალო გამოცდა</p>
                </div>
              </div>
              {finalExamMode === 'results' && (
                <button
                  onClick={handleCloseFinalExam}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm"
                >
                  თავებზე დაბრუნება
                </button>
              )}
            </div>

            {/* Final Exam Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-20">
              <div className="max-w-4xl mx-auto">
                {finalExamMode === 'results' && finalExamAttemptId ? (
                  <QuizResults
                    attemptId={finalExamAttemptId}
                    onRetry={handleFinalExamRetry}
                  />
                ) : (
                  <QuizPlayer
                    quizId={courseData.data.finalExam.id}
                    onComplete={handleFinalExamComplete}
                  />
                )}
              </div>
            </div>
          </div>
        ) : isChapterLoading || !chapterData?.data ? (
          <div className="flex items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-900"></div>
          </div>
        ) : (
          <ChapterContent
            chapterData={chapterData.data}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onMarkComplete={handleMarkComplete}
            isMarkingComplete={markCompleteMutation.isPending}
            quizMode={quizMode}
            completedAttemptId={completedAttemptId}
            onQuizComplete={(attempt: QuizAttempt) => {
              setCompletedAttemptId(attempt.id);
              setQuizMode('results');
              // Invalidate both chapter and course queries to reflect completion
              queryClient.invalidateQueries({ queryKey: ['chapterForLearning', activeChapterId] });
              queryClient.invalidateQueries({ queryKey: ['courseForLearning', slug] });
            }}
            onQuizRetry={() => {
              setQuizMode('start');
              setCompletedAttemptId(null);
            }}
          />
        )}

        {/* Navigation Footer - Hidden during final exam */}
        {finalExamMode === 'idle' && (
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
              <span className="hidden sm:inline">წინა</span>
            </button>

            <span className="text-xs sm:text-sm text-gray-500 text-center">
              <span className="hidden sm:inline">თავი </span>{currentChapterIndex + 1}<span className="hidden sm:inline"> / </span><span className="sm:hidden">/</span>{chapters.length}<span className="hidden sm:inline">-დან</span>
            </span>

            <button
              onClick={() => navigateChapter('next')}
              disabled={!hasNextChapter}
              className={`flex items-center px-3 py-2 sm:px-4 rounded-lg transition-colors ${
                hasNextChapter
                  ? 'bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-600'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span className="hidden sm:inline">შემდეგი</span>
              <svg className="w-5 h-5 sm:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {/* Swipe hint for mobile */}
        {isMobile && finalExamMode === 'idle' && (
          <div className="fixed bottom-16 left-0 right-0 flex justify-center pointer-events-none">
            <div className="bg-gray-900 bg-opacity-70 text-white text-xs px-3 py-1.5 rounded-full opacity-0 animate-pulse">
              გადაფურცლეთ თავებს შორის გადასასვლელად
            </div>
          </div>
        )}

        {/* Course Completion Modal */}
        {courseData?.data && (
          <CourseCompletionModal
            isOpen={showCompletionModal}
            onClose={() => setShowCompletionModal(false)}
            courseTitle={courseData.data.course.title}
            completedChapters={courseData.data.progress.completedChapters}
            totalChapters={courseData.data.progress.totalChapters}
            certificate={courseData.data.certificate}
          />
        )}
      </div>
    </div>
  );
}

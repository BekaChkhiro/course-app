'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, ChevronLeft, ChevronRight, AlertTriangle, Check, Loader2, X, ZoomIn } from 'lucide-react';
import {
  quizApi,
  quizAttemptApi,
  Quiz,
  QuizAttempt,
  QuestionType,
} from '@/lib/api/quizApi';
import toast from 'react-hot-toast';

interface QuizPlayerProps {
  quizId: string;
  onComplete?: (attempt: QuizAttempt) => void;
}

const QuizPlayer: React.FC<QuizPlayerProps> = ({ quizId, onComplete }) => {
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [passedAttemptId, setPassedAttemptId] = useState<string | null>(null);
  const [attemptsInfo, setAttemptsInfo] = useState<{ used: number; max: number } | null>(null);

  const autoSaveTimerRef = useRef<NodeJS.Timeout>();
  const countdownTimerRef = useRef<NodeJS.Timeout>();
  const visibilityListenerRef = useRef<() => void>();
  const copyPasteListenerRef = useRef<(e: Event) => void>();

  useEffect(() => {
    loadQuiz();
    return () => cleanup();
  }, [quizId]);

  const cleanup = () => {
    if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (visibilityListenerRef.current) {
      document.removeEventListener('visibilitychange', visibilityListenerRef.current);
    }
    if (copyPasteListenerRef.current) {
      document.removeEventListener('copy', copyPasteListenerRef.current);
      document.removeEventListener('paste', copyPasteListenerRef.current);
    }
  };

  const loadQuiz = async () => {
    try {
      const [quizResponse, attemptsResponse] = await Promise.all([
        quizApi.getById(quizId, true),
        quizAttemptApi.getUserAttempts(quizId)
      ]);

      setQuiz(quizResponse.data);

      // Check if user has already passed
      const attempts = attemptsResponse.data || [];
      const passedAttempt = attempts.find((a: any) => a.passed && (a.status === 'COMPLETED' || a.status === 'TIME_EXPIRED'));

      if (passedAttempt) {
        setPassedAttemptId(passedAttempt.id);
      }

      // Calculate attempts info
      const completedAttempts = attempts.filter((a: any) => a.status === 'COMPLETED' || a.status === 'TIME_EXPIRED');
      const maxAttempts = quizResponse.data.maxAttempts ?? 2;
      setAttemptsInfo({ used: completedAttempts.length, max: maxAttempts });

      setLoading(false);
    } catch (error) {
      console.error('Failed to load quiz:', error);
      toast.error('ვერ ჩაიტვირთა ქვიზი');
      setLoading(false);
    }
  };

  const startQuiz = async () => {
    try {
      const response = await quizAttemptApi.start(quizId);
      const newAttempt = response.data;
      setAttempt(newAttempt);
      setHasStarted(true);

      if (newAttempt.autoSaveData?.answers) {
        setAnswers(newAttempt.autoSaveData.answers);
      }
      setCurrentQuestionIndex(newAttempt.currentQuestionIndex || 0);
      if (newAttempt.markedForReview.length > 0) {
        setMarkedForReview(new Set(newAttempt.markedForReview));
      }

      if (quiz?.timeLimit && quiz.timeLimit > 0) {
        const elapsed = Math.floor(
          (new Date().getTime() - new Date(newAttempt.startedAt).getTime()) / 1000
        );
        const remaining = Math.max(0, quiz.timeLimit * 60 - elapsed);
        setTimeRemaining(remaining);
        if (remaining === 0) {
          await handleTimeExpired();
          return;
        }
        setupCountdownTimer();
      }

      setupAutoSave();
      if (quiz?.preventTabSwitch) setupTabSwitchDetection();
      if (quiz?.preventCopyPaste) setupCopyPasteDetection();
    } catch (error: any) {
      console.error('Failed to start quiz:', error);
      const errorMessage = error.response?.data?.message || '';

      if (errorMessage.includes('ALREADY_PASSED')) {
        toast.error('ქვიზი უკვე გაიარეთ!');
        // Reload to show results
        loadQuiz();
      } else if (errorMessage.includes('Maximum attempts')) {
        toast.error('მცდელობები ამოიწურა');
      } else {
        toast.error(errorMessage || 'ვერ დაიწყო ქვიზი');
      }
    }
  };

  const setupAutoSave = () => {
    autoSaveTimerRef.current = setInterval(() => {
      if (attempt?.id) autoSave();
    }, 30000);
  };

  const autoSave = async () => {
    if (!attempt?.id) return;
    try {
      await quizAttemptApi.autoSave(attempt.id, {
        answers,
        currentQuestionIndex,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const setupCountdownTimer = () => {
    countdownTimerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 0) {
          handleTimeExpired();
          return 0;
        }
        if (prev === 300 && !showTimeWarning) {
          setShowTimeWarning(true);
          toast.error('დარჩენილია 5 წუთი!', { duration: 5000 });
        }
        return prev - 1;
      });
    }, 1000);
  };

  const setupTabSwitchDetection = () => {
    const handleVisibilityChange = () => {
      if (document.hidden && attempt?.id) {
        quizAttemptApi.logTabSwitch(attempt.id);
        toast.error('ტაბის გადართვა აღმოჩენილია');
      }
    };
    visibilityListenerRef.current = handleVisibilityChange;
    document.addEventListener('visibilitychange', handleVisibilityChange);
  };

  const setupCopyPasteDetection = () => {
    const handleCopyPaste = (e: Event) => {
      e.preventDefault();
      if (attempt?.id) {
        quizAttemptApi.logCopyPaste(attempt.id, e.type as 'copy' | 'paste');
        toast.error(`${e.type === 'copy' ? 'კოპირება' : 'ჩასმა'} აკრძალულია`);
      }
    };
    copyPasteListenerRef.current = handleCopyPaste;
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
  };

  const handleTimeExpired = async () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    toast.error('დრო ამოიწურა!');
    await submitQuiz();
  };

  const selectAnswer = async (questionId: string, answerId: string, isMultiple: boolean) => {
    if (!attempt?.id) return;

    let newAnswerIds: string[];
    if (isMultiple) {
      const current = answers[questionId] || [];
      newAnswerIds = current.includes(answerId)
        ? current.filter((id) => id !== answerId)
        : [...current, answerId];
    } else {
      newAnswerIds = [answerId];
    }

    setAnswers((prev) => ({ ...prev, [questionId]: newAnswerIds }));

    try {
      await quizAttemptApi.submitAnswer(attempt.id, questionId, newAnswerIds);
    } catch (error) {
      console.error('Failed to submit answer:', error);
    }
  };

  const toggleMarkForReview = async () => {
    if (!attempt?.id || !quiz?.questions) return;
    const questionId = quiz.questions[currentQuestionIndex].id;
    const newMarked = new Set(markedForReview);
    newMarked.has(questionId) ? newMarked.delete(questionId) : newMarked.add(questionId);
    setMarkedForReview(newMarked);
    try {
      await quizAttemptApi.toggleMarkForReview(attempt.id, questionId);
    } catch (error) {
      console.error('Failed to toggle mark:', error);
    }
  };

  const goToQuestion = (index: number) => {
    if (!quiz?.questions) return;

    // Check if trying to go forward
    if (index > currentQuestionIndex) {
      const currentQuestion = quiz.questions[currentQuestionIndex];
      const currentAnswers = answers[currentQuestion.id];

      // Block if current question is not answered
      if (!currentAnswers || currentAnswers.length === 0) {
        toast.error('გთხოვთ უპასუხოთ კითხვას შემდეგზე გადასვლამდე');
        return;
      }
    }

    if (index >= 0 && index < quiz.questions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  const submitQuiz = async () => {
    if (!attempt?.id || !quiz) return;

    const unansweredCount = quiz.questions?.filter(
      (q) => !answers[q.id] || answers[q.id].length === 0
    ).length || 0;

    // Block submission if any questions are unanswered
    if (unansweredCount > 0) {
      toast.error(`${unansweredCount} კითხვა უპასუხოდაა. უპასუხეთ ყველა კითხვას დასრულებამდე.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await quizAttemptApi.complete(attempt.id, timeRemaining || 0);
      cleanup();
      if (onComplete) {
        onComplete(response.data);
      } else {
        router.push(`/quiz/${quizId}/results/${attempt.id}`);
      }
    } catch (error: any) {
      console.error('Failed to submit quiz:', error);
      toast.error(error.response?.data?.message || 'ქვიზის დასრულება ვერ მოხერხდა');
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Quiz not found
  if (!quiz) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="w-10 h-10 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">ქვიზი ვერ მოიძებნა</p>
      </div>
    );
  }

  // If already passed - redirect to results
  if (passedAttemptId) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">ქვიზი ჩაბარებულია!</h2>
          <p className="text-gray-500 text-sm">{quiz.title}</p>
        </div>

        <button
          onClick={() => router.push(`/quiz/${quizId}/results/${passedAttemptId}`)}
          className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors"
        >
          შედეგების ნახვა
        </button>
      </div>
    );
  }

  // Check if max attempts reached
  const maxAttemptsReached = attemptsInfo && attemptsInfo.used >= attemptsInfo.max;

  // Start screen - Minimalist
  if (!hasStarted) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{quiz.title}</h2>
          {quiz.description && (
            <p className="text-gray-500 text-sm">{quiz.description}</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <p className="text-2xl font-semibold text-gray-900">{quiz.questions?.length || 0}</p>
            <p className="text-xs text-gray-500 mt-1">კითხვა</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <p className="text-2xl font-semibold text-gray-900">{quiz.passingScore}%</p>
            <p className="text-xs text-gray-500 mt-1">გამსვლელი</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <p className="text-2xl font-semibold text-gray-900">
              {quiz.timeLimit ? `${quiz.timeLimit}` : '∞'}
            </p>
            <p className="text-xs text-gray-500 mt-1">წუთი</p>
          </div>
        </div>

        {/* Attempts info */}
        {attemptsInfo && (
          <div className={`mb-6 p-4 rounded-xl ${maxAttemptsReached ? 'bg-red-50' : 'bg-blue-50'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm ${maxAttemptsReached ? 'text-red-700' : 'text-blue-700'}`}>
                მცდელობები
              </span>
              <span className={`text-sm font-medium ${maxAttemptsReached ? 'text-red-700' : 'text-blue-700'}`}>
                {attemptsInfo.used} / {attemptsInfo.max}
              </span>
            </div>
            {maxAttemptsReached && (
              <p className="text-xs text-red-600 mt-2">მცდელობები ამოიწურა</p>
            )}
          </div>
        )}

        {(quiz.preventTabSwitch) && (
          <div className="mb-6 p-4 bg-amber-50 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-700 space-y-1">
                {quiz.preventTabSwitch && <p>ტაბის გადართვა აღირიცხება</p>}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={startQuiz}
          disabled={maxAttemptsReached}
          className={`w-full py-3.5 rounded-xl font-medium transition-colors ${
            maxAttemptsReached
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}
        >
          დაწყება
        </button>
      </div>
    );
  }

  // Quiz in progress
  const currentQuestion = quiz.questions?.[currentQuestionIndex];
  const totalQuestions = quiz.questions?.length || 0;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-900">
              {currentQuestionIndex + 1} / {totalQuestions}
            </span>
            <div className="h-4 w-px bg-gray-200" />
            <span className="text-sm text-gray-500">
              {answeredCount} პასუხგაცემული
            </span>
          </div>

          {timeRemaining !== null && (
            <div className={`flex items-center gap-1.5 text-sm font-mono ${
              timeRemaining < 300 ? 'text-red-600' : 'text-gray-600'
            }`}>
              <Clock className="w-4 h-4" />
              {formatTime(timeRemaining)}
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-900 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      {currentQuestion && (
        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-start justify-between gap-4 mb-1">
              <h3 className="text-lg font-medium text-gray-900 leading-relaxed">
                {currentQuestion.question}
              </h3>
              {currentQuestion.points > 1 && (
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {currentQuestion.points} ქ.
                </span>
              )}
            </div>
            {currentQuestion.questionImage && (
              <div
                className="mt-4 relative inline-block cursor-zoom-in group"
                onClick={() => setZoomedImage(currentQuestion.questionImage)}
              >
                <img
                  src={currentQuestion.questionImage}
                  alt=""
                  className="max-w-md rounded-lg transition-opacity group-hover:opacity-90"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black/50 rounded-full p-2">
                    <ZoomIn className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Answer options */}
          <div className="space-y-2">
            {currentQuestion.answers.map((answer, idx) => {
              const isSelected = answers[currentQuestion.id]?.includes(answer.id);
              const isMultiple = currentQuestion.type === QuestionType.MULTIPLE_CHOICE;
              const letter = String.fromCharCode(65 + idx); // A, B, C, D

              return (
                <button
                  key={answer.id}
                  onClick={() => selectAnswer(currentQuestion.id, answer.id, isMultiple)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                      isSelected
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {isSelected ? <Check className="w-4 h-4" /> : letter}
                    </span>
                    <span className={`pt-0.5 ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                      {answer.answer}
                    </span>
                  </div>
                  {answer.answerImage && (
                    <div
                      className="mt-3 ml-10 relative inline-block cursor-zoom-in group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomedImage(answer.answerImage);
                      }}
                    >
                      <img
                        src={answer.answerImage}
                        alt=""
                        className="max-w-xs rounded-lg transition-opacity group-hover:opacity-90"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-black/50 rounded-full p-2">
                          <ZoomIn className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <button
            onClick={() => goToQuestion(currentQuestionIndex - 1)}
            disabled={currentQuestionIndex === 0}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            წინა
          </button>

          {/* Question dots */}
          <div className="flex items-center gap-1.5">
            {quiz.questions?.map((q, idx) => {
              const isAnswered = answers[q.id]?.length > 0;
              const isCurrent = idx === currentQuestionIndex;
              const isMarked = markedForReview.has(q.id);

              return (
                <button
                  key={q.id}
                  onClick={() => goToQuestion(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    isCurrent
                      ? 'w-6 bg-gray-900'
                      : isMarked
                      ? 'bg-amber-400'
                      : isAnswered
                      ? 'bg-gray-400'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                  title={`კითხვა ${idx + 1}`}
                />
              );
            })}
          </div>

          {currentQuestionIndex === totalQuestions - 1 ? (
            <button
              onClick={submitQuiz}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'დასრულება'
              )}
            </button>
          ) : (
            <button
              onClick={() => goToQuestion(currentQuestionIndex + 1)}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-900 font-medium hover:bg-gray-100 rounded-lg transition-colors"
            >
              შემდეგი
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mark for review - subtle */}
      {currentQuestion && (
        <div className="px-6 pb-4 bg-gray-50">
          <button
            onClick={toggleMarkForReview}
            className={`text-xs transition-colors ${
              markedForReview.has(currentQuestion.id)
                ? 'text-amber-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {markedForReview.has(currentQuestion.id) ? '★ მონიშნული' : '☆ მონიშვნა'}
          </button>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setZoomedImage(null)}
        >
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={zoomedImage}
            alt=""
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default QuizPlayer;

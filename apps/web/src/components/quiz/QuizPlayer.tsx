'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader,
} from 'lucide-react';
import {
  quizApi,
  quizAttemptApi,
  Quiz,
  QuizAttempt,
  QuizQuestion,
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

  const autoSaveTimerRef = useRef<NodeJS.Timeout>();
  const countdownTimerRef = useRef<NodeJS.Timeout>();
  const visibilityListenerRef = useRef<() => void>();
  const copyPasteListenerRef = useRef<(e: Event) => void>();

  // Load quiz and check for existing attempt
  useEffect(() => {
    loadQuiz();
    return () => {
      cleanup();
    };
  }, [quizId]);

  const cleanup = () => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
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
      const response = await quizApi.getById(quizId, true);
      setQuiz(response.data);
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

      // Restore previous answers if resuming
      if (newAttempt.autoSaveData?.answers) {
        setAnswers(newAttempt.autoSaveData.answers);
      }

      // Set current question index
      setCurrentQuestionIndex(newAttempt.currentQuestionIndex || 0);

      // Restore marked questions
      if (newAttempt.markedForReview.length > 0) {
        setMarkedForReview(new Set(newAttempt.markedForReview));
      }

      // Calculate time remaining
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
      }

      // Setup auto-save
      setupAutoSave();

      // Setup timer if time limit exists
      if (quiz?.timeLimit && quiz.timeLimit > 0) {
        setupCountdownTimer();
      }

      // Setup anti-cheating measures
      if (quiz?.preventTabSwitch) {
        setupTabSwitchDetection();
      }

      if (quiz?.preventCopyPaste) {
        setupCopyPasteDetection();
      }

      toast.success('ქვიზი დაწყებულია!');
    } catch (error: any) {
      console.error('Failed to start quiz:', error);
      toast.error(error.response?.data?.message || 'ვერ დაიწყო ქვიზი');
    }
  };

  const setupAutoSave = () => {
    autoSaveTimerRef.current = setInterval(() => {
      if (attempt?.id) {
        autoSave();
      }
    }, 30000); // Every 30 seconds
  };

  const autoSave = async () => {
    if (!attempt?.id) return;

    try {
      await quizAttemptApi.autoSave(attempt.id, {
        answers,
        currentQuestionIndex,
        timestamp: new Date().toISOString(),
      });
      console.log('Auto-saved at', new Date().toISOString());
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

        // Show warning at 5 minutes
        if (prev === 300 && !showTimeWarning) {
          setShowTimeWarning(true);
          toast.error('⏰ დარჩენილია 5 წუთი!', { duration: 5000 });
        }

        return prev - 1;
      });
    }, 1000);
  };

  const setupTabSwitchDetection = () => {
    const handleVisibilityChange = () => {
      if (document.hidden && attempt?.id) {
        quizAttemptApi.logTabSwitch(attempt.id);
        toast.error('⚠️ გაფრთხილება: ტაბის გადართვა აღმოჩენილია!');
      }
    };

    visibilityListenerRef.current = handleVisibilityChange;
    document.addEventListener('visibilitychange', handleVisibilityChange);
  };

  const setupCopyPasteDetection = () => {
    const handleCopyPaste = (e: Event) => {
      e.preventDefault();
      if (attempt?.id) {
        quizAttemptApi.logCopyPaste(
          attempt.id,
          e.type as 'copy' | 'paste'
        );
        toast.error(`⚠️ ${e.type === 'copy' ? 'კოპირება' : 'ჩასმა'} აკრძალულია!`);
      }
    };

    copyPasteListenerRef.current = handleCopyPaste;
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
  };

  const handleTimeExpired = async () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }

    toast.error('⏰ დრო ამოიწურა! ქვიზი ავტომატურად დასრულდა.');
    await submitQuiz();
  };

  const selectAnswer = async (questionId: string, answerId: string, isMultiple: boolean) => {
    if (!attempt?.id) return;

    let newAnswerIds: string[];

    if (isMultiple) {
      const current = answers[questionId] || [];
      if (current.includes(answerId)) {
        newAnswerIds = current.filter((id) => id !== answerId);
      } else {
        newAnswerIds = [...current, answerId];
      }
    } else {
      newAnswerIds = [answerId];
    }

    setAnswers((prev) => ({
      ...prev,
      [questionId]: newAnswerIds,
    }));

    // Submit answer to backend
    try {
      await quizAttemptApi.submitAnswer(
        attempt.id,
        questionId,
        newAnswerIds
      );
    } catch (error) {
      console.error('Failed to submit answer:', error);
      toast.error('პასუხი ვერ შეინახა');
    }
  };

  const toggleMarkForReview = async () => {
    if (!attempt?.id || !quiz?.questions) return;

    const questionId = quiz.questions[currentQuestionIndex].id;
    const newMarked = new Set(markedForReview);

    if (newMarked.has(questionId)) {
      newMarked.delete(questionId);
    } else {
      newMarked.add(questionId);
    }

    setMarkedForReview(newMarked);

    try {
      await quizAttemptApi.toggleMarkForReview(attempt.id, questionId);
    } catch (error) {
      console.error('Failed to toggle mark:', error);
    }
  };

  const goToQuestion = (index: number) => {
    if (!quiz?.questions) return;
    if (index >= 0 && index < quiz.questions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  const submitQuiz = async () => {
    if (!attempt?.id || !quiz) return;

    // Check if all questions are answered
    const unansweredCount = quiz.questions?.filter(
      (q) => !answers[q.id] || answers[q.id].length === 0
    ).length || 0;

    if (unansweredCount > 0) {
      const confirm = window.confirm(
        `თქვენ ${unansweredCount} კითხვას ჯერ არ უპასუხეთ. დარწმუნებული ხართ რომ გსურთ დასრულება?`
      );
      if (!confirm) return;
    }

    setIsSubmitting(true);

    try {
      const response = await quizAttemptApi.complete(attempt.id, timeRemaining || 0);
      const completedAttempt = response.data;

      cleanup();

      toast.success('ქვიზი დასრულებულია!');

      if (onComplete) {
        onComplete(completedAttempt);
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
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-16 h-16 mx-auto text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">ქვიზი ვერ მოიძებნა</h2>
      </div>
    );
  }

  // Start screen
  if (!hasStarted) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-4">{quiz.title}</h1>
          {quiz.description && (
            <p className="text-gray-600 mb-6">{quiz.description}</p>
          )}

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>
                <strong>კითხვები:</strong> {quiz.questions?.length || 0}
              </span>
            </div>

            {quiz.timeLimit && quiz.timeLimit > 0 && (
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-600" />
                <span>
                  <strong>დრო:</strong> {quiz.timeLimit} წუთი
                </span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-purple-600" />
              <span>
                <strong>გასავლელი ქულა:</strong> {quiz.passingScore}%
              </span>
            </div>

            {quiz.maxAttempts && (
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <span>
                  <strong>მცდელობები:</strong> მაქსიმუმ {quiz.maxAttempts}
                </span>
              </div>
            )}
          </div>

          {quiz.preventTabSwitch && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                ⚠️ <strong>გაფრთხილება:</strong> ტაბის გადართვა აღინიშნება და შეიძლება
                გავლენა იქონიოს შედეგზე.
              </p>
            </div>
          )}

          <button
            onClick={startQuiz}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 font-medium text-lg"
          >
            ქვიზის დაწყება
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions?.[currentQuestionIndex];
  const progress = quiz.questions
    ? ((Object.keys(answers).length / quiz.questions.length) * 100).toFixed(0)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Timer */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">{quiz.title}</h1>
              <p className="text-sm text-gray-600">
                კითხვა {currentQuestionIndex + 1} / {quiz.questions?.length}
              </p>
            </div>

            {timeRemaining !== null && (
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg ${
                  timeRemaining < 300
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                <Clock className="w-5 h-5" />
                {formatTime(timeRemaining)}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {quiz.showProgressBar && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-1 text-right">
                {progress}% დასრულებული
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Question Area */}
          <div className="lg:col-span-3">
            {currentQuestion && (
              <div className="bg-white rounded-lg shadow-lg p-8">
                {/* Question */}
                <div className="mb-6">
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="text-xl font-semibold flex-1">
                      {currentQuestion.question}
                    </h2>
                    <span className="ml-4 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {currentQuestion.points} ქულა
                    </span>
                  </div>

                  {currentQuestion.questionImage && (
                    <img
                      src={currentQuestion.questionImage}
                      alt="Question"
                      className="max-w-full rounded-lg mb-4"
                    />
                  )}
                </div>

                {/* Answers */}
                <div className="space-y-3">
                  {currentQuestion.answers.map((answer) => {
                    const isSelected = answers[currentQuestion.id]?.includes(
                      answer.id
                    );
                    const isMultiple =
                      currentQuestion.type === QuestionType.MULTIPLE_CHOICE;

                    return (
                      <button
                        key={answer.id}
                        onClick={() =>
                          selectAnswer(currentQuestion.id, answer.id, isMultiple)
                        }
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            {isMultiple ? (
                              <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-blue-600 border-blue-600'
                                    : 'border-gray-300'
                                }`}
                              >
                                {isSelected && (
                                  <CheckCircle className="w-4 h-4 text-white" />
                                )}
                              </div>
                            ) : (
                              <div
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-blue-600 border-blue-600'
                                    : 'border-gray-300'
                                }`}
                              >
                                {isSelected && (
                                  <div className="w-2 h-2 bg-white rounded-full" />
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex-1">
                            <p className="text-gray-900">{answer.answer}</p>
                            {answer.answerImage && (
                              <img
                                src={answer.answerImage}
                                alt="Answer"
                                className="mt-2 max-w-xs rounded"
                              />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t">
                  <button
                    onClick={() => goToQuestion(currentQuestionIndex - 1)}
                    disabled={currentQuestionIndex === 0}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    წინა
                  </button>

                  <button
                    onClick={toggleMarkForReview}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                      markedForReview.has(currentQuestion.id)
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Flag className="w-5 h-5" />
                    {markedForReview.has(currentQuestion.id)
                      ? 'მონიშნულია'
                      : 'მონიშვნა'}
                  </button>

                  {currentQuestionIndex === (quiz.questions?.length || 0) - 1 ? (
                    <button
                      onClick={submitQuiz}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <Loader className="w-5 h-5 animate-spin" />
                      ) : (
                        <CheckCircle className="w-5 h-5" />
                      )}
                      დასრულება
                    </button>
                  ) : (
                    <button
                      onClick={() => goToQuestion(currentQuestionIndex + 1)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      შემდეგი
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Question Navigation Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-4 sticky top-24">
              <h3 className="font-semibold mb-4">კითხვები</h3>
              <div className="grid grid-cols-5 lg:grid-cols-4 gap-2">
                {quiz.questions?.map((q, index) => {
                  const isAnswered = answers[q.id] && answers[q.id].length > 0;
                  const isMarked = markedForReview.has(q.id);
                  const isCurrent = index === currentQuestionIndex;

                  return (
                    <button
                      key={q.id}
                      onClick={() => goToQuestion(index)}
                      className={`w-10 h-10 rounded-lg font-medium text-sm flex items-center justify-center relative ${
                        isCurrent
                          ? 'bg-blue-600 text-white'
                          : isAnswered
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {index + 1}
                      {isMarked && (
                        <Flag className="w-3 h-3 absolute -top-1 -right-1 text-yellow-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 rounded" />
                  <span>პასუხგაცემული</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-100 rounded" />
                  <span>უპასუხო</span>
                </div>
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4 text-yellow-500" />
                  <span>მონიშნული</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizPlayer;

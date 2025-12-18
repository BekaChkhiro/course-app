'use client';

import React, { useState, useEffect } from 'react';
import {
  Check,
  X,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  Award,
  Download,
  ZoomIn,
} from 'lucide-react';
import { quizAttemptApi, QuizAttempt } from '@/lib/api/quizApi';
import toast from 'react-hot-toast';

interface QuizResultsProps {
  attemptId: string;
  onRetry?: () => void;
}

const QuizResults: React.FC<QuizResultsProps> = ({ attemptId, onRetry }) => {
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [regeneratingCert, setRegeneratingCert] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  useEffect(() => {
    loadResults();
  }, [attemptId]);

  const loadResults = async () => {
    try {
      const response = await quizAttemptApi.getResults(attemptId);
      setAttempt(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load results:', error);
      toast.error('შედეგების ჩატვირთვა ვერ მოხერხდა');
      setLoading(false);
    }
  };

  const handleRegenerateCertificate = async () => {
    try {
      setRegeneratingCert(true);
      const response = await quizAttemptApi.regenerateCertificate(attemptId);
      if (response.data) {
        // Reload results to get updated certificate
        await loadResults();
        toast.success('სერტიფიკატი წარმატებით შეიქმნა!');
      }
    } catch (error: any) {
      console.error('Failed to regenerate certificate:', error);
      toast.error(error.response?.data?.message || 'სერტიფიკატის გენერაცია ვერ მოხერხდა');
    } finally {
      setRegeneratingCert(false);
    }
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!attempt || !attempt.quiz) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="w-10 h-10 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">შედეგი ვერ მოიძებნა</p>
      </div>
    );
  }

  const score = Number(attempt.score) || 0;
  const passed = attempt.passed || false;
  const correctCount = attempt.responses?.filter((r) => r.isCorrect).length || 0;
  const totalQuestions = attempt.quiz.questions?.length || 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Result Header */}
      <div className={`p-8 text-center ${passed ? 'bg-green-50' : 'bg-gray-50'}`}>
        {/* Score Circle */}
        <div className="relative inline-flex items-center justify-center mb-4">
          <svg className="w-32 h-32 transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-gray-200"
            />
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${(score / 100) * 352} 352`}
              strokeLinecap="round"
              className={passed ? 'text-green-500' : 'text-gray-400'}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-gray-900">{Math.round(score)}%</span>
          </div>
        </div>

        <h2 className={`text-xl font-semibold mb-1 ${passed ? 'text-green-700' : 'text-gray-700'}`}>
          {passed ? 'გილოცავთ!' : 'სამწუხაროდ'}
        </h2>
        <p className="text-sm text-gray-500">
          {passed ? 'ქვიზი წარმატებით გაიარეთ' : 'ქვიზი ვერ გაიარეთ'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
        <div className="p-4 text-center">
          <p className="text-2xl font-semibold text-gray-900">
            {correctCount}/{totalQuestions}
          </p>
          <p className="text-xs text-gray-500 mt-1">სწორი</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-2xl font-semibold text-gray-900">
            {formatTime(attempt.timeSpent)}
          </p>
          <p className="text-xs text-gray-500 mt-1">დრო</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-2xl font-semibold text-gray-900">
            {attempt.pointsEarned || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">ქულა</p>
        </div>
      </div>

      {/* Warnings */}
      {(attempt.tabSwitchCount > 0 || attempt.copyPasteCount > 0) && (
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-100">
          <div className="flex items-center gap-2 text-xs text-amber-700">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>
              {attempt.tabSwitchCount > 0 && `ტაბის გადართვა: ${attempt.tabSwitchCount}`}
              {attempt.tabSwitchCount > 0 && attempt.copyPasteCount > 0 && ' • '}
              {attempt.copyPasteCount > 0 && `კოპირება/ჩასმა: ${attempt.copyPasteCount}`}
            </span>
          </div>
        </div>
      )}

      {/* Certificate - only show if quiz generates certificates (final exams) */}
      {attempt.quiz?.generateCertificate && (
        attempt.certificate ? (
          <div className="px-6 py-4 bg-primary-50 border-b border-primary-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary-900" />
                <span className="text-sm font-medium text-primary-900">სერტიფიკატი მზადაა</span>
              </div>
              {attempt.certificate.pdfUrl && (
                <button
                  onClick={() => window.open(attempt.certificate?.pdfUrl, '_blank')}
                  className="flex items-center gap-1.5 text-sm text-primary-900 hover:text-primary-800"
                >
                  <Download className="w-4 h-4" />
                  ჩამოტვირთვა
                </button>
              )}
            </div>
          </div>
        ) : passed && (
          <div className="px-6 py-4 bg-amber-50 border-b border-amber-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-900">სერტიფიკატი ჯერ არ შექმნილა</span>
              </div>
              <button
                onClick={handleRegenerateCertificate}
                disabled={regeneratingCert}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                {regeneratingCert ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Award className="w-4 h-4" />
                )}
                {regeneratingCert ? 'იქმნება...' : 'სერტიფიკატის გენერაცია'}
              </button>
            </div>
          </div>
        )
      )}

      {/* Actions */}
      <div className="p-6 space-y-3">
        {(() => {
          // Don't show retry if passed
          if (passed) return null;

          // Check if max attempts reached
          const maxAttempts = attempt.quiz?.maxAttempts ?? 3;
          const attemptsUsed = attempt.attemptNumber || 1;

          if (attemptsUsed >= maxAttempts) {
            return (
              <div className="text-center p-4 bg-red-50 rounded-xl">
                <p className="text-sm text-red-700 font-medium">მცდელობები ამოიწურა</p>
                <p className="text-xs text-red-600 mt-1">{attemptsUsed} / {maxAttempts} მცდელობა</p>
              </div>
            );
          }

          // Show retry button if onRetry is provided
          if (onRetry) {
            return (
              <button
                onClick={onRetry}
                className="w-full flex items-center justify-center gap-2 py-3 bg-accent-600 text-white rounded-xl font-medium hover:bg-accent-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                თავიდან ცდა ({attemptsUsed} / {maxAttempts})
              </button>
            );
          }

          return null;
        })()}

        {attempt.quiz?.showCorrectAnswers && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            {showDetails ? (
              <>
                <ChevronUp className="w-4 h-4" />
                დამალვა
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                დეტალების ნახვა
              </>
            )}
          </button>
        )}
      </div>

      {/* Detailed Review */}
      {showDetails && attempt.quiz?.questions && (
        <div className="border-t border-gray-100">
          <div className="p-6 space-y-4">
            {attempt.quiz.questions.map((question, index) => {
              const response = attempt.responses?.find((r) => r.questionId === question.id);
              const isCorrect = response?.isCorrect || false;

              return (
                <div
                  key={question.id}
                  className={`p-4 rounded-xl border-2 ${
                    isCorrect ? 'border-green-100 bg-green-50/50' : 'border-red-100 bg-red-50/50'
                  }`}
                >
                  {/* Question header */}
                  <div className="flex items-start gap-3 mb-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      }`}
                    >
                      {isCorrect ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        <span className="text-gray-400 mr-1">{index + 1}.</span>
                        {question.question}
                      </p>
                      {question.questionImage && (
                        <div
                          className="mt-2 relative inline-block cursor-zoom-in group"
                          onClick={() => setZoomedImage(question.questionImage)}
                        >
                          <img
                            src={question.questionImage}
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
                    </div>
                  </div>

                  {/* Answers */}
                  <div className="ml-9 space-y-1.5">
                    {question.answers.map((answer) => {
                      const isUserAnswer = response?.answerIds?.includes(answer.id);
                      const isCorrectAnswer = answer.isCorrect;

                      let className = 'px-3 py-2 rounded-lg text-sm ';
                      if (isCorrectAnswer) {
                        className += 'bg-green-100 text-green-800';
                      } else if (isUserAnswer && !isCorrectAnswer) {
                        className += 'bg-red-100 text-red-800 line-through';
                      } else {
                        className += 'bg-gray-50 text-gray-600';
                      }

                      return (
                        <div key={answer.id} className={className}>
                          <div className="flex items-center gap-2">
                            {isCorrectAnswer && <Check className="w-3.5 h-3.5 text-green-600" />}
                            {isUserAnswer && !isCorrectAnswer && <X className="w-3.5 h-3.5 text-red-600" />}
                            <span>{answer.answer}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {!isCorrect && question.explanation && attempt.quiz?.showExplanations && (
                    <div className="ml-9 mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-800">
                        <span className="font-medium">განმარტება:</span> {question.explanation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer info */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-center gap-4 mb-2">
          <span className="flex items-center gap-1.5 text-sm">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="text-gray-600">{correctCount} სწორი</span>
          </span>
          <span className="flex items-center gap-1.5 text-sm">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="text-gray-600">{totalQuestions - correctCount} არასწორი</span>
          </span>
        </div>
        <p className="text-xs text-gray-400 text-center">
          გამსვლელი ქულა: {attempt.quiz?.passingScore}% • მცდელობა #{attempt.attemptNumber}
          {attempt.quiz?.maxAttempts && ` / ${attempt.quiz.maxAttempts}`}
        </p>
      </div>

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

export default QuizResults;

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle,
  XCircle,
  Trophy,
  Clock,
  Target,
  AlertTriangle,
  Download,
  RefreshCw,
  Loader,
  Award,
} from 'lucide-react';
import { quizAttemptApi, QuizAttempt, QuizResponse } from '@/lib/api/quizApi';
import toast from 'react-hot-toast';

interface QuizResultsProps {
  attemptId: string;
  onRetry?: () => void;
}

const QuizResults: React.FC<QuizResultsProps> = ({ attemptId, onRetry }) => {
  const router = useRouter();
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAnswers, setShowAnswers] = useState(false);

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

  const formatTime = (seconds?: number) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const downloadCertificate = () => {
    if (attempt?.certificate?.pdfUrl) {
      window.open(attempt.certificate.pdfUrl, '_blank');
    } else {
      toast.error('სერტიფიკატი ჯერ არ არის მზად');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!attempt || !attempt.quiz) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-16 h-16 mx-auto text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">შედეგი ვერ მოიძებნა</h2>
      </div>
    );
  }

  const score = attempt.score || 0;
  const passed = attempt.passed || false;
  const correctCount =
    attempt.responses?.filter((r) => r.isCorrect).length || 0;
  const totalQuestions = attempt.quiz.questions?.length || 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Results Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="text-center">
            {passed ? (
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                  <Trophy className="w-10 h-10 text-green-600" />
                </div>
                <h1 className="text-3xl font-bold text-green-600 mb-2">
                  გილოცავთ! 🎉
                </h1>
                <p className="text-lg text-gray-600">
                  წარმატებით გაიარეთ ქვიზი
                </p>
              </div>
            ) : (
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
                <h1 className="text-3xl font-bold text-red-600 mb-2">
                  ვერ გაიარეთ
                </h1>
                <p className="text-lg text-gray-600">
                  სცადეთ თავიდან გაუმჯობესებისთვის
                </p>
              </div>
            )}

            {/* Score Display */}
            <div className="inline-block bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg px-8 py-6 mb-6">
              <div className="text-5xl font-bold mb-2">{score.toFixed(1)}%</div>
              <div className="text-blue-100">თქვენი შედეგი</div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
                  <Target className="w-5 h-5" />
                  <span className="text-sm">სწორი პასუხები</span>
                </div>
                <div className="text-2xl font-bold">
                  {correctCount} / {totalQuestions}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
                  <Clock className="w-5 h-5" />
                  <span className="text-sm">დახარჯული დრო</span>
                </div>
                <div className="text-2xl font-bold">
                  {formatTime(attempt.timeSpent)}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm">ქულები</span>
                </div>
                <div className="text-2xl font-bold">
                  {attempt.pointsEarned} / {attempt.totalPoints}
                </div>
              </div>
            </div>

            {/* Warning Messages */}
            {attempt.tabSwitchCount > 0 && (
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertTriangle className="w-5 h-5" />
                  <span>
                    ტაბის გადართვა აღინიშნა {attempt.tabSwitchCount} ჯერ
                  </span>
                </div>
              </div>
            )}

            {attempt.copyPasteCount > 0 && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertTriangle className="w-5 h-5" />
                  <span>
                    კოპირება/ჩასმა სცადეთ {attempt.copyPasteCount} ჯერ
                  </span>
                </div>
              </div>
            )}

            {/* Certificate */}
            {attempt.certificate && (
              <div className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Award className="w-8 h-8 text-purple-600" />
                  <h3 className="text-xl font-bold text-purple-900">
                    სერტიფიკატი მზადაა!
                  </h3>
                </div>
                <p className="text-gray-600 mb-4">
                  სერტიფიკატის ნომერი: {attempt.certificate.certificateNumber}
                </p>
                <button
                  onClick={downloadCertificate}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Download className="w-5 h-5" />
                  სერტიფიკატის ჩამოტვირთვა
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center mt-8">
              {!passed && onRetry && (
                <button
                  onClick={onRetry}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <RefreshCw className="w-5 h-5" />
                  თავიდან ცდა
                </button>
              )}

              {attempt.quiz.showCorrectAnswers && (
                <button
                  onClick={() => setShowAnswers(!showAnswers)}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  {showAnswers ? 'დამალვა' : 'პასუხების ნახვა'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Question Review */}
        {showAnswers && attempt.responses && attempt.quiz.questions && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">დეტალური მიმოხილვა</h2>

            {attempt.quiz.questions.map((question, index) => {
              const response = attempt.responses?.find(
                (r) => r.questionId === question.id
              );
              const isCorrect = response?.isCorrect || false;

              return (
                <div
                  key={question.id}
                  className={`bg-white rounded-lg shadow-lg p-6 border-l-4 ${
                    isCorrect ? 'border-green-500' : 'border-red-500'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold flex-1">
                      <span className="text-gray-500 mr-2">
                        {index + 1}.
                      </span>
                      {question.question}
                    </h3>
                    {isCorrect ? (
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                    )}
                  </div>

                  {question.questionImage && (
                    <img
                      src={question.questionImage}
                      alt="Question"
                      className="max-w-md rounded-lg mb-4"
                    />
                  )}

                  {/* Answers */}
                  <div className="space-y-2">
                    {question.answers.map((answer) => {
                      const isUserAnswer = response?.answerIds.includes(
                        answer.id
                      );
                      const isCorrectAnswer = answer.isCorrect;

                      let bgColor = 'bg-gray-50';
                      let borderColor = 'border-gray-200';
                      let textColor = 'text-gray-900';

                      if (isCorrectAnswer) {
                        bgColor = 'bg-green-50';
                        borderColor = 'border-green-500';
                        textColor = 'text-green-900';
                      } else if (isUserAnswer && !isCorrectAnswer) {
                        bgColor = 'bg-red-50';
                        borderColor = 'border-red-500';
                        textColor = 'text-red-900';
                      }

                      return (
                        <div
                          key={answer.id}
                          className={`p-3 rounded-lg border-2 ${bgColor} ${borderColor}`}
                        >
                          <div className="flex items-start gap-2">
                            {isCorrectAnswer && (
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            )}
                            {isUserAnswer && !isCorrectAnswer && (
                              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            )}
                            <p className={textColor}>{answer.answer}</p>
                          </div>
                          {answer.answerImage && (
                            <img
                              src={answer.answerImage}
                              alt="Answer"
                              className="mt-2 max-w-xs rounded"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {!isCorrect &&
                    question.explanation &&
                    attempt.quiz.showExplanations && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <span className="text-blue-700 font-medium">
                            💡 განმარტება:
                          </span>
                          <p className="text-blue-900">{question.explanation}</p>
                        </div>
                      </div>
                    )}

                  {/* Points */}
                  <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      მოპოვებული ქულები: {response?.pointsEarned || 0} /{' '}
                      {question.points}
                    </span>
                    {response?.timeSpent && (
                      <span className="text-gray-600">
                        დრო: {formatTime(response.timeSpent)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Passing Score Info */}
        <div className="mt-6 text-center text-gray-600">
          <p>
            გასავლელი ქულა: {attempt.quiz.passingScore}% | მცდელობა:{' '}
            {attempt.attemptNumber}
            {attempt.quiz.maxAttempts && ` / ${attempt.quiz.maxAttempts}`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuizResults;

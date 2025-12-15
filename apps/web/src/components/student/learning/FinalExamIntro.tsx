'use client';

import { useState } from 'react';
import {
  Trophy,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  X,
  Play,
  Shield,
  Monitor,
  Copy,
  History,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface FinalExamData {
  id: string;
  title: string;
  type: string;
  passingScore: number;
  timeLimit: number | null;
  lockUntilChaptersComplete: boolean;
  isUnlocked: boolean;
  maxAttempts?: number;
  preventTabSwitch?: boolean;
  preventCopyPaste?: boolean;
  requireFullscreen?: boolean;
  questionCount?: number;
}

interface FinalExamAttempt {
  id: string;
  attemptNumber: number;
  score: number;
  passed: boolean;
  completedAt: string;
  timeSpent?: number;
}

interface FinalExamIntroProps {
  isOpen: boolean;
  onClose: () => void;
  onStartExam: () => void;
  finalExam: FinalExamData;
  attempts?: FinalExamAttempt[];
  isStarting?: boolean;
}

export default function FinalExamIntro({
  isOpen,
  onClose,
  onStartExam,
  finalExam,
  attempts = [],
  isStarting = false,
}: FinalExamIntroProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [agreedToRules, setAgreedToRules] = useState(false);

  if (!isOpen) return null;

  const lastAttempt = attempts[0];
  const hasPassed = lastAttempt?.passed;
  const attemptsRemaining = finalExam.maxAttempts
    ? finalExam.maxAttempts - attempts.length
    : null;
  const canRetry = attemptsRemaining === null || attemptsRemaining > 0;


  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ka-GE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{finalExam.title}</h2>
              <p className="text-white/80 text-sm">საფინალო გამოცდა</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-6">
            {finalExam.timeLimit && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 opacity-80" />
                <span className="text-sm">{finalExam.timeLimit} წუთი</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 opacity-80" />
              <span className="text-sm">{finalExam.passingScore}% საჭირო</span>
            </div>
            {finalExam.questionCount && (
              <div className="flex items-center gap-2">
                <span className="text-sm">{finalExam.questionCount} კითხვა</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Previous Result Banner */}
          {lastAttempt && (
            <div
              className={`mb-6 p-4 rounded-xl ${
                hasPassed
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-amber-50 border border-amber-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {hasPassed ? (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                )}
                <div>
                  <p
                    className={`font-medium ${
                      hasPassed ? 'text-green-800' : 'text-amber-800'
                    }`}
                  >
                    {hasPassed ? 'გამოცდა ჩაბარებული!' : 'ბოლო მცდელობა წარუმატებელი'}
                  </p>
                  <p
                    className={`text-sm ${
                      hasPassed ? 'text-green-600' : 'text-amber-600'
                    }`}
                  >
                    შედეგი: {lastAttempt.score}% • {formatDate(lastAttempt.completedAt)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Rules */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">გამოცდის წესები</h3>

            <div className="space-y-3">
              {finalExam.timeLimit && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Clock className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">დროის ლიმიტი</p>
                    <p className="text-sm text-gray-600">
                      გამოცდის დასრულება უნდა მოხდეს {finalExam.timeLimit} წუთში
                    </p>
                  </div>
                </div>
              )}

              {finalExam.preventTabSwitch && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Monitor className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">ტაბის გადართვა</p>
                    <p className="text-sm text-gray-600">
                      გამოცდის დროს ტაბის გადართვა აღირიცხება
                    </p>
                  </div>
                </div>
              )}

              {finalExam.preventCopyPaste && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Copy className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">კოპირება/ჩასმა</p>
                    <p className="text-sm text-gray-600">
                      ტექსტის კოპირება და ჩასმა აკრძალულია
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Shield className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">ავტო-შენახვა</p>
                  <p className="text-sm text-gray-600">
                    პასუხები ავტომატურად ინახება ყოველ 30 წამში
                  </p>
                </div>
              </div>

              {finalExam.maxAttempts && (
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900">მცდელობების ლიმიტი</p>
                    <p className="text-sm text-amber-700">
                      დარჩენილი მცდელობები: {attemptsRemaining} / {finalExam.maxAttempts}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Attempt History */}
          {attempts.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                <History className="w-4 h-4" />
                მცდელობების ისტორია ({attempts.length})
                {showHistory ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showHistory && (
                <div className="mt-3 space-y-2">
                  {attempts.map((attempt) => (
                    <div
                      key={attempt.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500">#{attempt.attemptNumber}</span>
                        <span
                          className={`font-medium ${
                            attempt.passed ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {attempt.score}%
                        </span>
                        {attempt.passed && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {formatDate(attempt.completedAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Agreement Checkbox */}
          {!hasPassed && canRetry && (
            <div className="mt-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToRules}
                  onChange={(e) => setAgreedToRules(e.target.checked)}
                  className="mt-1 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-600">
                  ვეთანხმები გამოცდის წესებს და ვადასტურებ, რომ მზად ვარ გამოცდის დასაწყებად
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              გაუქმება
            </button>

            {hasPassed ? (
              <button
                onClick={onStartExam}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                შედეგების ნახვა
              </button>
            ) : canRetry ? (
              <button
                onClick={onStartExam}
                disabled={!agreedToRules || isStarting}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStarting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    იწყება...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    {attempts.length > 0 ? 'ხელახლა ცდა' : 'დაწყება'}
                  </>
                )}
              </button>
            ) : (
              <div className="flex-1 px-4 py-3 bg-gray-200 text-gray-500 rounded-xl font-medium text-center">
                მცდელობები ამოიწურა
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

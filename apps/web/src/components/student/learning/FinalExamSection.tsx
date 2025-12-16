'use client';

import { Trophy, Lock, Clock, Target, CheckCircle, AlertCircle, Play } from 'lucide-react';

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

interface FinalExamSectionProps {
  finalExam: FinalExamData;
  lastAttempt?: FinalExamAttempt | null;
  onStartExam: () => void;
  isCollapsed?: boolean;
  isMobile?: boolean;
}

export default function FinalExamSection({
  finalExam,
  lastAttempt,
  onStartExam,
  isCollapsed = false,
  isMobile = false,
}: FinalExamSectionProps) {
  const isLocked = !finalExam.isUnlocked;
  const hasPassed = lastAttempt?.passed;
  const hasAttempted = !!lastAttempt;

  // Determine status
  const getStatus = () => {
    if (hasPassed) return 'passed';
    if (isLocked) return 'locked';
    if (hasAttempted) return 'failed';
    return 'available';
  };

  const status = getStatus();

  // Status colors and icons
  const statusConfig = {
    locked: {
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-500',
      borderColor: 'border-gray-200',
      icon: <Lock className="w-5 h-5" />,
      label: 'ჩაკეტილი',
      description: 'დაასრულე ყველა თავი',
    },
    available: {
      bgColor: 'bg-primary-50',
      textColor: 'text-primary-900',
      borderColor: 'border-primary-100',
      icon: <Trophy className="w-5 h-5" />,
      label: 'ხელმისაწვდომი',
      description: 'დაიწყე გამოცდა',
    },
    passed: {
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      borderColor: 'border-green-200',
      icon: <CheckCircle className="w-5 h-5" />,
      label: 'ჩაბარებული',
      description: `${lastAttempt?.score}%`,
    },
    failed: {
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
      borderColor: 'border-amber-200',
      icon: <AlertCircle className="w-5 h-5" />,
      label: 'ვერ ჩააბარე',
      description: 'სცადე ხელახლა',
    },
  };

  const config = statusConfig[status];

  // Collapsed view (only icon)
  if (isCollapsed && !isMobile) {
    return (
      <div className="border-t border-gray-200 p-4">
        <button
          onClick={!isLocked ? onStartExam : undefined}
          disabled={isLocked}
          className={`w-full flex justify-center ${config.textColor} ${
            isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-80'
          }`}
          title={finalExam.title}
        >
          {config.icon}
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Trophy className="w-4 h-4" />
          საფინალო გამოცდა
        </div>
      </div>

      {/* Content */}
      <div className={`p-4 ${config.bgColor} border-l-4 ${config.borderColor}`}>
        <div className="flex items-start gap-3">
          {/* Status Icon */}
          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${config.bgColor} ${config.textColor}`}>
            {config.icon}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className={`font-medium ${isLocked ? 'text-gray-500' : 'text-gray-900'}`}>
              {finalExam.title}
            </h3>

            {/* Status Badge */}
            <div className={`inline-flex items-center gap-1 mt-1 text-xs font-medium ${config.textColor}`}>
              {config.label}
              {config.description && (
                <span className="text-gray-500">• {config.description}</span>
              )}
            </div>

            {/* Exam Info */}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              {finalExam.timeLimit && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {finalExam.timeLimit} წთ
                </span>
              )}
              <span className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                {finalExam.passingScore}% საჭირო
              </span>
            </div>

            {/* Action Button */}
            {!isLocked && (
              <button
                onClick={onStartExam}
                className={`mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  hasPassed
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : hasAttempted
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-accent-600 hover:bg-accent-700 text-white'
                }`}
              >
                <Play className="w-4 h-4" />
                {hasPassed ? 'შედეგების ნახვა' : hasAttempted ? 'ხელახლა ცდა' : 'დაწყება'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

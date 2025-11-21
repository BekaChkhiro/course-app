'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import QuizResults from '@/components/quiz/QuizResults';

interface ResultsPageProps {
  params: {
    quizId: string;
    attemptId: string;
  };
}

export default function ResultsPage({ params }: ResultsPageProps) {
  const router = useRouter();
  const { quizId, attemptId } = params;

  const handleRetry = () => {
    // Navigate back to quiz page to retry
    router.push(`/quiz/${quizId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <QuizResults attemptId={attemptId} onRetry={handleRetry} />
    </div>
  );
}

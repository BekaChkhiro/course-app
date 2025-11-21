'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import QuizPlayer from '@/components/quiz/QuizPlayer';
import { QuizAttempt } from '@/lib/api/quizApi';

interface QuizPageProps {
  params: {
    quizId: string;
  };
}

export default function QuizPage({ params }: QuizPageProps) {
  const router = useRouter();
  const { quizId } = params;

  const handleQuizComplete = (attempt: QuizAttempt) => {
    // Navigate to results page after quiz completion
    router.push(`/quiz/${quizId}/results/${attempt.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <QuizPlayer quizId={quizId} onComplete={handleQuizComplete} />
    </div>
  );
}

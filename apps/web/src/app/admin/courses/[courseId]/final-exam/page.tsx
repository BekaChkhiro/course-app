'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Award, Clock, Target, Shield, Book, Plus, Edit } from 'lucide-react';
import { quizApi, QuizType, QuestionType } from '@/lib/api/quizApi';
import AdminLayout from '@/components/admin/AdminLayout';
import toast from 'react-hot-toast';

export default function CourseFinalExamPage({ params }: { params: { courseId: string } }) {
  const router = useRouter();
  const [step, setStep] = useState<'create' | 'add-questions'>('create');
  const [quizId, setQuizId] = useState<string | null>(null);

  const [examData, setExamData] = useState({
    title: '',
    description: '',
    timeLimit: 120, // 2 hours default
    passingScore: 70,
    maxAttempts: 3,
  });

  const [questionData, setQuestionData] = useState({
    type: 'SINGLE_CHOICE' as QuestionType,
    question: '',
    explanation: '',
    points: 1,
    answers: [
      { answer: '', isCorrect: false },
      { answer: '', isCorrect: false },
    ],
  });

  // Create Final Exam
  const createExamMutation = useMutation({
    mutationFn: (data: any) => quizApi.create(data),
    onSuccess: (response) => {
      const newQuizId = response.data.id;
      setQuizId(newQuizId);
      setStep('add-questions');
      toast.success('მთავარი გამოცდა შეიქმნა! ახლა დაამატეთ კითხვები.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'შეცდომა გამოცდის შექმნისას');
    },
  });

  // Add Question
  const addQuestionMutation = useMutation({
    mutationFn: (data: any) => {
      if (!quizId) throw new Error('No quiz ID');
      return quizApi.addQuestion(quizId, data);
    },
    onSuccess: () => {
      toast.success('კითხვა დაემატა!');
      // Reset form
      setQuestionData({
        type: 'SINGLE_CHOICE',
        question: '',
        explanation: '',
        points: 1,
        answers: [
          { answer: '', isCorrect: false },
          { answer: '', isCorrect: false },
        ],
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'შეცდომა კითხვის დამატებისას');
    },
  });

  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault();

    if (!examData.title.trim()) {
      toast.error('შეიყვანეთ გამოცდის სახელი');
      return;
    }

    createExamMutation.mutate({
      ...examData,
      type: QuizType.FINAL_EXAM,
      lockUntilChaptersComplete: true,
      generateCertificate: true,
      requirePassing: true,
      preventTabSwitch: true,
      preventCopyPaste: true,
      randomizeQuestions: true,
      randomizeAnswers: true,
      showCorrectAnswers: true,
      showExplanations: true,
    });
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();

    if (!questionData.question.trim()) {
      toast.error('შეიყვანეთ კითხვა');
      return;
    }

    const validAnswers = questionData.answers.filter((a) => a.answer.trim());
    if (validAnswers.length < 2) {
      toast.error('მინიმუმ 2 პასუხი საჭიროა');
      return;
    }

    const hasCorrect = validAnswers.some((a) => a.isCorrect);
    if (!hasCorrect) {
      toast.error('მონიშნეთ მინიმუმ ერთი სწორი პასუხი');
      return;
    }

    addQuestionMutation.mutate({
      ...questionData,
      order: 0,
      answers: validAnswers.map((a, i) => ({
        answer: a.answer,
        isCorrect: a.isCorrect,
        order: i,
      })),
    });
  };

  const handleFinish = () => {
    toast.success('მთავარი გამოცდა მზადაა!');
    router.push(`/admin/courses/${params.courseId}`);
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Award className="w-8 h-8 text-yellow-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              კურსის მთავარი გამოცდა
            </h1>
          </div>
          <p className="text-gray-600">
            შექმენით Final Exam რომელიც სავალდებულოა კურსის დასასრულებლად
          </p>
        </div>

        {step === 'create' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">გამოცდის პარამეტრები</h2>

            {/* Features Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <Shield className="w-5 h-5" />
                  <span className="font-medium">Auto-სერტიფიკატი</span>
                </div>
                <p className="text-sm text-green-700">
                  ავტომატურად გენერირდება გავლისას
                </p>
              </div>

              <div className="bg-accent-50 border border-accent-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-accent-600 mb-2">
                  <Book className="w-5 h-5" />
                  <span className="font-medium">Chapter-ების Lock</span>
                </div>
                <p className="text-sm text-accent-600">
                  გაიხსნება ყველა chapter-ის შემდეგ
                </p>
              </div>

              <div className="bg-accent-50 border border-accent-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-accent-600 mb-2">
                  <Target className="w-5 h-5" />
                  <span className="font-medium">Anti-Cheating</span>
                </div>
                <p className="text-sm text-accent-600">
                  ტაბის გადართვა და copy/paste აკრძალული
                </p>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-orange-800 mb-2">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">3 მცდელობა</span>
                </div>
                <p className="text-sm text-orange-700">
                  მაქსიმუმ 3-ჯერ შეიძლება ცდა
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  გამოცდის სახელი *
                </label>
                <input
                  type="text"
                  value={examData.title}
                  onChange={(e) =>
                    setExamData({ ...examData, title: e.target.value })
                  }
                  placeholder="მაგ: Final Exam - React Course"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  აღწერა
                </label>
                <textarea
                  value={examData.description}
                  onChange={(e) =>
                    setExamData({ ...examData, description: e.target.value })
                  }
                  rows={3}
                  placeholder="გამოცდის აღწერა და ინსტრუქციები..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Time Limit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    დრო (წუთები)
                  </label>
                  <input
                    type="number"
                    value={examData.timeLimit}
                    onChange={(e) =>
                      setExamData({
                        ...examData,
                        timeLimit: parseInt(e.target.value) || 0,
                      })
                    }
                    min={0}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500"
                  />
                </div>

                {/* Passing Score */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    გასავლელი ქულა (%)
                  </label>
                  <input
                    type="number"
                    value={examData.passingScore}
                    onChange={(e) =>
                      setExamData({
                        ...examData,
                        passingScore: parseInt(e.target.value) || 70,
                      })
                    }
                    min={0}
                    max={100}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500"
                  />
                </div>

                {/* Max Attempts */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    მაქს. მცდელობები
                  </label>
                  <input
                    type="number"
                    value={examData.maxAttempts}
                    onChange={(e) =>
                      setExamData({
                        ...examData,
                        maxAttempts: parseInt(e.target.value) || 3,
                      })
                    }
                    min={1}
                    max={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={createExamMutation.isPending}
                className="w-full px-6 py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 font-medium"
              >
                {createExamMutation.isPending
                  ? 'იქმნება...'
                  : '✓ შექმნა და კითხვების დამატება'}
              </button>
            </form>
          </div>
        )}

        {step === 'add-questions' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">კითხვების დამატება</h2>
              <button
                onClick={handleFinish}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                დასრულება
              </button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                💡 <strong>რეკომენდაცია:</strong> Final Exam-ისთვის დაამატეთ
                მინიმუმ 20-30 კითხვა რომ კარგად შეამოწმოთ სტუდენტების ცოდნა.
              </p>
            </div>

            <form onSubmit={handleAddQuestion} className="space-y-6">
              {/* Question Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  კითხვის ტიპი
                </label>
                <select
                  value={questionData.type}
                  onChange={(e) =>
                    setQuestionData({
                      ...questionData,
                      type: e.target.value as QuestionType,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="SINGLE_CHOICE">Single Choice</option>
                  <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                  <option value="TRUE_FALSE">True/False</option>
                </select>
              </div>

              {/* Question */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  კითხვა *
                </label>
                <textarea
                  value={questionData.question}
                  onChange={(e) =>
                    setQuestionData({ ...questionData, question: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="შეიყვანეთ კითხვა..."
                  required
                />
              </div>

              {/* Answers */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  პასუხები *
                </label>
                {questionData.answers.map((answer, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={answer.isCorrect}
                      onChange={(e) => {
                        const newAnswers = [...questionData.answers];
                        if (questionData.type === 'SINGLE_CHOICE') {
                          newAnswers.forEach((a) => (a.isCorrect = false));
                        }
                        newAnswers[index].isCorrect = e.target.checked;
                        setQuestionData({ ...questionData, answers: newAnswers });
                      }}
                      className="mt-2"
                    />
                    <input
                      type="text"
                      value={answer.answer}
                      onChange={(e) => {
                        const newAnswers = [...questionData.answers];
                        newAnswers[index].answer = e.target.value;
                        setQuestionData({ ...questionData, answers: newAnswers });
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder={`პასუხი ${index + 1}`}
                    />
                    {questionData.answers.length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newAnswers = questionData.answers.filter(
                            (_, i) => i !== index
                          );
                          setQuestionData({ ...questionData, answers: newAnswers });
                        }}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setQuestionData({
                      ...questionData,
                      answers: [
                        ...questionData.answers,
                        { answer: '', isCorrect: false },
                      ],
                    })
                  }
                  className="text-accent-500 hover:underline text-sm"
                >
                  + პასუხის დამატება
                </button>
              </div>

              {/* Explanation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  განმარტება
                </label>
                <textarea
                  value={questionData.explanation}
                  onChange={(e) =>
                    setQuestionData({
                      ...questionData,
                      explanation: e.target.value,
                    })
                  }
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="ახსენით რატომ არის პასუხი სწორი..."
                />
              </div>

              {/* Points */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ქულები
                </label>
                <input
                  type="number"
                  value={questionData.points}
                  onChange={(e) =>
                    setQuestionData({
                      ...questionData,
                      points: parseInt(e.target.value) || 1,
                    })
                  }
                  min={1}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={addQuestionMutation.isPending}
                  className="flex-1 px-6 py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 font-medium"
                >
                  {addQuestionMutation.isPending
                    ? 'ემატება...'
                    : '+ კითხვის დამატება'}
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  ✓ დასრულება
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

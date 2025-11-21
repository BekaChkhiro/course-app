'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Play, BarChart } from 'lucide-react';
import { quizApi, Quiz, QuizType, QuestionType } from '@/lib/api/quizApi';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';

export default function QuizzesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'CHAPTER_QUIZ' as QuizType,
    timeLimit: 30,
    passingScore: 70,
    maxAttempts: 3,
    randomizeQuestions: false,
    randomizeAnswers: false,
    showCorrectAnswers: true,
    showExplanations: true,
    preventTabSwitch: false,
    preventCopyPaste: false,
    generateCertificate: false,
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

  // Create quiz mutation
  const createQuizMutation = useMutation({
    mutationFn: (data: typeof formData) => quizApi.create(data),
    onSuccess: (response) => {
      toast.success('ქვიზი შეიქმნა წარმატებით!');
      setIsCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      // Open question modal
      setSelectedQuiz(response.data);
      setIsQuestionModalOpen(true);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'შეცდომა ქვიზის შექმნისას');
    },
  });

  // Add question mutation
  const addQuestionMutation = useMutation({
    mutationFn: (data: any) => {
      if (!selectedQuiz) throw new Error('No quiz selected');
      return quizApi.addQuestion(selectedQuiz.id, data);
    },
    onSuccess: () => {
      toast.success('კითხვა დაემატა!');
      // Reset question form
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

  const handleCreateQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('შეიყვანეთ ქვიზის სახელი');
      return;
    }
    createQuizMutation.mutate(formData);
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

  const handleFinishAddingQuestions = () => {
    setIsQuestionModalOpen(false);
    setSelectedQuiz(null);
    toast.success('ქვიზი მზადაა! შეგიძლიათ სტუდენტებმა გაიარონ.');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quiz Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              შექმენით და მართეთ ქვიზები
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            ახალი ქვიზი
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">
            📝 როგორ შევქმნა ქვიზი:
          </h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>დააჭირეთ "ახალი ქვიზი" ღილაკს</li>
            <li>შეავსეთ ქვიზის ინფორმაცია და პარამეტრები</li>
            <li>დაამატეთ კითხვები (მინიმუმ 1)</li>
            <li>სტუდენტები შეძლებენ გაიარონ: <code className="bg-blue-100 px-2 py-0.5 rounded">/quiz/[quiz-id]</code></li>
          </ol>
        </div>

        {/* Quiz List Placeholder */}
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-center">
            ქვიზები გამოჩნდება აქ შექმნის შემდეგ
          </p>
        </div>
      </div>

      {/* Create Quiz Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="ახალი ქვიზის შექმნა"
        size="xl"
      >
        <form onSubmit={handleCreateQuiz} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ქვიზის სახელი *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="მაგ: Chapter 1 Quiz"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              აღწერა
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="ქვიზის აღწერა..."
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ტიპი
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value as QuizType })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="CHAPTER_QUIZ">Chapter Quiz (არჩევითი)</option>
              <option value="FINAL_EXAM">Final Exam (სავალდებულო)</option>
              <option value="PRACTICE_QUIZ">Practice Quiz (პრაქტიკა)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Time Limit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                დრო (წუთები)
              </label>
              <input
                type="number"
                value={formData.timeLimit}
                onChange={(e) =>
                  setFormData({ ...formData, timeLimit: parseInt(e.target.value) || 0 })
                }
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">0 = უვადო</p>
            </div>

            {/* Passing Score */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                გასავლელი ქულა (%)
              </label>
              <input
                type="number"
                value={formData.passingScore}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    passingScore: parseInt(e.target.value) || 70,
                  })
                }
                min={0}
                max={100}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Max Attempts */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                მაქს. მცდელობები
              </label>
              <input
                type="number"
                value={formData.maxAttempts}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxAttempts: parseInt(e.target.value) || 0,
                  })
                }
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">0 = შეუზღუდავი</p>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.randomizeQuestions}
                onChange={(e) =>
                  setFormData({ ...formData, randomizeQuestions: e.target.checked })
                }
                className="rounded"
              />
              <span className="text-sm">კითხვების შემთხვევითი მიმდევრობა</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.showCorrectAnswers}
                onChange={(e) =>
                  setFormData({ ...formData, showCorrectAnswers: e.target.checked })
                }
                className="rounded"
              />
              <span className="text-sm">სწორი პასუხების ჩვენება</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.preventTabSwitch}
                onChange={(e) =>
                  setFormData({ ...formData, preventTabSwitch: e.target.checked })
                }
                className="rounded"
              />
              <span className="text-sm">ტაბის გადართვის აღმოჩენა</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.generateCertificate}
                onChange={(e) =>
                  setFormData({ ...formData, generateCertificate: e.target.checked })
                }
                className="rounded"
              />
              <span className="text-sm">სერტიფიკატის გენერირება</span>
            </label>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              გაუქმება
            </button>
            <button
              type="submit"
              disabled={createQuizMutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createQuizMutation.isPending ? 'იქმნება...' : 'შექმნა და კითხვების დამატება'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Questions Modal */}
      <Modal
        isOpen={isQuestionModalOpen}
        onClose={handleFinishAddingQuestions}
        title={`კითხვების დამატება: ${selectedQuiz?.title}`}
        size="xl"
      >
        <form onSubmit={handleAddQuestion} className="space-y-4">
          {/* Question Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              კითხვის ტიპი
            </label>
            <select
              value={questionData.type}
              onChange={(e) =>
                setQuestionData({ ...questionData, type: e.target.value as QuestionType })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="SINGLE_CHOICE">Single Choice (ერთი პასუხი)</option>
              <option value="MULTIPLE_CHOICE">Multiple Choice (რამდენიმე პასუხი)</option>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="შეიყვანეთ კითხვა..."
              required
            />
          </div>

          {/* Answers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              პასუხები *
              <span className="text-xs text-gray-500 ml-2">
                (მონიშნეთ სწორი პასუხები)
              </span>
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
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder={`პასუხი ${index + 1}`}
                />
                {questionData.answers.length > 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newAnswers = questionData.answers.filter((_, i) => i !== index);
                      setQuestionData({ ...questionData, answers: newAnswers });
                    }}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setQuestionData({
                  ...questionData,
                  answers: [...questionData.answers, { answer: '', isCorrect: false }],
                })
              }
              className="text-blue-600 hover:underline text-sm"
            >
              + პასუხის დამატება
            </button>
          </div>

          {/* Explanation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              განმარტება (არჩევითი)
            </label>
            <textarea
              value={questionData.explanation}
              onChange={(e) =>
                setQuestionData({ ...questionData, explanation: e.target.value })
              }
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                setQuestionData({ ...questionData, points: parseInt(e.target.value) || 1 })
              }
              min={1}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <button
              type="submit"
              disabled={addQuestionMutation.isPending}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {addQuestionMutation.isPending ? 'ემატება...' : '✓ კითხვის დამატება'}
            </button>
            <button
              type="button"
              onClick={handleFinishAddingQuestions}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              დასრულება
            </button>
          </div>
        </form>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            💡 დაამატეთ რამდენიმე კითხვა, შემდეგ დააჭირეთ "დასრულება"
          </p>
        </div>
      </Modal>
    </AdminLayout>
  );
}

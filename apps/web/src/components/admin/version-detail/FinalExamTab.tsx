'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, Trophy, Clock, Target, ChevronDown, ChevronUp, Trash, Plus } from 'lucide-react';
import { quizApi, QuestionType, QuizType } from '@/lib/api/quizApi';
import toast from 'react-hot-toast';

interface FinalExamTabProps {
  courseId: string;
  versionId: string;
}

export default function FinalExamTab({ courseId, versionId }: FinalExamTabProps) {
  const [examData, setExamData] = useState({
    title: '',
    timeLimit: 120,
    passingScore: 70,
    maxAttempts: 3
  });
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState({
    type: QuestionType.SINGLE_CHOICE,
    question: '',
    explanation: '',
    points: 10,
    answers: [
      { answer: '', isCorrect: false },
      { answer: '', isCorrect: false }
    ]
  });
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [existingExam, setExistingExam] = useState<any>(null);

  const queryClient = useQueryClient();

  // Check if exam already exists for this version
  const { data: quizzesData, isLoading } = useQuery({
    queryKey: ['version-final-exam', versionId],
    queryFn: async () => {
      const response = await quizApi.getAll({ type: QuizType.FINAL_EXAM });
      // API returns { success: true, data: [...] }
      const allQuizzes = response.data || [];
      const exams = allQuizzes.filter(
        (q: any) => q.courseVersionId === versionId
      );
      return exams;
    },
    enabled: !!versionId
  });

  useEffect(() => {
    if (quizzesData && quizzesData.length > 0) {
      const exam = quizzesData[0];
      setExistingExam(exam);
      setExamData({
        title: exam.title,
        timeLimit: exam.timeLimit || 120,
        passingScore: exam.passingScore || 70,
        maxAttempts: exam.maxAttempts || 3
      });
    }
  }, [quizzesData]);

  const createExamMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await quizApi.create({
        ...data,
        type: QuizType.FINAL_EXAM,
        courseVersionId: versionId,
        lockUntilChaptersComplete: true,
        generateCertificate: true,
        requirePassing: true,
        preventTabSwitch: true,
        preventCopyPaste: true,
        randomizeQuestions: true,
        showCorrectAnswers: true,
        showExplanations: true
      });
      return response;
    },
    onSuccess: (response) => {
      setExistingExam(response.data);
      queryClient.invalidateQueries({ queryKey: ['version-final-exam', versionId] });
      toast.success('საფინალო გამოცდა შეიქმნა!');
      setShowQuestionForm(true);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'შეცდომა');
    }
  });

  const addQuestionMutation = useMutation({
    mutationFn: async (questionData: any) => {
      if (!existingExam) throw new Error('გამოცდა არ არსებობს');
      return await quizApi.addQuestion(existingExam.id, questionData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['version-final-exam', versionId] });
      toast.success('კითხვა დაემატა!');

      // Reset question form
      setCurrentQuestion({
        type: QuestionType.SINGLE_CHOICE,
        question: '',
        explanation: '',
        points: 10,
        answers: [
          { answer: '', isCorrect: false },
          { answer: '', isCorrect: false }
        ]
      });

      // Add to local questions list
      setQuestions([...questions, currentQuestion]);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'შეცდომა');
    }
  });

  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault();

    if (!examData.title.trim()) {
      toast.error('შეიყვანეთ გამოცდის სათაური');
      return;
    }

    createExamMutation.mutate(examData);
  };

  const handleAddQuestion = () => {
    if (!currentQuestion.question.trim()) {
      toast.error('შეიყვანეთ კითხვა');
      return;
    }

    const validAnswers = currentQuestion.answers.filter(a => a.answer.trim());
    if (validAnswers.length < 2) {
      toast.error('დაამატეთ მინიმუმ 2 პასუხი');
      return;
    }

    const hasCorrect = validAnswers.some(a => a.isCorrect);
    if (!hasCorrect) {
      toast.error('მონიშნეთ სწორი პასუხი');
      return;
    }

    addQuestionMutation.mutate({
      type: currentQuestion.type,
      question: currentQuestion.question,
      explanation: currentQuestion.explanation,
      points: currentQuestion.points,
      order: 0,
      answers: validAnswers.map((a, index) => ({
        answer: a.answer,
        isCorrect: a.isCorrect,
        order: index
      }))
    });
  };

  const handleAddAnswer = () => {
    setCurrentQuestion({
      ...currentQuestion,
      answers: [...currentQuestion.answers, { answer: '', isCorrect: false }]
    });
  };

  const handleRemoveAnswer = (index: number) => {
    if (currentQuestion.answers.length <= 2) {
      toast.error('მინიმუმ 2 პასუხი უნდა იყოს');
      return;
    }
    setCurrentQuestion({
      ...currentQuestion,
      answers: currentQuestion.answers.filter((_, i) => i !== index)
    });
  };

  const handleAnswerChange = (index: number, field: 'answer' | 'isCorrect', value: any) => {
    const newAnswers = [...currentQuestion.answers];

    if (field === 'isCorrect' && currentQuestion.type === QuestionType.SINGLE_CHOICE) {
      // For single choice, uncheck others
      newAnswers.forEach((a, i) => {
        a.isCorrect = i === index ? value : false;
      });
    } else {
      newAnswers[index] = { ...newAnswers[index], [field]: value };
    }

    setCurrentQuestion({ ...currentQuestion, answers: newAnswers });
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">იტვირთება...</div>;
  }

  if (existingExam) {
    return (
      <div className="space-y-6">
        {/* Exam Info Header */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Trophy className="w-8 h-8 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {existingExam.title}
              </h3>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-5 h-5" />
                  <span className="text-sm">
                    დრო: {existingExam.timeLimit} წუთი
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Target className="w-5 h-5" />
                  <span className="text-sm">
                    გასავლელი: {existingExam.passingScore}%
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Award className="w-5 h-5" />
                  <span className="text-sm">
                    მცდელობები: {existingExam.maxAttempts}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    ✅ Auto-სერტიფიკატი გამოცდის გავლის შემდეგ
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    🔒 ხელმისაწვდომია ყველა თავის გავლის შემდეგ
                  </p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-sm text-purple-800">
                    🛡️ Anti-Cheating: ტაბის გადართვა, კოპირება აკრძალულია
                  </p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm text-orange-800">
                    🎲 კითხვები შემთხვევითი თანმიმდევრობით
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Questions Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">
              კითხვები ({existingExam.questions?.length || questions.length})
            </h3>
            <button
              onClick={() => setShowQuestionForm(!showQuestionForm)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              {showQuestionForm ? 'დახურვა' : 'კითხვის დამატება'}
            </button>
          </div>

          {/* Question Form */}
          {showQuestionForm && (
            <div className="bg-gray-50 border rounded-lg p-6 space-y-4">
              <h4 className="font-medium text-gray-900">ახალი კითხვის დამატება</h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  კითხვის ტიპი
                </label>
                <select
                  value={currentQuestion.type}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, type: e.target.value as QuestionType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={QuestionType.SINGLE_CHOICE}>ერთი სწორი პასუხი</option>
                  <option value={QuestionType.MULTIPLE_CHOICE}>რამდენიმე სწორი პასუხი</option>
                  <option value={QuestionType.TRUE_FALSE}>ჭეშმარიტი/მცდარი</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  კითხვა *
                </label>
                <textarea
                  value={currentQuestion.question}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="შეიყვანეთ კითხვა..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ქულები
                </label>
                <input
                  type="number"
                  value={currentQuestion.points}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseInt(e.target.value) || 1 })}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    პასუხები *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddAnswer}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + პასუხის დამატება
                  </button>
                </div>
                <div className="space-y-2">
                  {currentQuestion.answers.map((answer, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type={currentQuestion.type === QuestionType.SINGLE_CHOICE ? 'radio' : 'checkbox'}
                        checked={answer.isCorrect}
                        onChange={(e) => handleAnswerChange(index, 'isCorrect', e.target.checked)}
                        className="w-4 h-4 text-blue-600"
                        title="სწორი პასუხი"
                      />
                      <input
                        type="text"
                        value={answer.answer}
                        onChange={(e) => handleAnswerChange(index, 'answer', e.target.value)}
                        placeholder={`პასუხი ${index + 1}`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      {currentQuestion.answers.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAnswer(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  განმარტება (არასავალდებულო)
                </label>
                <textarea
                  value={currentQuestion.explanation}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, explanation: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="განმარტება სწორი პასუხისთვის..."
                />
              </div>

              <button
                onClick={handleAddQuestion}
                disabled={addQuestionMutation.isPending}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {addQuestionMutation.isPending ? 'დამატება...' : 'კითხვის დამატება'}
              </button>
            </div>
          )}

          {/* Questions List */}
          {questions.length > 0 && (
            <div className="space-y-2">
              {questions.map((q, index) => (
                <div key={index} className="flex items-start justify-between p-4 bg-white border rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {index + 1}. {q.question}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {q.type} | {q.points} ქულა | {q.answers.filter((a: any) => a.isCorrect).length} სწორი პასუხი
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveQuestion(index)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {questions.length === 0 && !showQuestionForm && (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-gray-500 mb-4">კითხვები არ არის დამატებული</p>
              <button
                onClick={() => setShowQuestionForm(true)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                დაამატე პირველი კითხვა
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Create Exam Form
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          საფინალო გამოცდის შექმნა
        </h3>
        <p className="text-sm text-blue-700">
          შექმენით საფინალო გამოცდა რომელიც დასრულების შემდეგ გენერირებს სერტიფიკატს.
          გამოცდა ხელმისაწვდომი იქნება მხოლოდ ყველა თავის გავლის შემდეგ.
        </p>
      </div>

      <form onSubmit={handleCreateExam} className="space-y-6 bg-white border rounded-lg p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            გამოცდის სათაური *
          </label>
          <input
            type="text"
            value={examData.title}
            onChange={(e) => setExamData({ ...examData, title: e.target.value })}
            placeholder="მაგ: კურსის საფინალო გამოცდა"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              დრო (წუთები) *
            </label>
            <input
              type="number"
              value={examData.timeLimit}
              onChange={(e) => setExamData({ ...examData, timeLimit: parseInt(e.target.value) })}
              min="1"
              max="240"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              გასავლელი ქულა (%) *
            </label>
            <input
              type="number"
              value={examData.passingScore}
              onChange={(e) => setExamData({ ...examData, passingScore: parseInt(e.target.value) })}
              min="0"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              მაქსიმალური მცდელობები *
            </label>
            <input
              type="number"
              value={examData.maxAttempts}
              onChange={(e) => setExamData({ ...examData, maxAttempts: parseInt(e.target.value) })}
              min="1"
              max="10"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900">ავტომატური კონფიგურაცია:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>✅ სერტიფიკატის გენერაცია</li>
              <li>✅ თავების ბლოკირება გავლამდე</li>
              <li>✅ ტაბის გადართვის აღკვეთა</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900">დამატებითი ფუნქციები:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>✅ კოპირების აღკვეთა</li>
              <li>✅ შემთხვევითი კითხვები</li>
              <li>✅ სწორი პასუხების ჩვენება</li>
            </ul>
          </div>
        </div>

        <button
          type="submit"
          disabled={createExamMutation.isPending}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
        >
          {createExamMutation.isPending ? 'იქმნება...' : 'გამოცდის შექმნა'}
        </button>
      </form>
    </div>
  );
}

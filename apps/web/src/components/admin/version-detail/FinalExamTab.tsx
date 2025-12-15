'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock, Target, Trash2, Plus, Settings,
  CheckCircle, FileQuestion, ChevronDown, ChevronUp, Save, X, Edit2
} from 'lucide-react';
import { quizApi, QuestionType, QuizType } from '@/lib/api/quizApi';
import toast from 'react-hot-toast';

interface FinalExamTabProps {
  courseId: string;
  versionId: string;
}

interface QuestionForm {
  id?: string;
  type: QuestionType;
  question: string;
  explanation: string;
  points: number;
  answers: { id?: string; answer: string; isCorrect: boolean }[];
}

const emptyQuestion: QuestionForm = {
  type: QuestionType.SINGLE_CHOICE,
  question: '',
  explanation: '',
  points: 10,
  answers: [
    { answer: '', isCorrect: false },
    { answer: '', isCorrect: false }
  ]
};

// Moved outside to prevent re-creation on every render
interface QuestionFormFieldsProps {
  currentQuestion: QuestionForm;
  setCurrentQuestion: (q: QuestionForm) => void;
  onSave: () => void;
  onCancel: () => void;
  isEditing?: boolean;
  isSaving?: boolean;
}

function QuestionFormFields({
  currentQuestion,
  setCurrentQuestion,
  onSave,
  onCancel,
  isEditing = false,
  isSaving = false
}: QuestionFormFieldsProps) {

  const handleAnswerChange = (index: number, field: 'answer' | 'isCorrect', value: any) => {
    const newAnswers = [...currentQuestion.answers];
    if (field === 'isCorrect' && currentQuestion.type === QuestionType.SINGLE_CHOICE) {
      newAnswers.forEach((a, i) => { a.isCorrect = i === index ? value : false; });
    } else {
      newAnswers[index] = { ...newAnswers[index], [field]: value };
    }
    setCurrentQuestion({ ...currentQuestion, answers: newAnswers });
  };

  const addAnswer = () => {
    setCurrentQuestion({
      ...currentQuestion,
      answers: [...currentQuestion.answers, { answer: '', isCorrect: false }]
    });
  };

  const removeAnswer = (index: number) => {
    setCurrentQuestion({
      ...currentQuestion,
      answers: currentQuestion.answers.filter((_, i) => i !== index)
    });
  };

  return (
    <div className={`space-y-4 ${isEditing ? '' : 'p-5 bg-gray-50 rounded-xl mb-6'}`}>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm text-gray-600 mb-1.5">ტიპი</label>
          <select
            value={currentQuestion.type}
            onChange={(e) => setCurrentQuestion({ ...currentQuestion, type: e.target.value as QuestionType })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value={QuestionType.SINGLE_CHOICE}>ერთი სწორი</option>
            <option value={QuestionType.MULTIPLE_CHOICE}>რამდენიმე სწორი</option>
            <option value={QuestionType.TRUE_FALSE}>ჭეშმარიტი/მცდარი</option>
          </select>
        </div>
        <div className="w-24">
          <label className="block text-sm text-gray-600 mb-1.5">ქულა</label>
          <input
            type="number"
            value={currentQuestion.points}
            onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseInt(e.target.value) || 1 })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1.5">კითხვა</label>
        <textarea
          value={currentQuestion.question}
          onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
          placeholder="შეიყვანეთ კითხვა..."
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-gray-600">პასუხები</label>
          <button
            type="button"
            onClick={addAnswer}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            + დამატება
          </button>
        </div>
        <div className="space-y-2">
          {currentQuestion.answers.map((answer, index) => (
            <div key={index} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAnswerChange(index, 'isCorrect', !answer.isCorrect)}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  answer.isCorrect ? 'border-green-500 bg-green-500' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {answer.isCorrect && <CheckCircle className="w-3 h-3 text-white" />}
              </button>
              <input
                type="text"
                value={answer.answer}
                onChange={(e) => handleAnswerChange(index, 'answer', e.target.value)}
                placeholder={`პასუხი ${index + 1}`}
                className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                  answer.isCorrect ? 'border-green-200 bg-green-50' : 'border-gray-200'
                }`}
              />
              {currentQuestion.answers.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeAnswer(index)}
                  className="p-1.5 text-gray-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1.5">განმარტება (არასავალდებულო)</label>
        <textarea
          value={currentQuestion.explanation}
          onChange={(e) => setCurrentQuestion({ ...currentQuestion, explanation: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
          placeholder="რატომ არის ეს პასუხი სწორი..."
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="flex-1 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'შენახვა...' : isEditing ? 'შენახვა' : 'დამატება'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
        >
          გაუქმება
        </button>
      </div>
    </div>
  );
}

export default function FinalExamTab({ courseId, versionId }: FinalExamTabProps) {
  const [examData, setExamData] = useState({
    title: '',
    timeLimit: 120,
    passingScore: 70,
    maxAttempts: 3
  });
  const [currentQuestion, setCurrentQuestion] = useState<QuestionForm>({ ...emptyQuestion });
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [existingExam, setExistingExam] = useState<any>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<string[]>([]);
  const [editingSettings, setEditingSettings] = useState(false);

  const queryClient = useQueryClient();

  const { data: quizzesData, isLoading } = useQuery({
    queryKey: ['version-final-exam', versionId],
    queryFn: async () => {
      const response = await quizApi.getAll({ type: QuizType.FINAL_EXAM, includeQuestions: true });
      const allQuizzes = response.data || [];
      return allQuizzes.filter((q: any) => q.courseVersionId === versionId);
    },
    enabled: !!versionId,
    staleTime: 0
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
      return await quizApi.create({
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
    },
    onSuccess: (response) => {
      setExistingExam(response.data);
      queryClient.invalidateQueries({ queryKey: ['version-final-exam', versionId] });
      toast.success('გამოცდა შეიქმნა');
      setShowQuestionForm(true);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'შეცდომა');
    }
  });

  const updateExamMutation = useMutation({
    mutationFn: async (data: any) => await quizApi.update(existingExam.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['version-final-exam', versionId] });
      toast.success('შენახულია');
      setEditingSettings(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'შეცდომა');
    }
  });

  const deleteExamMutation = useMutation({
    mutationFn: async () => await quizApi.delete(existingExam.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['version-final-exam', versionId] });
      setExistingExam(null);
      setExamData({ title: '', timeLimit: 120, passingScore: 70, maxAttempts: 3 });
      toast.success('გამოცდა წაიშალა');
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
      toast.success('კითხვა დაემატა');
      resetQuestionForm();
      setShowQuestionForm(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'შეცდომა');
    }
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async ({ questionId, data }: { questionId: string; data: any }) => {
      return await quizApi.updateQuestion(questionId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['version-final-exam', versionId] });
      toast.success('კითხვა განახლდა');
      resetQuestionForm();
      setEditingQuestionId(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'შეცდომა');
    }
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: string) => await quizApi.deleteQuestion(questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['version-final-exam', versionId] });
      toast.success('კითხვა წაიშალა');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'შეცდომა');
    }
  });

  const resetQuestionForm = useCallback(() => {
    setCurrentQuestion({ ...emptyQuestion });
  }, []);

  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examData.title.trim()) {
      toast.error('შეიყვანეთ სათაური');
      return;
    }
    createExamMutation.mutate(examData);
  };

  const handleEditQuestion = (question: any) => {
    setEditingQuestionId(question.id);
    setCurrentQuestion({
      id: question.id,
      type: question.type,
      question: question.question,
      explanation: question.explanation || '',
      points: question.points,
      answers: question.answers?.map((a: any) => ({
        id: a.id,
        answer: a.answer,
        isCorrect: a.isCorrect
      })) || [{ answer: '', isCorrect: false }, { answer: '', isCorrect: false }]
    });
    setShowQuestionForm(false);
    setExpandedQuestions(prev => prev.includes(question.id) ? prev : [...prev, question.id]);
  };

  const handleSaveQuestion = useCallback(() => {
    if (!currentQuestion.question.trim()) {
      toast.error('შეიყვანეთ კითხვა');
      return;
    }
    const validAnswers = currentQuestion.answers.filter(a => a.answer.trim());
    if (validAnswers.length < 2) {
      toast.error('მინიმუმ 2 პასუხი');
      return;
    }
    if (!validAnswers.some(a => a.isCorrect)) {
      toast.error('მონიშნეთ სწორი პასუხი');
      return;
    }

    const questionData = {
      type: currentQuestion.type,
      question: currentQuestion.question,
      explanation: currentQuestion.explanation,
      points: currentQuestion.points,
      answers: validAnswers.map((a, i) => ({
        id: a.id,
        answer: a.answer,
        isCorrect: a.isCorrect,
        order: i
      }))
    };

    if (editingQuestionId) {
      updateQuestionMutation.mutate({ questionId: editingQuestionId, data: questionData });
    } else {
      addQuestionMutation.mutate({
        ...questionData,
        order: existingExam?.questions?.length || 0
      });
    }
  }, [currentQuestion, editingQuestionId, existingExam, addQuestionMutation, updateQuestionMutation]);

  const handleCancelEdit = useCallback(() => {
    setEditingQuestionId(null);
    setShowQuestionForm(false);
    resetQuestionForm();
  }, [resetQuestionForm]);

  const toggleQuestion = (id: string) => {
    if (editingQuestionId === id) return;
    setExpandedQuestions(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Existing Exam View
  if (existingExam) {
    const questions = existingExam.questions || [];
    const totalPoints = questions.reduce((sum: number, q: any) => sum + (q.points || 0), 0);

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{existingExam.title}</h2>
            <p className="text-sm text-gray-500 mt-1">საფინალო გამოცდა</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditingSettings(!editingSettings)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => confirm('წავშალოთ გამოცდა?') && deleteExamMutation.mutate()}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 uppercase tracking-wide">დრო</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{existingExam.timeLimit}<span className="text-sm font-normal text-gray-500 ml-1">წთ</span></p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 uppercase tracking-wide">გასავლელი</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{existingExam.passingScore}<span className="text-sm font-normal text-gray-500 ml-1">%</span></p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 uppercase tracking-wide">მცდელობები</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{existingExam.maxAttempts}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 uppercase tracking-wide">ქულები</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{totalPoints}</p>
          </div>
        </div>

        {/* Settings Panel */}
        {editingSettings && (
          <div className="p-5 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">პარამეტრები</h3>
              <button onClick={() => setEditingSettings(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">სათაური</label>
                <input
                  type="text"
                  value={examData.title}
                  onChange={(e) => setExamData({ ...examData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">დრო (წუთები)</label>
                <input
                  type="number"
                  value={examData.timeLimit}
                  onChange={(e) => setExamData({ ...examData, timeLimit: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">გასავლელი (%)</label>
                <input
                  type="number"
                  value={examData.passingScore}
                  onChange={(e) => setExamData({ ...examData, passingScore: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">მცდელობები</label>
                <input
                  type="number"
                  value={examData.maxAttempts}
                  onChange={(e) => setExamData({ ...examData, maxAttempts: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={() => updateExamMutation.mutate(examData)}
              disabled={updateExamMutation.isPending}
              className="mt-4 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {updateExamMutation.isPending ? 'შენახვა...' : 'შენახვა'}
            </button>
          </div>
        )}

        {/* Questions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">კითხვები ({questions.length})</h3>
            <button
              onClick={() => {
                setShowQuestionForm(!showQuestionForm);
                setEditingQuestionId(null);
                resetQuestionForm();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              <Plus className="w-4 h-4" />
              დამატება
            </button>
          </div>

          {/* Add Question Form */}
          {showQuestionForm && !editingQuestionId && (
            <QuestionFormFields
              currentQuestion={currentQuestion}
              setCurrentQuestion={setCurrentQuestion}
              onSave={handleSaveQuestion}
              onCancel={handleCancelEdit}
              isEditing={false}
              isSaving={addQuestionMutation.isPending}
            />
          )}

          {/* Questions List */}
          {questions.length === 0 && !showQuestionForm ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
              <FileQuestion className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">კითხვები არ არის</p>
              <button
                onClick={() => setShowQuestionForm(true)}
                className="mt-3 text-sm text-gray-900 font-medium hover:underline"
              >
                დაამატე პირველი კითხვა
              </button>
            </div>
          ) : questions.length > 0 && (
            <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
              {questions.map((q: any, index: number) => {
                const isExpanded = expandedQuestions.includes(q.id);
                const isEditing = editingQuestionId === q.id;

                return (
                  <div key={q.id} className={`p-4 ${isEditing ? 'bg-gray-50' : ''}`}>
                    {isEditing ? (
                      // Edit Mode
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                            {index + 1}
                          </span>
                          <span className="text-sm font-medium text-gray-700">რედაქტირება</span>
                        </div>
                        <QuestionFormFields
                          currentQuestion={currentQuestion}
                          setCurrentQuestion={setCurrentQuestion}
                          onSave={handleSaveQuestion}
                          onCancel={handleCancelEdit}
                          isEditing={true}
                          isSaving={updateQuestionMutation.isPending}
                        />
                      </div>
                    ) : (
                      // View Mode
                      <>
                        <div
                          className="flex items-start gap-3 cursor-pointer"
                          onClick={() => toggleQuestion(q.id)}
                        >
                          <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0 mt-0.5">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900">{q.question}</p>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                              <span>{q.points} ქულა</span>
                              <span>{q.answers?.length || 0} პასუხი</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditQuestion(q);
                              }}
                              className="p-1.5 text-gray-300 hover:text-gray-600 rounded"
                              title="რედაქტირება"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                confirm('წავშალოთ?') && deleteQuestionMutation.mutate(q.id);
                              }}
                              className="p-1.5 text-gray-300 hover:text-red-500 rounded"
                              title="წაშლა"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 ml-9 space-y-2">
                            {q.answers?.map((a: any, aIndex: number) => (
                              <div
                                key={a.id || aIndex}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                                  a.isCorrect ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-600'
                                }`}
                              >
                                {a.isCorrect ? (
                                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                                )}
                                {a.answer}
                              </div>
                            ))}
                            {q.explanation && (
                              <p className="text-xs text-gray-500 mt-3 pl-1">
                                {q.explanation}
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Create Exam Form
  return (
    <div className="max-w-lg mx-auto py-12">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold text-gray-900">საფინალო გამოცდა</h2>
        <p className="text-sm text-gray-500 mt-1">შექმენით გამოცდა სერტიფიკატის მისაღებად</p>
      </div>

      <form onSubmit={handleCreateExam} className="space-y-6">
        <div>
          <label className="block text-sm text-gray-600 mb-1.5">სათაური</label>
          <input
            type="text"
            value={examData.title}
            onChange={(e) => setExamData({ ...examData, title: e.target.value })}
            placeholder="მაგ: კურსის საფინალო გამოცდა"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">დრო (წთ)</label>
            <input
              type="number"
              value={examData.timeLimit}
              onChange={(e) => setExamData({ ...examData, timeLimit: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">გასავლელი (%)</label>
            <input
              type="number"
              value={examData.passingScore}
              onChange={(e) => setExamData({ ...examData, passingScore: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">მცდელობები</label>
            <input
              type="number"
              value={examData.maxAttempts}
              onChange={(e) => setExamData({ ...examData, maxAttempts: parseInt(e.target.value) || 1 })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              required
            />
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-4">ავტომატურად ჩართულია:</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              სერტიფიკატის გენერაცია
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              შერეული კითხვები
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              Anti-Cheat დაცვა
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              განმარტებები
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={createExamMutation.isPending}
          className="w-full py-3 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {createExamMutation.isPending ? 'იქმნება...' : 'შექმნა'}
        </button>
      </form>
    </div>
  );
}

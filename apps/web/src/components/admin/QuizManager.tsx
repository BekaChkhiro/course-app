'use client';

import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Trash2, Check, X, ChevronDown, ChevronUp, Edit2, Eye, EyeOff, Clock, Target, Shuffle, CheckCircle, Settings, ImagePlus, Loader2, GripVertical } from 'lucide-react';
import { quizApi, QuestionType, Quiz } from '@/lib/api/quizApi';
import { uploadApi } from '@/lib/api/adminApi';
import toast from 'react-hot-toast';

interface QuizManagerProps {
  chapterId: string;
  chapterTitle: string;
  existingQuiz?: Quiz | null;
  onQuizCreated?: (quiz: Quiz) => void;
  onQuizDeleted?: () => void;
}

export default function QuizManager({
  chapterId,
  chapterTitle,
  existingQuiz,
  onQuizCreated,
  onQuizDeleted
}: QuizManagerProps) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'view' | 'create' | 'edit'>('view');
  const [showSettings, setShowSettings] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [questions, setQuestions] = useState<QuestionInput[]>([]);
  const [settings, setSettings] = useState({
    timeLimit: 15,
    passingScore: 70,
    showCorrectAnswers: true,
    randomizeQuestions: false
  });

  // DnD sensors for question reordering
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = questions.findIndex((q, i) => (q.id || `temp-${i}`) === active.id);
      const newIndex = questions.findIndex((q, i) => (q.id || `temp-${i}`) === over.id);
      setQuestions(arrayMove(questions, oldIndex, newIndex));
    }
  };

  // Reset mode when quiz is deleted (only if we're in view mode, not during creation)
  useEffect(() => {
    if (!existingQuiz && mode === 'view') {
      setQuestions([]);
    }
  }, [existingQuiz, mode]);

  // Load existing quiz data when editing
  useEffect(() => {
    if (existingQuiz && mode === 'edit') {
      setSettings({
        timeLimit: existingQuiz.timeLimit || 15,
        passingScore: existingQuiz.passingScore || 70,
        showCorrectAnswers: existingQuiz.showCorrectAnswers ?? true,
        randomizeQuestions: existingQuiz.randomizeQuestions ?? false
      });
      if (existingQuiz.questions) {
        setQuestions(existingQuiz.questions.map(q => ({
          id: q.id,
          type: q.type,
          question: q.question,
          questionImage: q.questionImage,
          points: q.points,
          answers: q.answers.map(a => ({
            id: a.id,
            text: a.answer,
            answerImage: a.answerImage,
            isCorrect: a.isCorrect
          }))
        })));
      }
    }
  }, [existingQuiz, mode]);

  // Create quiz mutation
  const createQuizMutation = useMutation({
    mutationFn: async () => {
      // Check if quiz already exists for this chapter
      const existingResponse = await quizApi.getAll({ includeQuestions: false });
      const existingQuizzes = existingResponse.data || [];
      const alreadyExists = existingQuizzes.find((q: any) => q.chapterId === chapterId);
      if (alreadyExists) {
        throw new Error('ამ თავს უკვე აქვს ქვიზი');
      }

      const quizResult = await quizApi.create({
        title: `${chapterTitle} - ქვიზი`,
        type: 'CHAPTER_QUIZ',
        chapterId: chapterId,
        timeLimit: settings.timeLimit,
        passingScore: settings.passingScore,
        showCorrectAnswers: settings.showCorrectAnswers,
        randomizeQuestions: settings.randomizeQuestions
      });

      // API returns { success: true, data: quiz }
      const createdQuiz = quizResult.data;

      for (let qIndex = 0; qIndex < questions.length; qIndex++) {
        const q = questions[qIndex];
        await quizApi.addQuestion(createdQuiz.id, {
          type: q.type,
          question: q.question,
          questionImage: q.questionImage,
          points: q.points,
          order: qIndex,
          answers: q.answers.filter(a => a.text.trim() || a.answerImage).map((a, i) => ({
            answer: a.text,
            answerImage: a.answerImage,
            isCorrect: a.isCorrect,
            order: i
          }))
        });
      }

      return createdQuiz;
    },
    onSuccess: (quiz) => {
      toast.success('ქვიზი შეიქმნა');
      setMode('view');
      setQuestions([]);
      onQuizCreated?.(quiz);
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
      queryClient.invalidateQueries({ queryKey: ['chapter-quiz', chapterId] });
    },
    onError: (error: any) => {
      const message = error.message || error.response?.data?.message || 'შეცდომა';
      toast.error(message);
    }
  });

  // Update quiz mutation
  const updateQuizMutation = useMutation({
    mutationFn: async () => {
      if (!existingQuiz) return;

      // Update quiz settings
      await quizApi.update(existingQuiz.id, {
        timeLimit: settings.timeLimit,
        passingScore: settings.passingScore,
        showCorrectAnswers: settings.showCorrectAnswers,
        randomizeQuestions: settings.randomizeQuestions
      });

      // Delete removed questions
      const existingIds = new Set(questions.filter(q => q.id).map(q => q.id));
      for (const q of existingQuiz.questions || []) {
        if (!existingIds.has(q.id)) {
          await quizApi.deleteQuestion(q.id);
        }
      }

      // Update/create questions
      for (let qIndex = 0; qIndex < questions.length; qIndex++) {
        const q = questions[qIndex];
        if (q.id) {
          await quizApi.updateQuestion(q.id, {
            type: q.type,
            question: q.question,
            questionImage: q.questionImage,
            points: q.points,
            order: qIndex,
            answers: q.answers.filter(a => a.text.trim() || a.answerImage).map((a, i) => ({
              answer: a.text,
              answerImage: a.answerImage,
              isCorrect: a.isCorrect,
              order: i
            }))
          });
        } else {
          await quizApi.addQuestion(existingQuiz.id, {
            type: q.type,
            question: q.question,
            questionImage: q.questionImage,
            points: q.points,
            order: qIndex,
            answers: q.answers.filter(a => a.text.trim() || a.answerImage).map((a, i) => ({
              answer: a.text,
              answerImage: a.answerImage,
              isCorrect: a.isCorrect,
              order: i
            }))
          });
        }
      }

      return existingQuiz;
    },
    onSuccess: () => {
      toast.success('ქვიზი განახლდა');
      setMode('view');
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
      queryClient.invalidateQueries({ queryKey: ['chapter-quiz', chapterId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'შეცდომა');
    }
  });

  // Delete quiz mutation
  const deleteQuizMutation = useMutation({
    mutationFn: (quizId: string) => quizApi.delete(quizId),
    onSuccess: async () => {
      toast.success('ქვიზი წაიშალა');
      // First invalidate queries
      await queryClient.invalidateQueries({ queryKey: ['chapters'] });
      await queryClient.invalidateQueries({ queryKey: ['chapter-quiz', chapterId] });
      // Then notify parent
      onQuizDeleted?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'შეცდომა');
    }
  });

  const addQuestion = () => {
    setQuestions([...questions, {
      type: QuestionType.SINGLE_CHOICE,
      question: '',
      points: 10,
      answers: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false }
      ]
    }]);
  };

  const updateQuestion = (index: number, updates: Partial<QuestionInput>) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], ...updates };
    setQuestions(newQuestions);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const addAnswer = (questionIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].answers.push({ text: '', isCorrect: false });
    setQuestions(newQuestions);
  };

  const updateAnswer = (questionIndex: number, answerIndex: number, updates: Partial<AnswerInput>) => {
    const newQuestions = [...questions];
    const question = newQuestions[questionIndex];

    if (updates.isCorrect && question.type === QuestionType.SINGLE_CHOICE) {
      question.answers.forEach((a, i) => {
        a.isCorrect = i === answerIndex;
      });
    } else {
      question.answers[answerIndex] = { ...question.answers[answerIndex], ...updates };
    }

    setQuestions(newQuestions);
  };

  const removeAnswer = (questionIndex: number, answerIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[questionIndex].answers.length > 2) {
      newQuestions[questionIndex].answers.splice(answerIndex, 1);
      setQuestions(newQuestions);
    }
  };

  const canSave = questions.length > 0 && questions.every(q =>
    q.question.trim() &&
    q.answers.filter(a => a.text.trim() || a.answerImage).length >= 2 &&
    q.answers.some(a => a.isCorrect && (a.text.trim() || a.answerImage))
  );

  // VIEW MODE - Show existing quiz summary
  if (existingQuiz && mode === 'view') {
    return (
      <div className="border rounded-lg overflow-hidden">
        {/* Quiz Header */}
        <div className="p-4 bg-accent-50 border-b border-accent-100">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-accent-600">{existingQuiz.title}</h4>
              <p className="text-sm text-accent-600 mt-0.5">
                {existingQuiz.questions?.length || 0} კითხვა • {existingQuiz.timeLimit || 0} წუთი • {existingQuiz.passingScore}%
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowQuestions(!showQuestions)}
                className="p-2 text-accent-600 hover:bg-accent-100 rounded"
                title={showQuestions ? 'დამალვა' : 'ნახვა'}
              >
                {showQuestions ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setMode('edit')}
                className="p-2 text-accent-600 hover:bg-accent-100 rounded"
                title="რედაქტირება"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm('წავშალოთ ქვიზი?')) {
                    deleteQuizMutation.mutate(existingQuiz.id);
                  }
                }}
                disabled={deleteQuizMutation.isPending}
                className="p-2 text-red-500 hover:bg-red-50 rounded"
                title="წაშლა"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Questions Preview */}
        {showQuestions && existingQuiz.questions && existingQuiz.questions.length > 0 && (
          <div className="p-4 space-y-3 bg-white">
            {existingQuiz.questions.map((q, i) => (
              <div key={q.id} className="text-sm">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-accent-100 text-accent-600 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-gray-800">{q.question}</p>
                    {q.questionImage && (
                      <img
                        src={q.questionImage}
                        alt="კითხვის სურათი"
                        className="mt-2 max-w-xs max-h-32 rounded-lg border border-gray-200"
                      />
                    )}
                    <div className="mt-1.5 space-y-1">
                      {q.answers.map((a) => (
                        <div
                          key={a.id}
                          className={`text-xs ${
                            a.isCorrect ? 'text-green-600' : 'text-gray-500'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            {a.isCorrect ? (
                              <Check className="w-3 h-3 flex-shrink-0" />
                            ) : (
                              <span className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0" />
                            )}
                            {a.answer}
                          </div>
                          {a.answerImage && (
                            <img
                              src={a.answerImage}
                              alt="პასუხის სურათი"
                              className="mt-1 ml-[18px] max-w-[150px] max-h-24 rounded border border-gray-200"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{q.points} ქ.</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // CREATE/EDIT MODE - Show form
  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">
            {mode === 'edit' ? 'ქვიზის რედაქტირება' : 'ახალი ქვიზი'}
          </h4>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              showSettings
                ? 'bg-accent-100 text-accent-600'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            პარამეტრები
            {showSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Settings */}
        {showSettings && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Settings Header */}
            <div className="px-4 py-3 bg-primary-50 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-accent-600" />
                <span className="text-sm font-medium text-gray-700">ქვიზის პარამეტრები</span>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Time and Score Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    დროის ლიმიტი
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={settings.timeLimit}
                      onChange={(e) => setSettings({ ...settings, timeLimit: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 pr-12 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent-600 focus:border-accent-600 transition-all"
                      min="0"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">წუთი</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">0 = შეუზღუდავი</p>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
                    <Target className="w-3.5 h-3.5" />
                    გავლის ზღვარი
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={settings.passingScore}
                      onChange={(e) => setSettings({ ...settings, passingScore: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 pr-8 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent-600 focus:border-accent-600 transition-all"
                      min="0"
                      max="100"
                      placeholder="70"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Toggle Options */}
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">სწორი პასუხების ჩვენება</span>
                      <p className="text-xs text-gray-400">დასრულების შემდეგ სტუდენტი დაინახავს სწორ პასუხებს</p>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={settings.showCorrectAnswers}
                      onChange={(e) => setSettings({ ...settings, showCorrectAnswers: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-600"></div>
                  </div>
                </label>

                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent-100 flex items-center justify-center group-hover:bg-accent-200 transition-colors">
                      <Shuffle className="w-4 h-4 text-accent-600" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">შემთხვევითი თანმიმდევრობა</span>
                      <p className="text-xs text-gray-400">კითხვები შემთხვევითი რიგით გამოჩნდება</p>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={settings.randomizeQuestions}
                      onChange={(e) => setSettings({ ...settings, randomizeQuestions: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-600"></div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Questions */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={questions.map((q, i) => q.id || `temp-${i}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {questions.map((question, qIndex) => (
                <QuestionCard
                  key={question.id || `temp-${qIndex}`}
                  id={question.id || `temp-${qIndex}`}
                  index={qIndex}
                  question={question}
                  onUpdate={(updates) => updateQuestion(qIndex, updates)}
                  onRemove={() => removeQuestion(qIndex)}
                  onAddAnswer={() => addAnswer(qIndex)}
                  onUpdateAnswer={(aIndex, updates) => updateAnswer(qIndex, aIndex, updates)}
                  onRemoveAnswer={(aIndex) => removeAnswer(qIndex, aIndex)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Add Question Button */}
        <button
          onClick={addQuestion}
          className="w-full py-2 text-sm text-accent-600 hover:bg-accent-50 rounded-lg border border-accent-200 flex items-center justify-center gap-1"
        >
          <Plus className="w-3 h-3" />
          კითხვის დამატება
        </button>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <button
            onClick={() => {
              setMode('view');
              setQuestions([]);
              setShowSettings(false);
            }}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            გაუქმება
          </button>
          <button
            onClick={() => mode === 'edit' ? updateQuizMutation.mutate() : createQuizMutation.mutate()}
            disabled={!canSave || createQuizMutation.isPending || updateQuizMutation.isPending}
            className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50"
          >
            {createQuizMutation.isPending || updateQuizMutation.isPending ? 'შენახვა...' : 'შენახვა'}
          </button>
        </div>
      </div>
    );
  }

  // NO QUIZ - Show create button
  return (
    <button
      onClick={() => {
        setMode('create');
        addQuestion();
      }}
      className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-accent-400 hover:text-accent-600 transition-colors flex items-center justify-center gap-2"
    >
      <Plus className="w-4 h-4" />
      ქვიზის დამატება
    </button>
  );
}

// Types
interface AnswerInput {
  id?: string;
  text: string;
  answerImage?: string;
  isCorrect: boolean;
}

interface QuestionInput {
  id?: string;
  type: QuestionType;
  question: string;
  questionImage?: string;
  points: number;
  answers: AnswerInput[];
}

// Question Card Component
function QuestionCard({
  id,
  index,
  question,
  onUpdate,
  onRemove,
  onAddAnswer,
  onUpdateAnswer,
  onRemoveAnswer
}: {
  id: string;
  index: number;
  question: QuestionInput;
  onUpdate: (updates: Partial<QuestionInput>) => void;
  onRemove: () => void;
  onAddAnswer: () => void;
  onUpdateAnswer: (answerIndex: number, updates: Partial<AnswerInput>) => void;
  onRemoveAnswer: (answerIndex: number) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingAnswerIndex, setUploadingAnswerIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const answerFileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('მხოლოდ სურათის ატვირთვა შეიძლება');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('სურათი არ უნდა აღემატებოდეს 5MB-ს');
      return;
    }

    setIsUploading(true);
    try {
      const response = await uploadApi.quizImage(file);
      const imageUrl = response.data.file.url;
      onUpdate({ questionImage: imageUrl });
      toast.success('სურათი აიტვირთა');
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('სურათის ატვირთვა ვერ მოხერხდა');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    onUpdate({ questionImage: undefined });
  };

  const handleAnswerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, answerIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('მხოლოდ სურათის ატვირთვა შეიძლება');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('სურათი არ უნდა აღემატებოდეს 5MB-ს');
      return;
    }

    setUploadingAnswerIndex(answerIndex);
    try {
      const response = await uploadApi.quizImage(file);
      const imageUrl = response.data.file.url;
      onUpdateAnswer(answerIndex, { answerImage: imageUrl });
      toast.success('სურათი აიტვირთა');
    } catch (error) {
      console.error('Answer image upload error:', error);
      toast.error('სურათის ატვირთვა ვერ მოხერხდა');
    } finally {
      setUploadingAnswerIndex(null);
      if (answerFileInputRefs.current[answerIndex]) {
        answerFileInputRefs.current[answerIndex]!.value = '';
      }
    }
  };

  const handleRemoveAnswerImage = (answerIndex: number) => {
    onUpdateAnswer(answerIndex, { answerImage: undefined });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg border p-3 space-y-3"
    >
      {/* Question Header */}
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <span className="w-6 h-6 rounded-full bg-accent-100 text-accent-600 text-xs flex items-center justify-center font-medium flex-shrink-0">
          {index + 1}
        </span>
        <div className="flex-1">
          <textarea
            value={question.question}
            onChange={(e) => onUpdate({ question: e.target.value })}
            placeholder="შეიყვანეთ კითხვა..."
            rows={2}
            className="w-full px-3 py-2 border rounded-lg text-sm resize-none focus:ring-1 focus:ring-accent-600 focus:border-accent-600"
          />
        </div>
        <button
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-red-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Question Image */}
      <div className="ml-8">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {question.questionImage ? (
          <div className="relative inline-block">
            <img
              src={question.questionImage}
              alt="კითხვის სურათი"
              className="max-w-xs max-h-40 rounded-lg border border-gray-200"
            />
            <button
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-sm"
              title="სურათის წაშლა"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-accent-600 hover:bg-accent-50 border border-dashed border-gray-300 hover:border-accent-300 rounded-lg transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                იტვირთება...
              </>
            ) : (
              <>
                <ImagePlus className="w-3.5 h-3.5" />
                სურათის დამატება
              </>
            )}
          </button>
        )}
      </div>

      {/* Question Type */}
      <div className="flex items-center gap-3 text-xs ml-8">
        <select
          value={question.type}
          onChange={(e) => onUpdate({ type: e.target.value as QuestionType })}
          className="px-2 py-1 border rounded text-gray-600"
        >
          <option value={QuestionType.SINGLE_CHOICE}>ერთი პასუხი</option>
          <option value={QuestionType.MULTIPLE_CHOICE}>რამდენიმე პასუხი</option>
          <option value={QuestionType.TRUE_FALSE}>ჭეშმარიტი/მცდარი</option>
        </select>
        <div className="flex items-center gap-1">
          <span className="text-gray-500">ქულა:</span>
          <input
            type="number"
            value={question.points}
            onChange={(e) => onUpdate({ points: parseInt(e.target.value) || 1 })}
            className="w-12 px-1 py-0.5 border rounded text-center"
            min="1"
          />
        </div>
      </div>

      {/* Answers */}
      <div className="space-y-2 ml-8">
        {question.answers.map((answer, aIndex) => (
          <div key={answer.id || aIndex} className="space-y-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onUpdateAnswer(aIndex, { isCorrect: !answer.isCorrect })}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                  answer.isCorrect
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-300 hover:border-green-400'
                }`}
              >
                {answer.isCorrect && <Check className="w-3 h-3" />}
              </button>
              <input
                type="text"
                value={answer.text}
                onChange={(e) => onUpdateAnswer(aIndex, { text: e.target.value })}
                placeholder={`პასუხი ${aIndex + 1}`}
                className="flex-1 px-2 py-1.5 border rounded text-sm focus:ring-1 focus:ring-accent-600 focus:border-accent-600"
              />
              {/* Answer Image Upload */}
              <input
                ref={(el) => { answerFileInputRefs.current[aIndex] = el; }}
                type="file"
                accept="image/*"
                onChange={(e) => handleAnswerImageUpload(e, aIndex)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => answerFileInputRefs.current[aIndex]?.click()}
                disabled={uploadingAnswerIndex === aIndex}
                className={`p-1.5 rounded transition-colors ${
                  answer.answerImage
                    ? 'text-accent-600 bg-accent-50 hover:bg-accent-100'
                    : 'text-gray-400 hover:text-accent-600 hover:bg-gray-100'
                }`}
                title="სურათის დამატება"
              >
                {uploadingAnswerIndex === aIndex ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="w-3.5 h-3.5" />
                )}
              </button>
              {question.answers.length > 2 && (
                <button
                  onClick={() => onRemoveAnswer(aIndex)}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {/* Answer Image Preview */}
            {answer.answerImage && (
              <div className="ml-7 relative inline-block">
                <img
                  src={answer.answerImage}
                  alt="პასუხის სურათი"
                  className="max-w-[120px] max-h-20 rounded border border-gray-200"
                />
                <button
                  onClick={() => handleRemoveAnswerImage(aIndex)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-sm"
                  title="სურათის წაშლა"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        ))}
        <button
          onClick={onAddAnswer}
          className="text-xs text-accent-600 hover:text-accent-700"
        >
          + პასუხის დამატება
        </button>
      </div>
    </div>
  );
}

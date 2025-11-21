'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, ChevronDown, ChevronUp, HelpCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { chapterApi, uploadApi } from '@/lib/api/adminApi';
import { quizApi, QuestionType } from '@/lib/api/quizApi';
import FileUpload from '@/components/ui/FileUpload';
import RichTextEditor from '@/components/ui/RichTextEditor';
import toast from 'react-hot-toast';

export default function ChapterNewPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const courseId = params.courseId as string;
  const versionId = params.versionId as string;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    videoUrl: '',
    theory: '',
    assignmentFile: '',
    answerFile: '',
    isFree: false
  });

  const [includeQuiz, setIncludeQuiz] = useState(false);
  const [quizExpanded, setQuizExpanded] = useState(false);
  const [quizData, setQuizData] = useState({
    title: '',
    timeLimit: 30,
    passingScore: 70,
    showCorrectAnswers: true,
    showExplanations: true,
    preventTabSwitch: true,
    preventCopyPaste: false,
    randomizeQuestions: false,
    randomizeAnswers: false
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

  const createMutation = useMutation({
    mutationFn: (data: any) => chapterApi.create({ ...data, courseVersionId: versionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters', versionId] });
      toast.success('თავი შეიქმნა!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'შეცდომა');
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Create chapter first
      const result = await createMutation.mutateAsync(formData);
      const chapterId = result.data.chapter.id;

      // Create quiz if requested
      if (includeQuiz && questions.length > 0 && chapterId) {
        const quizTitle = quizData.title || `${formData.title} - ქვიზი`;

        const quizResult = await quizApi.create({
          ...quizData,
          title: quizTitle,
          type: 'CHAPTER_QUIZ',
          chapterContentId: chapterId
        });

        const createdQuiz = quizResult.data.quiz;

        // Add all questions
        for (const q of questions) {
          await quizApi.addQuestion(createdQuiz.id, {
            ...q,
            quizId: createdQuiz.id
          });
        }

        toast.success('თავი და ქვიზი შეიქმნა!');
      }

      // Navigate back to version page
      router.push(`/admin/courses/${courseId}/versions/${versionId}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'შეცდომა');
    }
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

    setQuestions([...questions, {
      ...currentQuestion,
      answers: validAnswers
    }]);

    // Reset current question
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

    toast.success('კითხვა დაემატა');
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
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

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href={`/admin/courses/${courseId}/versions/${versionId}`}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ახალი თავის შექმნა</h1>
            <p className="text-sm text-gray-500 mt-1">შექმენით ახალი თავი კურსისთვის</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">
              ძირითადი ინფორმაცია
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                თავის სათაური *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">აღწერა</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ვიდეო URL</label>
              <input
                type="url"
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">თეორია</label>
              <RichTextEditor
                content={formData.theory}
                onChange={(html) => setFormData({ ...formData, theory: html })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FileUpload
                label="დავალება"
                accept=".pdf,.doc,.docx"
                onUpload={(file) => uploadApi.assignment(file).then(res => res.data.file)}
                value={formData.assignmentFile}
                onChange={(url) => setFormData({ ...formData, assignmentFile: url })}
                preview={false}
              />

              <FileUpload
                label="პასუხი"
                accept=".pdf,.doc,.docx"
                onUpload={(file) => uploadApi.answer(file).then(res => res.data.file)}
                value={formData.answerFile}
                onChange={(url) => setFormData({ ...formData, answerFile: url })}
                preview={false}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isFree"
                checked={formData.isFree}
                onChange={(e) => setFormData({ ...formData, isFree: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="isFree" className="text-sm font-medium text-gray-700">
                უფასო თავი (preview)
              </label>
            </div>
          </div>

          {/* Quiz Section */}
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">ქვიზი</h2>

            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="includeQuiz"
                checked={includeQuiz}
                onChange={(e) => {
                  setIncludeQuiz(e.target.checked);
                  setQuizExpanded(e.target.checked);
                }}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="includeQuiz" className="text-sm font-medium text-gray-700">
                ქვიზის დამატება ამ თავისთვის
              </label>
              <HelpCircle className="w-4 h-4 text-gray-400" title="შექმენით ქვიზი რომელიც გამოჩნდება ამ თავის შემდეგ" />
            </div>

            {includeQuiz && (
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                {/* Quiz Settings */}
                <button
                  type="button"
                  onClick={() => setQuizExpanded(!quizExpanded)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <span className="font-medium text-gray-900">ქვიზის პარამეტრები</span>
                  {quizExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {quizExpanded && (
                  <div className="space-y-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ქვიზის სათაური (არასავალდებულო)
                      </label>
                      <input
                        type="text"
                        value={quizData.title}
                        onChange={(e) => setQuizData({ ...quizData, title: e.target.value })}
                        placeholder={`${formData.title} - ქვიზი`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          დრო (წუთები)
                        </label>
                        <input
                          type="number"
                          value={quizData.timeLimit}
                          onChange={(e) => setQuizData({ ...quizData, timeLimit: parseInt(e.target.value) })}
                          min="0"
                          max="120"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          გასავლელი ქულა (%)
                        </label>
                        <input
                          type="number"
                          value={quizData.passingScore}
                          onChange={(e) => setQuizData({ ...quizData, passingScore: parseInt(e.target.value) })}
                          min="0"
                          max="100"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {[
                        { key: 'showCorrectAnswers', label: 'სწორი პასუხების ჩვენება' },
                        { key: 'showExplanations', label: 'განმარტებების ჩვენება' },
                        { key: 'preventTabSwitch', label: 'ტაბის გადართვის აღკვეთა' },
                        { key: 'preventCopyPaste', label: 'კოპირების აღკვეთა' },
                        { key: 'randomizeQuestions', label: 'კითხვების შემთხვევითი თანმიმდევრობა' },
                        { key: 'randomizeAnswers', label: 'პასუხების შემთხვევითი თანმიმდევრობა' }
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={quizData[key as keyof typeof quizData] as boolean}
                            onChange={(e) => setQuizData({ ...quizData, [key]: e.target.checked })}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-gray-700">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Questions List */}
                {questions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">დამატებული კითხვები ({questions.length})</h4>
                    {questions.map((q, index) => (
                      <div key={index} className="flex items-start justify-between p-3 bg-white border rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {index + 1}. {q.question}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {q.type} | {q.points} ქულა | {q.answers.filter((a: any) => a.isCorrect).length} სწორი პასუხი
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Question Form */}
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-medium text-gray-900">კითხვის დამატება</h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ტიპი
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
                      rows={2}
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
                              <Trash2 className="w-4 h-4" />
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
                    type="button"
                    onClick={handleAddQuestion}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    კითხვის დამატება
                  </button>
                </div>

                {questions.length === 0 && (
                  <div className="text-center py-4 text-sm text-amber-600 bg-amber-50 rounded-lg">
                    ⚠️ დაამატეთ მინიმუმ 1 კითხვა ქვიზის შესაქმნელად
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t">
            <Link
              href={`/admin/courses/${courseId}/versions/${versionId}`}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              გაუქმება
            </Link>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {createMutation.isPending ? 'შენახვა...' : 'შექმნა'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

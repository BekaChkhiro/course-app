'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, FileText, Video, File, HelpCircle, Plus, Trash2, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { chapterApi, uploadApi } from '@/lib/api/adminApi';
import { quizApi, QuestionType } from '@/lib/api/quizApi';
import FileUpload from '@/components/ui/FileUpload';
import RichTextEditor from '@/components/ui/RichTextEditor';
import toast from 'react-hot-toast';

type TabType = 'info' | 'content' | 'files' | 'quiz';

const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: 'info', label: 'ინფორმაცია', icon: <FileText className="w-4 h-4" /> },
  { id: 'content', label: 'კონტენტი', icon: <Video className="w-4 h-4" /> },
  { id: 'files', label: 'ფაილები', icon: <File className="w-4 h-4" /> },
  { id: 'quiz', label: 'ქვიზი', icon: <HelpCircle className="w-4 h-4" /> },
];

interface AnswerInput {
  text: string;
  isCorrect: boolean;
}

interface QuestionInput {
  type: QuestionType;
  question: string;
  points: number;
  answers: AnswerInput[];
}

export default function ChapterNewPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const courseId = params.courseId as string;
  const versionId = params.versionId as string;

  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    videoUrl: '',
    theory: '',
    assignmentFile: '',
    answerFile: '',
    isFree: false
  });

  // Quiz state
  const [questions, setQuestions] = useState<QuestionInput[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    timeLimit: 15,
    passingScore: 70,
    showCorrectAnswers: true,
    randomizeQuestions: false
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => chapterApi.create({ ...data, courseVersionId: versionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters', versionId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'შეცდომა');
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('შეიყვანეთ სათაური');
      setActiveTab('info');
      return;
    }

    try {
      const result = await createMutation.mutateAsync(formData);
      const chapterId = result.data.chapter.id;

      // Create quiz if questions exist
      if (questions.length > 0 && chapterId) {
        const quizResult = await quizApi.create({
          title: `${formData.title} - ქვიზი`,
          type: 'CHAPTER_QUIZ',
          chapterContentId: chapterId,
          timeLimit: settings.timeLimit,
          passingScore: settings.passingScore,
          showCorrectAnswers: settings.showCorrectAnswers,
          randomizeQuestions: settings.randomizeQuestions
        });

        const createdQuiz = quizResult.data.quiz;

        for (const q of questions) {
          await quizApi.addQuestion(createdQuiz.id, {
            type: q.type,
            question: q.question,
            points: q.points,
            answers: q.answers.filter(a => a.text.trim()).map((a, i) => ({
              answer: a.text,
              isCorrect: a.isCorrect,
              order: i
            }))
          });
        }

        toast.success('თავი და ქვიზი შეიქმნა');
      } else {
        toast.success('თავი შეიქმნა');
      }

      router.push(`/admin/courses/${courseId}/versions/${versionId}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'შეცდომა');
    }
  };

  // Quiz functions
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

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href={`/admin/courses/${courseId}/versions/${versionId}`}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ახალი თავი</h1>
            <p className="text-sm text-gray-500">შექმენით ახალი თავი კურსისთვის</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="border-b">
            <nav className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-accent-600 text-accent-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.id === 'quiz' && questions.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-accent-100 text-accent-600 rounded-full">
                      {questions.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="p-6">
              {/* Info Tab */}
              {activeTab === 'info' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      სათაური *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-accent-600"
                      placeholder="თავის სახელი..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      აღწერა
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-accent-600"
                      placeholder="მოკლე აღწერა..."
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isFree"
                      checked={formData.isFree}
                      onChange={(e) => setFormData({ ...formData, isFree: e.target.checked })}
                      className="w-4 h-4 text-accent-600 rounded focus:ring-accent-600"
                    />
                    <label htmlFor="isFree" className="text-sm text-gray-700">
                      უფასო თავი (preview)
                    </label>
                  </div>
                </div>
              )}

              {/* Content Tab */}
              {activeTab === 'content' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      ვიდეო URL
                    </label>
                    <input
                      type="url"
                      value={formData.videoUrl}
                      onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-accent-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      თეორია
                    </label>
                    <RichTextEditor
                      content={formData.theory}
                      onChange={(html) => setFormData({ ...formData, theory: html })}
                    />
                  </div>
                </div>
              )}

              {/* Files Tab */}
              {activeTab === 'files' && (
                <div className="grid grid-cols-2 gap-6">
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
              )}

              {/* Quiz Tab */}
              {activeTab === 'quiz' && (
                <div className="space-y-4">
                  {/* Settings Toggle */}
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">კითხვები ({questions.length})</h4>
                    <button
                      type="button"
                      onClick={() => setShowSettings(!showSettings)}
                      className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                      პარამეტრები
                      {showSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Settings */}
                  {showSettings && (
                    <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border text-sm">
                      <div>
                        <label className="text-gray-600">დრო (წუთი)</label>
                        <input
                          type="number"
                          value={settings.timeLimit}
                          onChange={(e) => setSettings({ ...settings, timeLimit: parseInt(e.target.value) || 0 })}
                          className="w-full mt-1 px-2 py-1 border rounded"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="text-gray-600">გასავლელი %</label>
                        <input
                          type="number"
                          value={settings.passingScore}
                          onChange={(e) => setSettings({ ...settings, passingScore: parseInt(e.target.value) || 0 })}
                          className="w-full mt-1 px-2 py-1 border rounded"
                          min="0"
                          max="100"
                        />
                      </div>
                      <label className="flex items-center gap-2 col-span-2">
                        <input
                          type="checkbox"
                          checked={settings.showCorrectAnswers}
                          onChange={(e) => setSettings({ ...settings, showCorrectAnswers: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-gray-600">სწორი პასუხების ჩვენება</span>
                      </label>
                      <label className="flex items-center gap-2 col-span-2">
                        <input
                          type="checkbox"
                          checked={settings.randomizeQuestions}
                          onChange={(e) => setSettings({ ...settings, randomizeQuestions: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-gray-600">შემთხვევითი თანმიმდევრობა</span>
                      </label>
                    </div>
                  )}

                  {/* Questions */}
                  <div className="space-y-3">
                    {questions.map((question, qIndex) => (
                      <div key={qIndex} className="bg-gray-50 rounded-lg border p-3 space-y-3">
                        {/* Question Header */}
                        <div className="flex items-start gap-2">
                          <span className="w-6 h-6 rounded-full bg-accent-100 text-accent-600 text-xs flex items-center justify-center font-medium flex-shrink-0">
                            {qIndex + 1}
                          </span>
                          <div className="flex-1">
                            <textarea
                              value={question.question}
                              onChange={(e) => updateQuestion(qIndex, { question: e.target.value })}
                              placeholder="შეიყვანეთ კითხვა..."
                              rows={2}
                              className="w-full px-3 py-2 border rounded-lg text-sm resize-none focus:ring-1 focus:ring-accent-600 focus:border-accent-600"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeQuestion(qIndex)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Question Type */}
                        <div className="flex items-center gap-3 text-xs ml-8">
                          <select
                            value={question.type}
                            onChange={(e) => updateQuestion(qIndex, { type: e.target.value as QuestionType })}
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
                              onChange={(e) => updateQuestion(qIndex, { points: parseInt(e.target.value) || 1 })}
                              className="w-12 px-1 py-0.5 border rounded text-center"
                              min="1"
                            />
                          </div>
                        </div>

                        {/* Answers */}
                        <div className="space-y-2 ml-8">
                          {question.answers.map((answer, aIndex) => (
                            <div key={aIndex} className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateAnswer(qIndex, aIndex, { isCorrect: !answer.isCorrect })}
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
                                onChange={(e) => updateAnswer(qIndex, aIndex, { text: e.target.value })}
                                placeholder={`პასუხი ${aIndex + 1}`}
                                className="flex-1 px-2 py-1.5 border rounded text-sm focus:ring-1 focus:ring-accent-600 focus:border-accent-600"
                              />
                              {question.answers.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => removeAnswer(qIndex, aIndex)}
                                  className="p-1 text-gray-400 hover:text-red-500"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addAnswer(qIndex)}
                            className="text-xs text-accent-600 hover:text-accent-600"
                          >
                            + პასუხის დამატება
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Question Button */}
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-accent-400 hover:text-accent-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    კითხვის დამატება
                  </button>

                  {questions.length === 0 && (
                    <p className="text-center text-sm text-gray-500">
                      ქვიზი არასავალდებულოა. თუ გინდათ, დაამატეთ კითხვები.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <Link
                href={`/admin/courses/${courseId}/versions/${versionId}`}
                className="px-5 py-2 border rounded-lg hover:bg-gray-100"
              >
                გაუქმება
              </Link>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="flex items-center gap-2 px-5 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {createMutation.isPending ? 'შენახვა...' : 'შექმნა'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}

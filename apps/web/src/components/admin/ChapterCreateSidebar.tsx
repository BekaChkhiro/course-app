'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save, FileText, Video, File, HelpCircle, Plus, Trash2, Check } from 'lucide-react';
import { chapterApi, uploadApi } from '@/lib/api/adminApi';
import { quizApi } from '@/lib/api/quizApi';
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

interface ChapterCreateSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  versionId: string;
  onCreated?: () => void;
}

type QuizQuestion = {
  text: string;
  type: 'SINGLE' | 'MULTIPLE';
  points: number;
  answers: { text: string; isCorrect: boolean }[];
};

export default function ChapterCreateSidebar({
  isOpen,
  onClose,
  versionId,
  onCreated
}: ChapterCreateSidebarProps) {
  const queryClient = useQueryClient();
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
  const [createQuiz, setCreateQuiz] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      videoUrl: '',
      theory: '',
      assignmentFile: '',
      answerFile: '',
      isFree: false
    });
    setCreateQuiz(false);
    setQuizTitle('');
    setQuizQuestions([]);
    setActiveTab('info');
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await chapterApi.create({
        ...data,
        courseVersionId: versionId
      });
      return response.data.chapter;
    },
    onSuccess: async (chapter) => {
      // Create quiz if enabled
      if (createQuiz && quizTitle && quizQuestions.length > 0) {
        try {
          await quizApi.create({
            title: quizTitle,
            chapterId: chapter.id,
            passingScore: 70,
            questions: quizQuestions.map((q, idx) => ({
              ...q,
              order: idx
            }))
          });
        } catch (error) {
          console.error('Quiz creation error:', error);
          toast.error('თავი შეიქმნა, მაგრამ ქვიზის შექმნა ვერ მოხერხდა');
        }
      }

      queryClient.invalidateQueries({ queryKey: ['chapters', versionId] });
      toast.success('თავი შეიქმნა');
      resetForm();
      onClose();
      onCreated?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'შეცდომა');
    }
  });

  const handleSubmit = () => {
    if (!formData.title) {
      toast.error('სათაური აუცილებელია');
      setActiveTab('info');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Quiz helpers
  const addQuestion = () => {
    setQuizQuestions([
      ...quizQuestions,
      { text: '', type: 'SINGLE', points: 10, answers: [{ text: '', isCorrect: false }] }
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuizQuestions(quizQuestions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...quizQuestions];
    (updated[index] as any)[field] = value;
    setQuizQuestions(updated);
  };

  const addAnswer = (qIndex: number) => {
    const updated = [...quizQuestions];
    updated[qIndex].answers.push({ text: '', isCorrect: false });
    setQuizQuestions(updated);
  };

  const removeAnswer = (qIndex: number, aIndex: number) => {
    const updated = [...quizQuestions];
    updated[qIndex].answers = updated[qIndex].answers.filter((_, i) => i !== aIndex);
    setQuizQuestions(updated);
  };

  const updateAnswer = (qIndex: number, aIndex: number, field: string, value: any) => {
    const updated = [...quizQuestions];
    (updated[qIndex].answers[aIndex] as any)[field] = value;
    setQuizQuestions(updated);
  };

  // Check completion status for each tab
  const getTabStatus = (tabId: TabType): boolean => {
    switch (tabId) {
      case 'info':
        return !!formData.title;
      case 'content':
        return !!formData.videoUrl || !!formData.theory;
      case 'files':
        return !!formData.assignmentFile || !!formData.answerFile;
      case 'quiz':
        return createQuiz && quizQuestions.length > 0;
      default:
        return false;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[60] transition-opacity"
        onClick={handleClose}
      />

      {/* Sidebar */}
      <div className="fixed top-0 bottom-0 right-0 w-full max-w-4xl bg-white shadow-xl z-[70] flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">ახალი თავი</h2>
            <p className="text-sm text-gray-500">{formData.title || 'უსათაურო'}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Navigation */}
          <div className="w-48 bg-gray-50 border-r flex flex-col">
            <nav className="flex-1 p-3 space-y-1">
              {tabs.map((tab) => {
                const isComplete = getTabStatus(tab.id);
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:bg-white hover:text-gray-900'
                    }`}
                  >
                    <span className={isActive ? 'text-blue-600' : 'text-gray-400'}>
                      {tab.icon}
                    </span>
                    <span className="flex-1 text-left">{tab.label}</span>
                    {isComplete && (
                      <Check className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-green-500'}`} />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Save Button */}
            <div className="p-3 border-t">
              <button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                <Save className="w-4 h-4" />
                {createMutation.isPending ? 'შექმნა...' : 'შექმნა'}
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Info Tab */}
            {activeTab === 'info' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    სათაური *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="მაგ: შესავალი პროგრამირებაში"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    აღწერა
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="მოკლე აღწერა თავის შესახებ..."
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="isFree"
                    checked={formData.isFree}
                    onChange={(e) => setFormData({ ...formData, isFree: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div>
                    <label htmlFor="isFree" className="text-sm font-medium text-gray-900">
                      უფასო თავი
                    </label>
                    <p className="text-xs text-gray-500">
                      ეს თავი ხელმისაწვდომი იქნება ყველასთვის
                    </p>
                  </div>
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">YouTube ან Vimeo ლინკი</p>
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
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="createQuiz"
                    checked={createQuiz}
                    onChange={(e) => setCreateQuiz(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div>
                    <label htmlFor="createQuiz" className="text-sm font-medium text-gray-900">
                      ქვიზის დამატება
                    </label>
                    <p className="text-xs text-gray-500">
                      თავის ბოლოს იქნება ტესტი
                    </p>
                  </div>
                </div>

                {createQuiz && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        ქვიზის სათაური
                      </label>
                      <input
                        type="text"
                        value={quizTitle}
                        onChange={(e) => setQuizTitle(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="მაგ: თავის ტესტი"
                      />
                    </div>

                    {/* Questions */}
                    <div className="space-y-4">
                      {quizQuestions.map((question, qIndex) => (
                        <div key={qIndex} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <input
                                type="text"
                                value={question.text}
                                onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                                placeholder={`კითხვა ${qIndex + 1}`}
                              />
                            </div>
                            <button
                              onClick={() => removeQuestion(qIndex)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex items-center gap-4 text-sm">
                            <select
                              value={question.type}
                              onChange={(e) => updateQuestion(qIndex, 'type', e.target.value)}
                              className="px-2 py-1 border rounded text-sm"
                            >
                              <option value="SINGLE">ერთი პასუხი</option>
                              <option value="MULTIPLE">რამდენიმე პასუხი</option>
                            </select>
                            <input
                              type="number"
                              value={question.points}
                              onChange={(e) => updateQuestion(qIndex, 'points', parseInt(e.target.value) || 0)}
                              className="w-20 px-2 py-1 border rounded text-sm"
                              min={1}
                            />
                            <span className="text-gray-500">ქულა</span>
                          </div>

                          {/* Answers */}
                          <div className="space-y-2 pl-4">
                            {question.answers.map((answer, aIndex) => (
                              <div key={aIndex} className="flex items-center gap-2">
                                <input
                                  type={question.type === 'SINGLE' ? 'radio' : 'checkbox'}
                                  checked={answer.isCorrect}
                                  onChange={(e) => {
                                    if (question.type === 'SINGLE') {
                                      const updated = [...quizQuestions];
                                      updated[qIndex].answers = updated[qIndex].answers.map((a, i) => ({
                                        ...a,
                                        isCorrect: i === aIndex
                                      }));
                                      setQuizQuestions(updated);
                                    } else {
                                      updateAnswer(qIndex, aIndex, 'isCorrect', e.target.checked);
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600"
                                />
                                <input
                                  type="text"
                                  value={answer.text}
                                  onChange={(e) => updateAnswer(qIndex, aIndex, 'text', e.target.value)}
                                  className="flex-1 px-2 py-1 border rounded text-sm"
                                  placeholder={`პასუხი ${aIndex + 1}`}
                                />
                                {question.answers.length > 1 && (
                                  <button
                                    onClick={() => removeAnswer(qIndex, aIndex)}
                                    className="p-1 text-gray-400 hover:text-red-500"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              onClick={() => addAnswer(qIndex)}
                              className="text-sm text-blue-600 hover:text-blue-700"
                            >
                              + პასუხის დამატება
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={addQuestion}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-600"
                      >
                        <Plus className="w-4 h-4" />
                        კითხვის დამატება
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

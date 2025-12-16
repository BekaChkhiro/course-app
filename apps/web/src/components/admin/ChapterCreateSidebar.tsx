'use client';

import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save, FileText, Video, File, HelpCircle, Plus, Trash2, Check, Upload, Loader2 } from 'lucide-react';
import { chapterApi, videoApi } from '@/lib/api/adminApi';
import { quizApi } from '@/lib/api/quizApi';
import RichTextEditor from '@/components/ui/RichTextEditor';
import toast from 'react-hot-toast';

type TabType = 'info' | 'video' | 'theory' | 'files' | 'quiz';

const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: 'info', label: 'ინფორმაცია', icon: <FileText className="w-4 h-4" /> },
  { id: 'video', label: 'ვიდეო', icon: <Video className="w-4 h-4" /> },
  { id: 'theory', label: 'თეორია', icon: <FileText className="w-4 h-4" /> },
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
    theory: '',
    assignmentFile: '',
    answerFile: '',
    isFree: false
  });

  // Video upload state
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Quiz state
  const [createQuiz, setCreateQuiz] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      theory: '',
      assignmentFile: '',
      answerFile: '',
      isFree: false
    });
    setPendingVideoFile(null);
    setVideoUploadProgress(0);
    setIsUploadingVideo(false);
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
      // Upload video if pending
      if (pendingVideoFile) {
        try {
          setIsUploadingVideo(true);
          await videoApi.upload(pendingVideoFile, chapter.id, (progress) => {
            setVideoUploadProgress(progress);
          });
          toast.success('ვიდეო აიტვირთა და მუშავდება');
        } catch (error) {
          console.error('Video upload error:', error);
          toast.error('თავი შეიქმნა, მაგრამ ვიდეოს ატვირთვა ვერ მოხერხდა');
        } finally {
          setIsUploadingVideo(false);
        }
      }

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

  // Handle video file selection
  const handleVideoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('მხოლოდ MP4, MOV, AVI, MKV და WebM ფორმატებია დაშვებული');
      return;
    }

    // Validate file size (2GB limit)
    if (file.size > 2 * 1024 * 1024 * 1024) {
      toast.error('ფაილის ზომა არ უნდა აღემატებოდეს 2GB-ს');
      return;
    }

    setPendingVideoFile(file);
  };

  const removeVideoFile = () => {
    setPendingVideoFile(null);
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
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
      case 'video':
        return !!pendingVideoFile;
      case 'theory':
        return !!formData.theory;
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
                        ? 'bg-white text-accent-500 shadow-sm'
                        : 'text-gray-600 hover:bg-white hover:text-gray-900'
                    }`}
                  >
                    <span className={isActive ? 'text-accent-500' : 'text-gray-400'}>
                      {tab.icon}
                    </span>
                    <span className="flex-1 text-left">{tab.label}</span>
                    {isComplete && (
                      <Check className={`w-4 h-4 ${isActive ? 'text-accent-500' : 'text-green-500'}`} />
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
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 text-sm font-medium"
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    placeholder="მოკლე აღწერა თავის შესახებ..."
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="isFree"
                    checked={formData.isFree}
                    onChange={(e) => setFormData({ ...formData, isFree: e.target.checked })}
                    className="w-4 h-4 text-accent-500 rounded focus:ring-accent-500"
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

            {/* Video Tab */}
            {activeTab === 'video' && (
              <div className="space-y-2">
                {pendingVideoFile ? (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border">
                    <Video className="w-5 h-5 text-accent-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {pendingVideoFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(pendingVideoFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    {isUploadingVideo ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-accent-500" />
                        <span className="text-sm text-accent-500">{videoUploadProgress}%</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={removeVideoFile}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                    onClick={() => videoInputRef.current?.click()}
                  >
                    <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm font-medium text-gray-700">
                      დააწკაპუნეთ ვიდეოს ასარჩევად
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      MP4, MOV, AVI, MKV, WebM (მაქს. 2GB)
                    </p>
                  </div>
                )}
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm"
                  onChange={handleVideoFileSelect}
                  className="hidden"
                />
                <p className="text-xs text-gray-500">
                  ვიდეო აიტვირთება თავის შექმნის შემდეგ
                </p>
              </div>
            )}

            {/* Theory Tab */}
            {activeTab === 'theory' && (
              <div>
                <RichTextEditor
                  content={formData.theory}
                  onChange={(html) => setFormData({ ...formData, theory: html })}
                />
              </div>
            )}

            {/* Files Tab */}
            {activeTab === 'files' && (
              <div className="text-center py-8">
                <File className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 mb-1">ფაილების ასატვირთად ჯერ შეინახეთ თავი</p>
                <p className="text-sm text-gray-400">შენახვის შემდეგ შეძლებთ ფაილების დამატებას</p>
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
                    className="w-4 h-4 text-accent-500 rounded focus:ring-accent-500"
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
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
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
                                  className="w-4 h-4 text-accent-500"
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
                              className="text-sm text-accent-500 hover:text-accent-600"
                            >
                              + პასუხის დამატება
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={addQuestion}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg text-gray-500 hover:border-accent-500 hover:text-accent-500"
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

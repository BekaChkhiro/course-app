'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Trash2, FileText, Video, File, HelpCircle, Check } from 'lucide-react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import QuizManager from '@/components/admin/QuizManager';
import { chapterApi, uploadApi, videoApi } from '@/lib/api/adminApi';
import VideoUpload from '@/components/admin/VideoUpload';
import { quizApi } from '@/lib/api/quizApi';
import { PageLoader } from '@/components/ui/LoadingSpinner';
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

export default function ChapterEditPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const courseId = params.courseId as string;
  const versionId = params.versionId as string;
  const chapterId = params.chapterId as string;

  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    theory: '',
    assignmentFile: '',
    answerFile: '',
    isFree: false
  });
  const [chapterQuiz, setChapterQuiz] = useState<any>(null);
  const [existingVideo, setExistingVideo] = useState<any>(null);

  // Fetch chapter data
  const { data: chapterData, isLoading } = useQuery({
    queryKey: ['chapter', chapterId],
    queryFn: async () => {
      const response = await chapterApi.getByVersion(versionId);
      const chapter = response.data.chapters.find((c: any) => c.id === chapterId);
      return chapter;
    },
    enabled: !!chapterId
  });

  // Fetch quiz for this chapter
  const { data: quizData } = useQuery({
    queryKey: ['chapter-quiz', chapterId],
    queryFn: async () => {
      const response = await quizApi.getAll({ includeQuestions: true });
      const quizzes = response.data || [];
      const quiz = quizzes.find((q: any) => q.chapterId === chapterId || q.chapterContentId === chapterId);
      return quiz || null;
    },
    enabled: !!chapterId,
    staleTime: 0, // Always fetch fresh data
  });

  useEffect(() => {
    if (chapterData) {
      setFormData({
        title: chapterData.title,
        description: chapterData.description || '',
        theory: chapterData.theory || '',
        assignmentFile: chapterData.assignmentFile || '',
        answerFile: chapterData.answerFile || '',
        isFree: chapterData.isFree
      });
    }
  }, [chapterData]);

  useEffect(() => {
    if (quizData !== undefined) {
      setChapterQuiz(quizData);
    }
  }, [quizData]);

  // Fetch existing video for chapter
  const { data: videoData } = useQuery({
    queryKey: ['chapter-video', chapterId],
    queryFn: async () => {
      const response = await videoApi.getByChapter(chapterId);
      return response.data?.video || null;
    },
    enabled: !!chapterId,
  });

  useEffect(() => {
    if (videoData !== undefined) {
      setExistingVideo(videoData);
    }
  }, [videoData]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => chapterApi.update(chapterId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters', versionId] });
      queryClient.invalidateQueries({ queryKey: ['chapter', chapterId] });
      toast.success('თავი განახლდა');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'შეცდომა');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => chapterApi.delete(chapterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters', versionId] });
      toast.success('თავი წაიშალა');
      router.push(`/admin/courses/${courseId}/versions/${versionId}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'შეცდომა');
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleDelete = () => {
    if (confirm(`წავშალოთ თავი "${formData.title}"?`)) {
      deleteMutation.mutate();
    }
  };

  // Check completion status for each tab
  const getTabStatus = (tabId: TabType): boolean => {
    switch (tabId) {
      case 'info':
        return !!formData.title;
      case 'content':
        return !!existingVideo || !!formData.theory;
      case 'files':
        return !!formData.assignmentFile || !!formData.answerFile;
      case 'quiz':
        return !!chapterQuiz;
      default:
        return false;
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

  if (!chapterData) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">თავი ვერ მოიძებნა</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-64px)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/courses/${courseId}/versions/${versionId}`}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">თავის რედაქტირება</h1>
              <p className="text-sm text-gray-500">{formData.title || 'უსათაურო'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
              title="წაშლა"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content - Sidebar Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Navigation */}
          <div className="w-56 bg-gray-50 border-r flex flex-col">
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

            {/* Sidebar Footer - Save Button */}
            <div className="p-3 border-t">
              <button
                onClick={handleSubmit}
                disabled={updateMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                <Save className="w-4 h-4" />
                {updateMutation.isPending ? 'შენახვა...' : 'შენახვა'}
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            <form onSubmit={handleSubmit} className="h-full">
              <div className="p-6 max-w-3xl">
                {/* Info Tab */}
                {activeTab === 'info' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900 mb-4">ძირითადი ინფორმაცია</h2>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            სათაური
                          </label>
                          <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="მაგ: შესავალი პროგრამირებაში"
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
                              ეს თავი ხელმისაწვდომი იქნება ყველასთვის პრევიუს სახით
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Content Tab */}
                {activeTab === 'content' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900 mb-4">ვიდეო</h2>
                      <VideoUpload
                        chapterId={chapterId}
                        existingVideo={existingVideo}
                        onUploadComplete={() => {
                          queryClient.invalidateQueries({ queryKey: ['chapter-video', chapterId] });
                          toast.success('ვიდეო წარმატებით აიტვირთა');
                        }}
                      />
                    </div>

                    <div>
                      <h2 className="text-lg font-medium text-gray-900 mb-4">თეორია</h2>
                      <RichTextEditor
                        content={formData.theory}
                        onChange={(html) => setFormData({ ...formData, theory: html })}
                      />
                    </div>
                  </div>
                )}

                {/* Files Tab */}
                {activeTab === 'files' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900 mb-4">დამატებითი ფაილები</h2>
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
                    </div>
                  </div>
                )}

                {/* Quiz Tab */}
                {activeTab === 'quiz' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900 mb-4">ქვიზი</h2>
                      <QuizManager
                        chapterId={chapterId}
                        chapterTitle={formData.title}
                        existingQuiz={chapterQuiz}
                        onQuizCreated={(quiz) => setChapterQuiz(quiz)}
                        onQuizDeleted={() => setChapterQuiz(null)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

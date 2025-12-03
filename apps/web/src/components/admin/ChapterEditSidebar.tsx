'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save, Trash2, FileText, Video, File, HelpCircle, Check, Link, Upload } from 'lucide-react';
import { chapterApi, uploadApi, videoApi } from '@/lib/api/adminApi';
import { quizApi } from '@/lib/api/quizApi';
import FileUpload from '@/components/ui/FileUpload';
import RichTextEditor from '@/components/ui/RichTextEditor';
import QuizManager from '@/components/admin/QuizManager';
import VideoUpload from '@/components/admin/VideoUpload';
import ChapterAttachments from '@/components/admin/ChapterAttachments';
import toast from 'react-hot-toast';

type VideoSourceType = 'link' | 'upload';

type TabType = 'info' | 'content' | 'files' | 'quiz';

const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: 'info', label: 'ინფორმაცია', icon: <FileText className="w-4 h-4" /> },
  { id: 'content', label: 'კონტენტი', icon: <Video className="w-4 h-4" /> },
  { id: 'files', label: 'ფაილები', icon: <File className="w-4 h-4" /> },
  { id: 'quiz', label: 'ქვიზი', icon: <HelpCircle className="w-4 h-4" /> },
];

interface ChapterEditSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: string;
  versionId: string;
  onDeleted?: () => void;
}

export default function ChapterEditSidebar({
  isOpen,
  onClose,
  chapterId,
  versionId,
  onDeleted
}: ChapterEditSidebarProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [videoSourceType, setVideoSourceType] = useState<VideoSourceType>('link');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    videoUrl: '',
    theory: '',
    assignmentFile: '',
    answerFile: '',
    isFree: false
  });
  const [chapterQuiz, setChapterQuiz] = useState<any>(null);
  const [chapterVideo, setChapterVideo] = useState<any>(null);

  // Fetch chapter data
  const { data: chapterData, isLoading } = useQuery({
    queryKey: ['chapter', chapterId],
    queryFn: async () => {
      const response = await chapterApi.getByVersion(versionId);
      const chapter = response.data.chapters.find((c: any) => c.id === chapterId);
      return chapter;
    },
    enabled: !!chapterId && isOpen
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
    enabled: !!chapterId && isOpen,
    staleTime: 0, // Always fetch fresh data
  });

  // Fetch videos for this chapter
  const { data: videosData, refetch: refetchVideos } = useQuery({
    queryKey: ['chapter-videos', chapterId],
    queryFn: async () => {
      const response = await videoApi.getByChapter(chapterId);
      return response.data?.data || [];
    },
    enabled: !!chapterId && isOpen,
    staleTime: 0,
  });

  useEffect(() => {
    if (chapterData) {
      setFormData({
        title: chapterData.title,
        description: chapterData.description || '',
        videoUrl: chapterData.videoUrl || '',
        theory: chapterData.theory || '',
        assignmentFile: chapterData.assignmentFile || '',
        answerFile: chapterData.answerFile || '',
        isFree: chapterData.isFree
      });
    }
  }, [chapterData]);

  // Set video data and source type based on existing video
  useEffect(() => {
    if (videosData && videosData.length > 0) {
      // Get the most recent video
      const video = videosData[0];
      setChapterVideo(video);
      setVideoSourceType('upload');
    } else if (chapterData?.videoUrl) {
      setVideoSourceType('link');
      setChapterVideo(null);
    }
  }, [videosData, chapterData]);

  useEffect(() => {
    if (quizData !== undefined) {
      setChapterQuiz(quizData);
    }
  }, [quizData]);

  // Reset tab when opening
  useEffect(() => {
    if (isOpen) {
      setActiveTab('info');
    }
  }, [isOpen, chapterId]);

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
      onClose();
      onDeleted?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'შეცდომა');
    }
  });

  const handleSubmit = () => {
    // For upload type, video is stored separately in Video table
    const submitData = {
      ...formData,
      videoUrl: videoSourceType === 'link' ? formData.videoUrl : '',
    };
    updateMutation.mutate(submitData);
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
        return !!formData.videoUrl || !!chapterVideo || !!formData.theory;
      case 'files':
        return !!formData.assignmentFile || !!formData.answerFile;
      case 'quiz':
        return !!chapterQuiz;
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
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed top-0 bottom-0 right-0 w-full max-w-4xl bg-white shadow-xl z-[70] flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">თავის რედაქტირება</h2>
            <p className="text-sm text-gray-500">{formData.title || 'უსათაურო'}</p>
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
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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
                disabled={updateMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                <Save className="w-4 h-4" />
                {updateMutation.isPending ? 'შენახვა...' : 'შენახვა'}
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : (
              <>
                {/* Info Tab */}
                {activeTab === 'info' && (
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
                    {/* Video Source Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        ვიდეო
                      </label>

                      {/* Video Source Type Tabs */}
                      <div className="flex gap-2 mb-4">
                        <button
                          type="button"
                          onClick={() => setVideoSourceType('link')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            videoSourceType === 'link'
                              ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                              : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                          }`}
                        >
                          <Link className="w-4 h-4" />
                          ლინკი
                        </button>
                        <button
                          type="button"
                          onClick={() => setVideoSourceType('upload')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            videoSourceType === 'upload'
                              ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                              : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                          }`}
                        >
                          <Upload className="w-4 h-4" />
                          ატვირთვა
                        </button>
                      </div>

                      {/* Video Link Input */}
                      {videoSourceType === 'link' && (
                        <div>
                          <input
                            type="url"
                            value={formData.videoUrl}
                            onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                            placeholder="https://youtube.com/watch?v=..."
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">YouTube ან Vimeo ლინკი</p>
                        </div>
                      )}

                      {/* Video Upload */}
                      {videoSourceType === 'upload' && (
                        <VideoUpload
                          chapterId={chapterId}
                          existingVideo={chapterVideo}
                          onUploadComplete={() => {
                            refetchVideos();
                          }}
                        />
                      )}
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
                  <div className="space-y-6">
                    {/* Chapter Attachments */}
                    <ChapterAttachments chapterId={chapterId} />

                    {/* Legacy Assignment/Answer Files */}
                    <div className="border-t pt-6">
                      <h3 className="text-sm font-medium text-gray-700 mb-4">დავალება და პასუხი</h3>
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
                  <QuizManager
                    chapterId={chapterId}
                    chapterTitle={formData.title}
                    existingQuiz={chapterQuiz}
                    onQuizCreated={(quiz) => setChapterQuiz(quiz)}
                    onQuizDeleted={() => setChapterQuiz(null)}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

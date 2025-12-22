'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Film,
  FileText,
  Image as ImageIcon,
  AlertTriangle,
  BarChart3,
  Search,
  Trash2,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  HardDrive,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  MoreVertical,
  Calendar,
  FolderOpen,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import mediaApiClient, {
  Video,
  Attachment,
  MediaImage,
  OrphanFile,
  StorageStats,
  Pagination,
  formatBytes,
  formatDuration,
  getStatusColor,
  getStatusText,
} from '@/lib/api/mediaApi';

type TabType = 'videos' | 'attachments' | 'images' | 'orphans' | 'stats';

export default function AdminMediaPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('videos');

  // Videos state
  const [videoPage, setVideoPage] = useState(1);
  const [videoSearch, setVideoSearch] = useState('');
  const [videoStatus, setVideoStatus] = useState('');
  const [videoCourse, setVideoCourse] = useState('');
  const [videoSort, setVideoSort] = useState<'newest' | 'oldest' | 'largest' | 'smallest'>('newest');
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [previewVideo, setPreviewVideo] = useState<{ url: string; name: string } | null>(null);

  // Attachments state
  const [attachmentPage, setAttachmentPage] = useState(1);
  const [attachmentSearch, setAttachmentSearch] = useState('');
  const [attachmentType, setAttachmentType] = useState('');
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([]);

  // Images state
  const [imagePage, setImagePage] = useState(1);
  const [imageType, setImageType] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Orphans state
  const [orphanPrefix, setOrphanPrefix] = useState('');
  const [selectedOrphans, setSelectedOrphans] = useState<string[]>([]);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'video' | 'attachment' | 'orphan';
    ids: string[];
  } | null>(null);

  // Fetch videos
  const { data: videosData, isLoading: videosLoading } = useQuery({
    queryKey: ['adminVideos', videoPage, videoSearch, videoStatus, videoCourse, videoSort],
    queryFn: () =>
      mediaApiClient.getVideos({
        page: videoPage,
        limit: 20,
        search: videoSearch || undefined,
        status: videoStatus || undefined,
        courseId: videoCourse || undefined,
        sortBy: videoSort,
      }).then((res) => res.data),
    enabled: activeTab === 'videos',
  });

  // Fetch attachments
  const { data: attachmentsData, isLoading: attachmentsLoading } = useQuery({
    queryKey: ['adminAttachments', attachmentPage, attachmentSearch, attachmentType],
    queryFn: () =>
      mediaApiClient.getAttachments({
        page: attachmentPage,
        limit: 20,
        search: attachmentSearch || undefined,
        type: attachmentType as 'material' | 'assignment' | 'answer' | undefined,
      }).then((res) => res.data),
    enabled: activeTab === 'attachments',
  });

  // Fetch images
  const { data: imagesData, isLoading: imagesLoading } = useQuery({
    queryKey: ['adminImages', imagePage, imageType],
    queryFn: () =>
      mediaApiClient.getImages({
        page: imagePage,
        limit: 20,
        type: imageType as 'slider' | 'course-thumbnail' | 'quiz-image' | 'video-thumbnail' | undefined,
      }).then((res) => res.data),
    enabled: activeTab === 'images',
  });

  // Fetch stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['adminMediaStats'],
    queryFn: () => mediaApiClient.getStorageStats().then((res) => res.data),
  });

  // Fetch courses for filter
  const { data: coursesData } = useQuery({
    queryKey: ['adminMediaCourses'],
    queryFn: () => mediaApiClient.getCoursesForFilter().then((res) => res.data),
  });

  // Fetch orphan files
  const { data: orphansData, isLoading: orphansLoading, refetch: refetchOrphans } = useQuery({
    queryKey: ['adminOrphans', orphanPrefix],
    queryFn: () => mediaApiClient.scanOrphanFiles(orphanPrefix || undefined).then((res) => res.data),
    enabled: activeTab === 'orphans',
  });

  // Mutations
  const deleteVideosMutation = useMutation({
    mutationFn: (videoIds: string[]) => mediaApiClient.bulkDeleteVideos(videoIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminVideos'] });
      queryClient.invalidateQueries({ queryKey: ['adminMediaStats'] });
      setSelectedVideos([]);
      setDeleteConfirm(null);
    },
  });

  const deleteAttachmentsMutation = useMutation({
    mutationFn: (attachmentIds: string[]) => mediaApiClient.bulkDeleteAttachments(attachmentIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAttachments'] });
      queryClient.invalidateQueries({ queryKey: ['adminMediaStats'] });
      setSelectedAttachments([]);
      setDeleteConfirm(null);
    },
  });

  const deleteOrphansMutation = useMutation({
    mutationFn: (keys: string[]) => mediaApiClient.deleteOrphanFiles(keys),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrphans'] });
      queryClient.invalidateQueries({ queryKey: ['adminMediaStats'] });
      setSelectedOrphans([]);
      setDeleteConfirm(null);
    },
  });

  const videos: Video[] = videosData?.data?.videos || [];
  const videosPagination: Pagination = videosData?.data?.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 };

  const attachments: Attachment[] = attachmentsData?.data?.attachments || [];
  const attachmentsPagination: Pagination = attachmentsData?.data?.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 };

  const images: MediaImage[] = imagesData?.data?.images || [];
  const imagesPagination: Pagination = imagesData?.data?.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 };

  const orphanFiles: OrphanFile[] = orphansData?.data?.orphanFiles || [];
  const orphansTotalSize: number = orphansData?.data?.totalSize || 0;

  const stats: StorageStats = statsData?.data || {
    videos: { count: 0, totalSize: 0 },
    attachments: { count: 0, totalSize: 0 },
    images: { count: 0, breakdown: { sliders: 0, courseThumbnails: 0, quizImages: 0, videoThumbnails: 0 } },
    total: { count: 0, totalSize: 0 },
    byStatus: {},
    recentUploads: [],
  };

  const courses = coursesData?.data || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ka-GE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleVideoPreview = async (videoId: string, name: string) => {
    try {
      const response = await mediaApiClient.getVideoPreviewUrl(videoId);
      if (response.data?.data?.url) {
        setPreviewVideo({ url: response.data.data.url, name });
      }
    } catch (error) {
      console.error('Failed to get video preview URL:', error);
    }
  };

  const tabs = [
    { id: 'videos' as TabType, label: 'ვიდეოები', icon: Film, count: stats.videos.count },
    { id: 'attachments' as TabType, label: 'მასალები', icon: FileText, count: stats.attachments.count },
    { id: 'images' as TabType, label: 'სურათები', icon: ImageIcon, count: stats.images.count },
    { id: 'orphans' as TabType, label: 'ობოლები', icon: AlertTriangle },
    { id: 'stats' as TabType, label: 'სტატისტიკა', icon: BarChart3 },
  ];

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">მედია მენეჯმენტი</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">ვიდეოების და ფაილების მართვა</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
                <Film className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">ვიდეოები</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.videos.count}</p>
                <p className="text-[10px] sm:text-xs text-gray-400">{formatBytes(stats.videos.totalSize)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">მასალები</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.attachments.count}</p>
                <p className="text-[10px] sm:text-xs text-gray-400">{formatBytes(stats.attachments.totalSize)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg">
                <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">სურათები</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.images.count}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-orange-100 rounded-lg">
                <HardDrive className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">ჯამი</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.total.count}</p>
                <p className="text-[10px] sm:text-xs text-gray-400">{formatBytes(stats.total.totalSize)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 -mx-4 px-4 lg:mx-0 lg:px-0">
          <nav className="flex gap-1 sm:gap-4 overflow-x-auto pb-px scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 sm:py-3 border-b-2 transition-colors whitespace-nowrap text-sm sm:text-base ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.slice(0, 6)}{tab.label.length > 6 ? '.' : ''}</span>
                {tab.count !== undefined && (
                  <span className="hidden sm:inline px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-sm border">
          {/* Videos Tab */}
          {activeTab === 'videos' && (
            <div>
              {/* Filters */}
              <div className="p-3 sm:p-4 border-b space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-4">
                <div className="w-full sm:flex-1 sm:min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="ძიება სახელით..."
                      value={videoSearch}
                      onChange={(e) => {
                        setVideoSearch(e.target.value);
                        setVideoPage(1);
                      }}
                      className="w-full pl-10 pr-4 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-4">
                  <select
                    value={videoStatus}
                    onChange={(e) => {
                      setVideoStatus(e.target.value);
                      setVideoPage(1);
                    }}
                    className="px-3 sm:px-4 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  >
                    <option value="">სტატუსი</option>
                    <option value="COMPLETED">დასრულებული</option>
                    <option value="PROCESSING">მუშავდება</option>
                    <option value="PENDING">მოლოდინში</option>
                    <option value="FAILED">შეცდომა</option>
                  </select>
                  <select
                    value={videoSort}
                    onChange={(e) => setVideoSort(e.target.value as typeof videoSort)}
                    className="px-3 sm:px-4 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  >
                    <option value="newest">უახლესი</option>
                    <option value="oldest">უძველესი</option>
                    <option value="largest">დიდი ზომა</option>
                    <option value="smallest">მცირე ზომა</option>
                  </select>
                </div>
                <select
                  value={videoCourse}
                  onChange={(e) => {
                    setVideoCourse(e.target.value);
                    setVideoPage(1);
                  }}
                  className="w-full sm:w-auto px-3 sm:px-4 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                >
                  <option value="">ყველა კურსი</option>
                  {courses.map((course: { id: string; title: string }) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
                {selectedVideos.length > 0 && (
                  <button
                    onClick={() => setDeleteConfirm({ type: 'video', ids: selectedVideos })}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    წაშლა ({selectedVideos.length})
                  </button>
                )}
              </div>

              {/* Videos Table/Cards */}
              {videosLoading ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
              ) : videos.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  ვიდეოები არ მოიძებნა
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="sm:hidden divide-y">
                    {/* Select All Header */}
                    <div className="p-3 bg-gray-50 flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedVideos.length === videos.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedVideos(videos.map((v) => v.id));
                          } else {
                            setSelectedVideos([]);
                          }
                        }}
                        className="rounded border-gray-300 w-5 h-5"
                      />
                      <span className="text-sm text-gray-600">ყველას მონიშვნა</span>
                    </div>
                    {videos.map((video) => (
                      <div key={video.id} className="p-3">
                        <div className="flex gap-3">
                          <input
                            type="checkbox"
                            checked={selectedVideos.includes(video.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedVideos([...selectedVideos, video.id]);
                              } else {
                                setSelectedVideos(selectedVideos.filter((id) => id !== video.id));
                              }
                            }}
                            className="rounded border-gray-300 w-5 h-5 flex-shrink-0 mt-1"
                          />
                          <button
                            onClick={() => handleVideoPreview(video.id, video.originalName)}
                            className="w-20 h-14 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 relative overflow-hidden"
                          >
                            {video.thumbnails && video.thumbnails[0] ? (
                              <img
                                src={video.thumbnails[0].url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Play className="w-6 h-6 text-gray-400" />
                            )}
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <Play className="w-5 h-5 text-white" />
                            </div>
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm line-clamp-2">{video.originalName}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(video.processingStatus)}`}>
                                {getStatusText(video.processingStatus)}
                              </span>
                              <span className="text-xs text-gray-500">{formatBytes(video.originalSize)}</span>
                              {video.duration && (
                                <span className="text-xs text-gray-500">{formatDuration(video.duration)}</span>
                              )}
                            </div>
                            {video.chapter?.courseVersion?.course && (
                              <p className="text-xs text-gray-500 mt-1 truncate">
                                <FolderOpen className="w-3 h-3 inline mr-1" />
                                {video.chapter.courseVersion.course.title}
                              </p>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-400">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                {formatDate(video.createdAt)}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleVideoPreview(video.id, video.originalName)}
                                  className="p-2 text-gray-400 hover:text-primary-600"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm({ type: 'video', ids: [video.id] })}
                                  className="p-2 text-gray-400 hover:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={selectedVideos.length === videos.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedVideos(videos.map((v) => v.id));
                                } else {
                                  setSelectedVideos([]);
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preview</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">სახელი</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">კურსი</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ზომა</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">სტატუსი</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">თარიღი</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">მოქმედებები</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {videos.map((video) => (
                          <tr key={video.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedVideos.includes(video.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedVideos([...selectedVideos, video.id]);
                                  } else {
                                    setSelectedVideos(selectedVideos.filter((id) => id !== video.id));
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleVideoPreview(video.id, video.originalName)}
                                className="w-16 h-10 bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200"
                              >
                                {video.thumbnails && video.thumbnails[0] ? (
                                  <img
                                    src={video.thumbnails[0].url}
                                    alt=""
                                    className="w-full h-full object-cover rounded"
                                  />
                                ) : (
                                  <Play className="w-5 h-5 text-gray-500" />
                                )}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900 truncate max-w-[200px]" title={video.originalName}>
                                {video.originalName}
                              </p>
                              {video.duration && (
                                <p className="text-xs text-gray-500">{formatDuration(video.duration)}</p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {video.chapter?.courseVersion?.course ? (
                                <div>
                                  <p className="text-sm text-gray-900 truncate max-w-[150px]">
                                    {video.chapter.courseVersion.course.title}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">{video.chapter.title}</p>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {formatBytes(video.originalSize)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(video.processingStatus)}`}>
                                {getStatusText(video.processingStatus)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {formatDate(video.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleVideoPreview(video.id, video.originalName)}
                                  className="p-2 text-gray-400 hover:text-primary-600"
                                  title="Preview"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm({ type: 'video', ids: [video.id] })}
                                  className="p-2 text-gray-400 hover:text-red-600"
                                  title="წაშლა"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Pagination */}
              {videosPagination.totalPages > 1 && (
                <div className="p-3 sm:p-4 border-t flex items-center justify-between">
                  <p className="text-xs sm:text-sm text-gray-500">
                    <span className="hidden sm:inline">გვერდი </span>{videosPagination.page}/{videosPagination.totalPages}
                    <span className="hidden sm:inline"> (სულ {videosPagination.total})</span>
                  </p>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button
                      onClick={() => setVideoPage((p) => Math.max(1, p - 1))}
                      disabled={videoPage === 1}
                      className="p-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                    >
                      <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button
                      onClick={() => setVideoPage((p) => Math.min(videosPagination.totalPages, p + 1))}
                      disabled={videoPage === videosPagination.totalPages}
                      className="p-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                    >
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Attachments Tab */}
          {activeTab === 'attachments' && (
            <div>
              {/* Filters */}
              <div className="p-3 sm:p-4 border-b space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-4">
                <div className="w-full sm:flex-1 sm:min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="ძიება..."
                      value={attachmentSearch}
                      onChange={(e) => {
                        setAttachmentSearch(e.target.value);
                        setAttachmentPage(1);
                      }}
                      className="w-full pl-10 pr-4 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2 sm:gap-4">
                  <select
                    value={attachmentType}
                    onChange={(e) => {
                      setAttachmentType(e.target.value);
                      setAttachmentPage(1);
                    }}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  >
                    <option value="">ყველა ტიპი</option>
                    <option value="material">მასალა</option>
                    <option value="assignment">დავალება</option>
                    <option value="answer">პასუხი</option>
                  </select>
                  {selectedAttachments.length > 0 && (
                    <button
                      onClick={() => setDeleteConfirm({ type: 'attachment', ids: selectedAttachments })}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">წაშლა</span> ({selectedAttachments.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Attachments Table/Cards */}
              {attachmentsLoading ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
              ) : attachments.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  მასალები არ მოიძებნა
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="sm:hidden divide-y">
                    {/* Select All Header */}
                    <div className="p-3 bg-gray-50 flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedAttachments.length === attachments.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAttachments(attachments.map((a) => a.id));
                          } else {
                            setSelectedAttachments([]);
                          }
                        }}
                        className="rounded border-gray-300 w-5 h-5"
                      />
                      <span className="text-sm text-gray-600">ყველას მონიშვნა</span>
                    </div>
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="p-3">
                        <div className="flex gap-3">
                          <input
                            type="checkbox"
                            checked={selectedAttachments.includes(attachment.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAttachments([...selectedAttachments, attachment.id]);
                              } else {
                                setSelectedAttachments(selectedAttachments.filter((id) => id !== attachment.id));
                              }
                            }}
                            className="rounded border-gray-300 w-5 h-5 flex-shrink-0 mt-1"
                          />
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm line-clamp-1">{attachment.title}</p>
                            <p className="text-xs text-gray-500 truncate">{attachment.fileName}</p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                attachment.type === 'material' ? 'bg-blue-100 text-blue-800' :
                                attachment.type === 'assignment' ? 'bg-purple-100 text-purple-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {attachment.type === 'material' ? 'მასალა' :
                                 attachment.type === 'assignment' ? 'დავალება' : 'პასუხი'}
                              </span>
                              <span className="text-xs text-gray-500">{formatBytes(attachment.fileSize)}</span>
                            </div>
                            {attachment.chapter?.title && (
                              <p className="text-xs text-gray-500 mt-1 truncate">
                                <FolderOpen className="w-3 h-3 inline mr-1" />
                                {attachment.chapter.title}
                              </p>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-400">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                {formatDate(attachment.createdAt)}
                              </span>
                              <div className="flex items-center gap-1">
                                <a
                                  href={attachment.filePath}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 text-gray-400 hover:text-primary-600"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                                <button
                                  onClick={() => setDeleteConfirm({ type: 'attachment', ids: [attachment.id] })}
                                  className="p-2 text-gray-400 hover:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={selectedAttachments.length === attachments.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAttachments(attachments.map((a) => a.id));
                                } else {
                                  setSelectedAttachments([]);
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">სახელი</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ტიპი</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">თავი</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ზომა</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">თარიღი</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">მოქმედებები</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {attachments.map((attachment) => (
                          <tr key={attachment.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedAttachments.includes(attachment.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedAttachments([...selectedAttachments, attachment.id]);
                                  } else {
                                    setSelectedAttachments(selectedAttachments.filter((id) => id !== attachment.id));
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900 truncate max-w-[200px]">{attachment.title}</p>
                              <p className="text-xs text-gray-500 truncate">{attachment.fileName}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                attachment.type === 'material' ? 'bg-blue-100 text-blue-800' :
                                attachment.type === 'assignment' ? 'bg-purple-100 text-purple-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {attachment.type === 'material' ? 'მასალა' :
                                 attachment.type === 'assignment' ? 'დავალება' : 'პასუხი'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-[150px]">
                              {attachment.chapter?.title || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {formatBytes(attachment.fileSize)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {formatDate(attachment.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <a
                                  href={attachment.filePath}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 text-gray-400 hover:text-primary-600"
                                  title="ჩამოტვირთვა"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                                <button
                                  onClick={() => setDeleteConfirm({ type: 'attachment', ids: [attachment.id] })}
                                  className="p-2 text-gray-400 hover:text-red-600"
                                  title="წაშლა"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Pagination */}
              {attachmentsPagination.totalPages > 1 && (
                <div className="p-3 sm:p-4 border-t flex items-center justify-between">
                  <p className="text-xs sm:text-sm text-gray-500">
                    <span className="hidden sm:inline">გვერდი </span>{attachmentsPagination.page}/{attachmentsPagination.totalPages}
                    <span className="hidden sm:inline"> (სულ {attachmentsPagination.total})</span>
                  </p>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button
                      onClick={() => setAttachmentPage((p) => Math.max(1, p - 1))}
                      disabled={attachmentPage === 1}
                      className="p-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                    >
                      <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button
                      onClick={() => setAttachmentPage((p) => Math.min(attachmentsPagination.totalPages, p + 1))}
                      disabled={attachmentPage === attachmentsPagination.totalPages}
                      className="p-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                    >
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Images Tab */}
          {activeTab === 'images' && (
            <div>
              {/* Filters */}
              <div className="p-3 sm:p-4 border-b">
                <select
                  value={imageType}
                  onChange={(e) => {
                    setImageType(e.target.value);
                    setImagePage(1);
                  }}
                  className="w-full sm:w-auto px-3 sm:px-4 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                >
                  <option value="">ყველა ტიპი</option>
                  <option value="slider">სლაიდერი</option>
                  <option value="course-thumbnail">კურსის სურათი</option>
                  <option value="quiz-image">ქვიზის სურათი</option>
                  <option value="video-thumbnail">ვიდეო თამბნეილი</option>
                </select>
              </div>

              {/* Images Grid */}
              {imagesLoading ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
              ) : images.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  სურათები არ მოიძებნა
                </div>
              ) : (
                <div className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-4">
                  {images.map((image) => (
                    <div
                      key={image.id}
                      className="relative group bg-gray-100 rounded-lg overflow-hidden aspect-video cursor-pointer"
                      onClick={() => setPreviewImage(image.url)}
                    >
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 sm:transition-opacity flex items-center justify-center">
                        <button className="p-2 bg-white rounded-full">
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-1.5 sm:p-2 bg-gradient-to-t from-black/70 to-transparent">
                        <p className="text-[10px] sm:text-xs text-white truncate">{image.name}</p>
                        <p className="text-[10px] sm:text-xs text-white/70 hidden sm:block">{image.context}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {imagesPagination.totalPages > 1 && (
                <div className="p-3 sm:p-4 border-t flex items-center justify-between">
                  <p className="text-xs sm:text-sm text-gray-500">
                    <span className="hidden sm:inline">გვერდი </span>{imagesPagination.page}/{imagesPagination.totalPages}
                    <span className="hidden sm:inline"> (სულ {imagesPagination.total})</span>
                  </p>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button
                      onClick={() => setImagePage((p) => Math.max(1, p - 1))}
                      disabled={imagePage === 1}
                      className="p-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                    >
                      <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button
                      onClick={() => setImagePage((p) => Math.min(imagesPagination.totalPages, p + 1))}
                      disabled={imagePage === imagesPagination.totalPages}
                      className="p-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                    >
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Orphans Tab */}
          {activeTab === 'orphans' && (
            <div>
              {/* Warning Banner */}
              <div className="p-3 sm:p-4 bg-yellow-50 border-b border-yellow-100">
                <div className="flex items-start gap-2 sm:gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800 text-sm sm:text-base">ობოლი ფაილები</p>
                    <p className="text-xs sm:text-sm text-yellow-700 mt-1">
                      ეს ფაილები R2 storage-ზე არსებობს, მაგრამ მონაცემთა ბაზაში მათზე მითითება არ არის.
                    </p>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="p-3 sm:p-4 border-b space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-4">
                <div className="flex gap-2 sm:gap-4">
                  <select
                    value={orphanPrefix}
                    onChange={(e) => setOrphanPrefix(e.target.value)}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  >
                    <option value="">ყველა პრეფიქსი</option>
                    <option value="courses/">courses/</option>
                    <option value="attachments/">attachments/</option>
                    <option value="sliders/">sliders/</option>
                    <option value="thumbnails/">thumbnails/</option>
                    <option value="quiz-images/">quiz-images/</option>
                  </select>
                  <button
                    onClick={() => refetchOrphans()}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-2 border rounded-lg hover:bg-gray-50 text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span className="hidden sm:inline">განახლება</span>
                  </button>
                </div>
                <div className="flex gap-2 sm:gap-4 items-center">
                  {selectedOrphans.length > 0 && (
                    <button
                      onClick={() => setDeleteConfirm({ type: 'orphan', ids: selectedOrphans })}
                      className="flex items-center gap-2 px-4 py-2.5 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      წაშლა ({selectedOrphans.length})
                    </button>
                  )}
                  {orphanFiles.length > 0 && (
                    <div className="text-xs sm:text-sm text-gray-500 sm:ml-auto">
                      სულ: {orphanFiles.length} ფაილი, {formatBytes(orphansTotalSize)}
                    </div>
                  )}
                </div>
              </div>

              {/* Orphan Files Table/Cards */}
              {orphansLoading ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
              ) : orphanFiles.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                  <p>ობოლი ფაილები არ მოიძებნა</p>
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="sm:hidden divide-y">
                    {/* Select All Header */}
                    <div className="p-3 bg-gray-50 flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedOrphans.length === orphanFiles.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrphans(orphanFiles.map((f) => f.key));
                          } else {
                            setSelectedOrphans([]);
                          }
                        }}
                        className="rounded border-gray-300 w-5 h-5"
                      />
                      <span className="text-sm text-gray-600">ყველას მონიშვნა</span>
                    </div>
                    {orphanFiles.map((file) => (
                      <div key={file.key} className="p-3">
                        <div className="flex gap-3">
                          <input
                            type="checkbox"
                            checked={selectedOrphans.includes(file.key)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrphans([...selectedOrphans, file.key]);
                              } else {
                                setSelectedOrphans(selectedOrphans.filter((k) => k !== file.key));
                              }
                            }}
                            className="rounded border-gray-300 w-5 h-5 flex-shrink-0 mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-mono text-gray-900 break-all line-clamp-2">{file.key}</p>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span>{formatBytes(file.size)}</span>
                                <span>{formatDate(file.lastModified)}</span>
                              </div>
                              <button
                                onClick={() => setDeleteConfirm({ type: 'orphan', ids: [file.key] })}
                                className="p-2 text-gray-400 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={selectedOrphans.length === orphanFiles.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedOrphans(orphanFiles.map((f) => f.key));
                                } else {
                                  setSelectedOrphans([]);
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ზომა</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">თარიღი</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">მოქმედებები</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {orphanFiles.map((file) => (
                          <tr key={file.key} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedOrphans.includes(file.key)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedOrphans([...selectedOrphans, file.key]);
                                  } else {
                                    setSelectedOrphans(selectedOrphans.filter((k) => k !== file.key));
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm font-mono text-gray-900 truncate max-w-[400px]" title={file.key}>
                                {file.key}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {formatBytes(file.size)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {formatDate(file.lastModified)}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => setDeleteConfirm({ type: 'orphan', ids: [file.key] })}
                                className="p-2 text-gray-400 hover:text-red-600"
                                title="წაშლა"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="p-3 sm:p-6">
              {statsLoading ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
              ) : (
                <div className="space-y-6 sm:space-y-8">
                  {/* Processing Status */}
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">ვიდეოების სტატუსი</h3>
                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                      {Object.entries(stats.byStatus).map(([status, data]) => (
                        <div key={status} className="bg-gray-50 rounded-lg p-3 sm:p-4">
                          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                            {status === 'COMPLETED' && <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />}
                            {status === 'PROCESSING' && <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 animate-spin" />}
                            {status === 'PENDING' && <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />}
                            {status === 'FAILED' && <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />}
                            <span className="font-medium text-sm sm:text-base">{getStatusText(status)}</span>
                          </div>
                          <p className="text-xl sm:text-2xl font-bold">{data.count}</p>
                          <p className="text-xs sm:text-sm text-gray-500">{formatBytes(data.size)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Image Breakdown */}
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">სურათების დაყოფა</h3>
                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                      <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                        <p className="text-xs sm:text-sm text-gray-500">სლაიდერები</p>
                        <p className="text-xl sm:text-2xl font-bold">{stats.images.breakdown.sliders}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                        <p className="text-xs sm:text-sm text-gray-500">კურსის სურათები</p>
                        <p className="text-xl sm:text-2xl font-bold">{stats.images.breakdown.courseThumbnails}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                        <p className="text-xs sm:text-sm text-gray-500">ქვიზის სურათები</p>
                        <p className="text-xl sm:text-2xl font-bold">{stats.images.breakdown.quizImages}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                        <p className="text-xs sm:text-sm text-gray-500">ვიდეო თამბნეილები</p>
                        <p className="text-xl sm:text-2xl font-bold">{stats.images.breakdown.videoThumbnails}</p>
                      </div>
                    </div>
                  </div>

                  {/* Recent Uploads */}
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">ბოლო ატვირთვები</h3>
                    <div className="space-y-2 sm:space-y-3">
                      {stats.recentUploads.map((upload) => (
                        <div key={upload.id} className="flex items-start sm:items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <Film className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 flex-shrink-0 mt-0.5 sm:mt-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{upload.name}</p>
                            <p className="text-xs sm:text-sm text-gray-500 truncate">
                              {upload.course} {upload.chapter && `/ ${upload.chapter}`}
                            </p>
                            {/* Mobile: Show size, date and status inline */}
                            <div className="flex items-center gap-2 mt-1.5 sm:hidden flex-wrap">
                              <span className="text-xs text-gray-500">{formatBytes(upload.size)}</span>
                              <span className="text-xs text-gray-400">{formatDate(upload.createdAt)}</span>
                              <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${getStatusColor(upload.status)}`}>
                                {getStatusText(upload.status)}
                              </span>
                            </div>
                          </div>
                          {/* Desktop: Show size, date and status */}
                          <div className="hidden sm:block text-right flex-shrink-0">
                            <p className="text-sm font-medium">{formatBytes(upload.size)}</p>
                            <p className="text-xs text-gray-500">{formatDate(upload.createdAt)}</p>
                          </div>
                          <span className={`hidden sm:inline px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${getStatusColor(upload.status)}`}>
                            {getStatusText(upload.status)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Video Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="relative bg-black rounded-lg overflow-hidden w-full max-w-4xl">
            <button
              onClick={() => setPreviewVideo(null)}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-2 sm:p-4 bg-black/50">
              <p className="text-white font-medium text-sm sm:text-base truncate pr-10">{previewVideo.name}</p>
            </div>
            <video
              src={previewVideo.url}
              controls
              autoPlay
              playsInline
              className="w-full aspect-video"
            />
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-2 sm:p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={previewImage}
            alt=""
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-xl sm:rounded-lg w-full sm:max-w-md p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold">წაშლის დადასტურება</h3>
            </div>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              დარწმუნებული ხართ, რომ გსურთ {deleteConfirm.ids.length}{' '}
              {deleteConfirm.type === 'video' ? 'ვიდეოს' :
               deleteConfirm.type === 'attachment' ? 'მასალის' : 'ფაილის'} წაშლა?
              ეს მოქმედება შეუქცევადია.
            </p>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border rounded-lg hover:bg-gray-50 text-sm"
              >
                გაუქმება
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm.type === 'video') {
                    deleteVideosMutation.mutate(deleteConfirm.ids);
                  } else if (deleteConfirm.type === 'attachment') {
                    deleteAttachmentsMutation.mutate(deleteConfirm.ids);
                  } else {
                    deleteOrphansMutation.mutate(deleteConfirm.ids);
                  }
                }}
                disabled={
                  deleteVideosMutation.isPending ||
                  deleteAttachmentsMutation.isPending ||
                  deleteOrphansMutation.isPending
                }
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {(deleteVideosMutation.isPending ||
                  deleteAttachmentsMutation.isPending ||
                  deleteOrphansMutation.isPending) && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                წაშლა
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

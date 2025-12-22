import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const mediaApi = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true
});

// Request interceptor to add auth token
mediaApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
mediaApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await axios.post(`${API_URL}/api/auth/refresh`, {}, {
          withCredentials: true
        });
        const accessToken = response.data.data.accessToken;
        localStorage.setItem('accessToken', accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return mediaApi(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Types
export interface Video {
  id: string;
  originalName: string;
  originalSize: number;
  mimeType: string;
  duration?: number;
  width?: number;
  height?: number;
  r2Key: string;
  processingStatus: 'PENDING' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  processingProgress?: number;
  createdAt: string;
  chapter?: {
    id: string;
    title: string;
    courseVersion?: {
      id: string;
      version: number;
      course?: {
        id: string;
        title: string;
        slug: string;
      };
    };
  };
  thumbnails?: Array<{
    id: string;
    url: string;
  }>;
}

export interface Attachment {
  id: string;
  title: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  type: string;
  createdAt: string;
  chapter?: {
    id: string;
    title: string;
    courseVersion?: {
      course?: {
        id: string;
        title: string;
      };
    };
  };
}

export interface MediaImage {
  id: string;
  type: 'slider' | 'course-thumbnail' | 'quiz-image' | 'video-thumbnail';
  url: string;
  name: string;
  createdAt: string;
  context?: string;
}

export interface OrphanFile {
  key: string;
  size: number;
  lastModified: string;
}

export interface StorageStats {
  videos: { count: number; totalSize: number };
  attachments: { count: number; totalSize: number };
  images: {
    count: number;
    breakdown: {
      sliders: number;
      courseThumbnails: number;
      quizImages: number;
      videoThumbnails: number;
    };
  };
  total: { count: number; totalSize: number };
  byStatus: Record<string, { count: number; size: number }>;
  recentUploads: Array<{
    id: string;
    name: string;
    size: number;
    status: string;
    createdAt: string;
    course?: string;
    chapter?: string;
  }>;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// API Functions
export const mediaApiClient = {
  // Videos
  getVideos: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    courseId?: string;
    search?: string;
    sortBy?: 'newest' | 'oldest' | 'largest' | 'smallest';
  }) => mediaApi.get('/admin/media/videos', { params }),

  getVideoPreviewUrl: (videoId: string) =>
    mediaApi.get(`/admin/media/videos/${videoId}/preview`),

  bulkDeleteVideos: (videoIds: string[]) =>
    mediaApi.post('/admin/media/videos/bulk-delete', { videoIds }),

  // Attachments
  getAttachments: (params?: {
    page?: number;
    limit?: number;
    type?: 'material' | 'assignment' | 'answer';
    search?: string;
  }) => mediaApi.get('/admin/media/attachments', { params }),

  bulkDeleteAttachments: (attachmentIds: string[]) =>
    mediaApi.post('/admin/media/attachments/bulk-delete', { attachmentIds }),

  // Images
  getImages: (params?: {
    page?: number;
    limit?: number;
    type?: 'slider' | 'course-thumbnail' | 'quiz-image' | 'video-thumbnail';
  }) => mediaApi.get('/admin/media/images', { params }),

  // Statistics
  getStorageStats: () => mediaApi.get('/admin/media/stats'),

  // Courses for filter
  getCoursesForFilter: () => mediaApi.get('/admin/media/courses'),

  // Orphan files
  scanOrphanFiles: (prefix?: string) =>
    mediaApi.get('/admin/media/orphans', { params: { prefix } }),

  deleteOrphanFiles: (keys: string[]) =>
    mediaApi.post('/admin/media/orphans/delete', { keys }),
};

// Helper function to format bytes
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper function to format duration
export function formatDuration(seconds: number): string {
  if (!seconds) return '--:--';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Helper function to get status color
export function getStatusColor(status: string): string {
  switch (status) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'PROCESSING':
    case 'UPLOADING':
      return 'bg-blue-100 text-blue-800';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'FAILED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// Helper function to get status text in Georgian
export function getStatusText(status: string): string {
  switch (status) {
    case 'COMPLETED':
      return 'დასრულებული';
    case 'PROCESSING':
      return 'მუშავდება';
    case 'UPLOADING':
      return 'იტვირთება';
    case 'PENDING':
      return 'მოლოდინში';
    case 'FAILED':
      return 'შეცდომა';
    default:
      return status;
  }
}

export default mediaApiClient;

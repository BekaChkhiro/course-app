import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Log environment configuration
console.log('🌍 Admin API Environment Configuration:');
console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
console.log('API_URL (used):', API_URL);
console.log('---');

const adminApi = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true
});

// Request interceptor to add auth token
adminApi.interceptors.request.use(
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
adminApi.interceptors.response.use(
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
        return adminApi(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// File Upload APIs
export const uploadApi = {
  thumbnail: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return adminApi.post('/upload/thumbnail', formData);
  },
  video: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return adminApi.post('/upload/video', formData);
  },
  assignment: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return adminApi.post('/upload/assignment', formData);
  },
  answer: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return adminApi.post('/upload/answer', formData);
  },
  media: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return adminApi.post('/upload/media', formData);
  }
};

// Category APIs
export const categoryApi = {
  getAll: (params?: { includeChildren?: boolean }) =>
    adminApi.get('/categories', { params }),
  getById: (id: string) => adminApi.get(`/categories/${id}`),
  create: (data: any) => adminApi.post('/categories', data),
  update: (id: string, data: any) => adminApi.put(`/categories/${id}`, data),
  delete: (id: string) => adminApi.delete(`/categories/${id}`),
  reorder: (categories: { id: string; order: number }[]) =>
    adminApi.post('/categories/reorder', { categories })
};

// Course APIs
export const courseApi = {
  getAll: (params?: any) => adminApi.get('/courses', { params }),
  getById: (id: string) => adminApi.get(`/courses/${id}`),
  getStats: (id: string) => adminApi.get(`/courses/${id}/stats`),
  create: (data: any) => adminApi.post('/courses', data),
  update: (id: string, data: any) => adminApi.put(`/courses/${id}`, data),
  delete: (id: string) => adminApi.delete(`/courses/${id}`),
  duplicate: (id: string, data: { title: string; slug: string }) =>
    adminApi.post(`/courses/${id}/duplicate`, data),
  bulkUpdateStatus: (courseIds: string[], status: string) =>
    adminApi.post('/courses/bulk/update-status', { courseIds, status }),
  exportCSV: (params?: any) =>
    adminApi.get('/courses/export/csv', { params, responseType: 'blob' })
};

// Chapter APIs
export const chapterApi = {
  getByVersion: (versionId: string) => adminApi.get(`/chapters/version/${versionId}`),
  getById: (id: string) => adminApi.get(`/chapters/${id}`),
  create: (data: any) => adminApi.post('/chapters', data),
  update: (id: string, data: any) => adminApi.put(`/chapters/${id}`, data),
  delete: (id: string) => adminApi.delete(`/chapters/${id}`),
  reorder: (chapters: { id: string; order: number }[]) =>
    adminApi.post('/chapters/reorder', { chapters }),
  bulkDelete: (chapterIds: string[]) =>
    adminApi.post('/chapters/bulk/delete', { chapterIds }),
  toggleFree: (id: string) => adminApi.patch(`/chapters/${id}/toggle-free`)
};

// Version APIs
export const versionApi = {
  getByCourse: (courseId: string) => adminApi.get(`/versions/course/${courseId}`),
  getById: (id: string) => adminApi.get(`/versions/${id}`),
  create: (data: any) => adminApi.post('/versions', data),
  update: (id: string, data: any) => adminApi.put(`/versions/${id}`, data),
  delete: (id: string) => adminApi.delete(`/versions/${id}`),
  activate: (id: string) => adminApi.post(`/versions/${id}/activate`),
  compare: (version1Id: string, version2Id: string) =>
    adminApi.get('/versions/compare', { params: { version1Id, version2Id } })
};

// Analytics APIs
export const analyticsApi = {
  getDashboard: (params?: { period?: number }) =>
    adminApi.get('/analytics/dashboard', { params }),
  getRevenue: (params?: any) => adminApi.get('/analytics/revenue', { params }),
  getStudents: (params?: { period?: number }) =>
    adminApi.get('/analytics/students', { params }),
  getCourse: (courseId: string) => adminApi.get(`/analytics/course/${courseId}`)
};

// Review APIs (Admin)
export const reviewApi = {
  getAll: (params?: {
    status?: string;
    courseId?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
  }) => adminApi.get('/admin/reviews', { params }),
  getPending: (params?: { page?: number; limit?: number }) =>
    adminApi.get('/admin/reviews/pending', { params }),
  getAnalytics: (params?: { startDate?: string; endDate?: string }) =>
    adminApi.get('/admin/reviews/analytics', { params }),
  approve: (reviewId: string) =>
    adminApi.post(`/admin/reviews/${reviewId}/approve`),
  reject: (reviewId: string, reason: string) =>
    adminApi.post(`/admin/reviews/${reviewId}/reject`, { reason }),
  flag: (reviewId: string, reason: string) =>
    adminApi.post(`/admin/reviews/${reviewId}/flag`, { reason }),
  bulkModerate: (reviewIds: string[], action: 'approve' | 'reject' | 'flag', reason?: string) =>
    adminApi.post('/admin/reviews/bulk-moderate', { reviewIds, action, reason }),
  addResponse: (reviewId: string, content: string) =>
    adminApi.post(`/admin/reviews/${reviewId}/response`, { content }),
  deleteResponse: (reviewId: string) =>
    adminApi.delete(`/admin/reviews/${reviewId}/response`)
};

// Messaging APIs (Admin)
export const messagingApi = {
  getAll: (params?: {
    status?: string;
    priority?: string;
    assignedToId?: string;
    courseId?: string;
    unassigned?: boolean;
    search?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
  }) => adminApi.get('/admin/messages', { params }),
  getMessage: (messageId: string) => adminApi.get(`/messages/${messageId}`),
  addReply: (messageId: string, content: string, isInternal?: boolean, attachmentUrl?: string) =>
    adminApi.post(`/messages/${messageId}/replies`, { content, isInternal, attachmentUrl }),
  assign: (messageId: string, assignedToId: string | null) =>
    adminApi.post(`/admin/messages/${messageId}/assign`, { assignedToId }),
  updateStatus: (messageId: string, status: string) =>
    adminApi.post(`/admin/messages/${messageId}/status`, { status }),
  updatePriority: (messageId: string, priority: string) =>
    adminApi.post(`/admin/messages/${messageId}/priority`, { priority }),
  updateNotes: (messageId: string, notes: string) =>
    adminApi.put(`/admin/messages/${messageId}/notes`, { notes }),
  bulkUpdateStatus: (messageIds: string[], status: string) =>
    adminApi.post('/admin/messages/bulk-status', { messageIds, status }),
  bulkAssign: (messageIds: string[], assignedToId: string | null) =>
    adminApi.post('/admin/messages/bulk-assign', { messageIds, assignedToId }),
  getAnalytics: (params?: { startDate?: string; endDate?: string }) =>
    adminApi.get('/admin/messages/analytics', { params }),
  getTeamPerformance: (params?: { startDate?: string; endDate?: string }) =>
    adminApi.get('/admin/messages/team-performance', { params })
};

// Canned Responses APIs (Admin)
export const cannedResponseApi = {
  getAll: (category?: string) =>
    adminApi.get('/admin/canned-responses', { params: { category } }),
  create: (data: { title: string; content: string; category?: string; shortcut?: string }) =>
    adminApi.post('/admin/canned-responses', data),
  update: (id: string, data: { title?: string; content?: string; category?: string; shortcut?: string; isActive?: boolean }) =>
    adminApi.put(`/admin/canned-responses/${id}`, data),
  delete: (id: string) => adminApi.delete(`/admin/canned-responses/${id}`)
};

export default adminApi;

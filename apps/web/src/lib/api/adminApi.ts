import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api-production-6b6d.up.railway.app';

const adminApi = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true
});

// Request interceptor to add auth token
adminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    console.log('🔐 [API Request]', {
      url: config.url,
      method: config.method,
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'NO TOKEN'
    });
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
adminApi.interceptors.response.use(
  (response) => {
    console.log('✅ [API Response]', {
      url: response.config.url,
      status: response.status
    });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    console.log('❌ [API Error]', {
      url: originalRequest.url,
      status: error.response?.status,
      message: error.message,
      retry: originalRequest._retry
    });

    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log('🔄 [Token Refresh] Attempting to refresh token...');
      originalRequest._retry = true;

      try {
        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, {}, {
          withCredentials: true
        });
        console.log('✅ [Token Refresh] Success! New token received');
        localStorage.setItem('accessToken', data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return adminApi(originalRequest);
      } catch (refreshError) {
        console.log('❌ [Token Refresh] Failed! Redirecting to login...', refreshError);
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

export default adminApi;

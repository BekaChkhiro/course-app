import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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
  },
  quizImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return adminApi.post('/upload/quiz-image', formData);
  },
  sliderImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return adminApi.post('/upload/slider-image', formData);
  }
};

// Video APIs (for database storage with R2)
export const videoApi = {
  upload: (file: File, chapterId: string, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('chapterId', chapterId);
    return adminApi.post('/videos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      }
    });
  },
  getStatus: (videoId: string) => adminApi.get(`/videos/${videoId}/status`),
  delete: (videoId: string) => adminApi.delete(`/videos/${videoId}`),
  replace: (videoId: string, file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('video', file);
    return adminApi.put(`/videos/${videoId}/replace`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      }
    });
  },
  getByChapter: (chapterId: string) => adminApi.get(`/chapters/${chapterId}/videos`)
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
  publish: (id: string) => adminApi.post(`/versions/${id}/publish`),
  createDraftCopy: (id: string) => adminApi.post(`/versions/${id}/draft-copy`),
  compare: (version1Id: string, version2Id: string) =>
    adminApi.get('/versions/compare', { params: { version1Id, version2Id } })
};

// Analytics APIs (Legacy)
export const analyticsApi = {
  getDashboard: (params?: { period?: number }) =>
    adminApi.get('/analytics/dashboard', { params }),
  getRevenue: (params?: any) => adminApi.get('/analytics/revenue', { params }),
  getStudents: (params?: { period?: number }) =>
    adminApi.get('/analytics/students', { params }),
  getCourse: (courseId: string) => adminApi.get(`/analytics/course/${courseId}`),
  // Consolidated analytics for unified dashboard
  getConsolidated: (params?: { period?: number }) =>
    adminApi.get('/analytics/consolidated', { params })
};

// Comprehensive Analytics APIs
export const comprehensiveAnalyticsApi = {
  // Dashboard
  getDashboardOverview: (params?: { period?: number }) =>
    adminApi.get('/admin/analytics/dashboard', { params }),
  getRevenueTrend: (params?: { months?: number }) =>
    adminApi.get('/admin/analytics/dashboard/revenue-trend', { params }),
  getTopCourses: (params?: { limit?: number }) =>
    adminApi.get('/admin/analytics/dashboard/top-courses', { params }),

  // Revenue
  getRevenueAnalytics: (params?: { startDate?: string; endDate?: string; groupBy?: 'day' | 'week' | 'month' }) =>
    adminApi.get('/admin/analytics/revenue', { params }),
  getRecurringRevenue: () =>
    adminApi.get('/admin/analytics/revenue/recurring'),
  getCustomerLifetimeValue: () =>
    adminApi.get('/admin/analytics/revenue/clv'),
  getConversionRates: (params?: { period?: number }) =>
    adminApi.get('/admin/analytics/revenue/conversion', { params }),

  // Students
  getStudentAnalytics: (params?: { period?: number }) =>
    adminApi.get('/admin/analytics/students', { params }),
  getCohortRetention: () =>
    adminApi.get('/admin/analytics/students/cohorts'),

  // Courses
  getAllCoursesPerformance: () =>
    adminApi.get('/admin/analytics/courses'),
  getCoursePerformance: (courseId: string) =>
    adminApi.get(`/admin/analytics/courses/${courseId}`),

  // Learning
  getLearningAnalytics: (params?: { period?: number }) =>
    adminApi.get('/admin/analytics/learning', { params }),

  // Engagement
  getEngagementMetrics: (params?: { period?: number }) =>
    adminApi.get('/admin/analytics/engagement', { params }),

  // Real-time
  getRealtimeActivity: () =>
    adminApi.get('/admin/analytics/realtime'),
  getLiveUsers: () =>
    adminApi.get('/admin/analytics/realtime/users'),

  // Custom Reports
  createReport: (data: any) =>
    adminApi.post('/admin/analytics/reports', data),
  createCustomReport: (data: any) =>
    adminApi.post('/admin/analytics/reports', data),
  getUserReports: () =>
    adminApi.get('/admin/analytics/reports'),
  getCustomReports: () =>
    adminApi.get('/admin/analytics/reports'),
  getReportTemplates: () =>
    adminApi.get('/admin/analytics/reports/templates'),
  updateReport: (reportId: string, data: any) =>
    adminApi.put(`/admin/analytics/reports/${reportId}`, data),
  updateCustomReport: (reportId: string, data: any) =>
    adminApi.put(`/admin/analytics/reports/${reportId}`, data),
  deleteReport: (reportId: string) =>
    adminApi.delete(`/admin/analytics/reports/${reportId}`),
  deleteCustomReport: (reportId: string) =>
    adminApi.delete(`/admin/analytics/reports/${reportId}`),
  runCustomReport: (reportId: string) =>
    adminApi.post(`/admin/analytics/reports/${reportId}/run`),

  // Exports
  createExportJob: (data: { exportType: string; reportType: string; filters?: any; startDate?: string; endDate?: string }) =>
    adminApi.post('/admin/analytics/export', data),
  getExportJobs: () =>
    adminApi.get('/admin/analytics/export'),
  exportRevenue: (params: { startDate: string; endDate: string }) =>
    adminApi.get('/admin/analytics/export/revenue', { params, responseType: 'blob' }),
  exportStudents: () =>
    adminApi.get('/admin/analytics/export/students', { responseType: 'blob' }),
  exportCourses: () =>
    adminApi.get('/admin/analytics/export/courses', { responseType: 'blob' }),

  // Predictive Analytics
  getPredictiveAnalytics: (params?: { period?: number }) =>
    adminApi.get('/admin/analytics/predictive', { params }),
  getChurnPrediction: () =>
    adminApi.get('/admin/analytics/predictive/churn'),
  getRevenueForecast: (params?: { months?: number }) =>
    adminApi.get('/admin/analytics/predictive/revenue-forecast', { params }),
  getDemandPrediction: () =>
    adminApi.get('/admin/analytics/predictive/demand')
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

// Attachment APIs (Chapter files)
export const attachmentApi = {
  upload: (formData: FormData) =>
    adminApi.post('/attachments/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  getByChapter: (chapterId: string, type?: string) =>
    adminApi.get(`/attachments/chapter/${chapterId}${type ? `?type=${type}` : ''}`),
  update: (id: string, data: { title?: string; description?: string }) =>
    adminApi.put(`/attachments/${id}`, data),
  delete: (id: string) =>
    adminApi.delete(`/attachments/${id}`),
  reorder: (chapterId: string, attachmentIds: string[]) =>
    adminApi.put(`/attachments/chapter/${chapterId}/reorder`, { attachmentIds })
};

// FAQ APIs (Admin)
export const faqApi = {
  getAll: () => adminApi.get('/faqs'),
  getById: (id: string) => adminApi.get(`/faqs/${id}`),
  create: (data: { question: string; answer: string; category?: string; order?: number; isActive?: boolean }) =>
    adminApi.post('/faqs', data),
  update: (id: string, data: { question?: string; answer?: string; category?: string; order?: number; isActive?: boolean }) =>
    adminApi.put(`/faqs/${id}`, data),
  delete: (id: string) => adminApi.delete(`/faqs/${id}`),
  reorder: (faqs: { id: string; order: number }[]) =>
    adminApi.post('/faqs/reorder', { faqs }),
  toggle: (id: string) => adminApi.patch(`/faqs/${id}/toggle`),
  getCategories: () => adminApi.get('/faqs/categories')
};

// Slider APIs (Admin)
export const sliderApi = {
  getAll: () => adminApi.get('/sliders'),
  getById: (id: string) => adminApi.get(`/sliders/${id}`),
  create: (data: { imageUrl: string; linkUrl?: string; order?: number; isActive?: boolean }) =>
    adminApi.post('/sliders', data),
  update: (id: string, data: { imageUrl?: string; linkUrl?: string; order?: number; isActive?: boolean }) =>
    adminApi.put(`/sliders/${id}`, data),
  delete: (id: string) => adminApi.delete(`/sliders/${id}`),
  reorder: (sliders: { id: string; order: number }[]) =>
    adminApi.post('/sliders/reorder', { sliders }),
  toggle: (id: string) => adminApi.patch(`/sliders/${id}/toggle`)
};

// Instructor APIs (Admin)
export const instructorApi = {
  getAll: () => adminApi.get('/instructors'),
  getById: (id: string) => adminApi.get(`/instructors/${id}`),
  create: (data: {
    firstName: string;
    lastName: string;
    slug: string;
    profession: string;
    bio?: string;
    avatar?: string;
    email?: string;
    facebook?: string;
    linkedin?: string;
    order?: number;
    isActive?: boolean;
  }) => adminApi.post('/instructors', data),
  update: (id: string, data: {
    firstName?: string;
    lastName?: string;
    slug?: string;
    profession?: string;
    bio?: string;
    avatar?: string;
    email?: string;
    facebook?: string;
    linkedin?: string;
    order?: number;
    isActive?: boolean;
  }) => adminApi.put(`/instructors/${id}`, data),
  delete: (id: string) => adminApi.delete(`/instructors/${id}`),
  reorder: (instructors: { id: string; order: number }[]) =>
    adminApi.post('/instructors/reorder', { instructors }),
  toggle: (id: string) => adminApi.patch(`/instructors/${id}/toggle`)
};

// Students APIs (Admin)
export const studentsApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'active' | 'blocked' | 'deleted' | 'all';
    sortBy?: 'newest' | 'oldest' | 'name' | 'email';
  }) => adminApi.get('/admin/students', { params }),

  getById: (studentId: string) => adminApi.get(`/admin/students/${studentId}`),

  toggleActive: (studentId: string, reason?: string) =>
    adminApi.post(`/admin/students/${studentId}/toggle-active`, { reason }),

  delete: (studentId: string) => adminApi.delete(`/admin/students/${studentId}`),

  restore: (studentId: string) =>
    adminApi.post(`/admin/students/${studentId}/restore`),

  sendEmail: (studentId: string, subject: string, content: string) =>
    adminApi.post(`/admin/students/${studentId}/send-email`, { subject, content }),

  refundPurchase: (studentId: string, purchaseId: string, reason?: string) =>
    adminApi.post(`/admin/students/${studentId}/purchases/${purchaseId}/refund`, { reason }),

  revokeDevice: (studentId: string, sessionId: string) =>
    adminApi.delete(`/admin/students/${studentId}/devices/${sessionId}`),

  resendVerification: (studentId: string) =>
    adminApi.post(`/admin/students/${studentId}/resend-verification`),

  getAnalytics: () => adminApi.get('/admin/students/analytics/overview'),
};

// Promo Code APIs
export interface PromoCodeFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | 'active' | 'inactive' | 'expired' | 'upcoming';
  scope?: 'all' | 'ALL' | 'COURSE' | 'CATEGORY';
}

export interface CreatePromoCodeData {
  code: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  scope: 'ALL' | 'COURSE' | 'CATEGORY';
  courseId?: string;
  categoryId?: string;
  singleUsePerUser?: boolean;
  minOrderAmount?: number;
  maxUses?: number;
  validFrom: string;
  validUntil: string;
  isActive?: boolean;
}

export interface UpdatePromoCodeData extends Partial<CreatePromoCodeData> {
  id?: string;
}

export const promoCodeApi = {
  // Get all promo codes with filters
  getAll: (filters: PromoCodeFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.scope) params.append('scope', filters.scope);
    return adminApi.get(`/promo-codes/admin?${params.toString()}`);
  },

  // Get single promo code by ID
  getById: (id: string) => adminApi.get(`/promo-codes/admin/${id}`),

  // Create new promo code
  create: (data: CreatePromoCodeData) => adminApi.post('/promo-codes/admin', data),

  // Update promo code
  update: (id: string, data: UpdatePromoCodeData) =>
    adminApi.put(`/promo-codes/admin/${id}`, data),

  // Delete promo code
  delete: (id: string) => adminApi.delete(`/promo-codes/admin/${id}`),

  // Toggle promo code active status
  toggle: (id: string) => adminApi.patch(`/promo-codes/admin/${id}/toggle`),

  // Get options for dropdowns (courses and categories)
  getOptions: () => adminApi.get('/promo-codes/admin/options'),

  // Get promo code analytics
  getAnalytics: () => adminApi.get('/promo-codes/admin/analytics'),

  // Validate promo code (for checkout)
  validate: (code: string, courseId: string) =>
    adminApi.post('/promo-codes/validate', { code, courseId }),
};

export default adminApi;

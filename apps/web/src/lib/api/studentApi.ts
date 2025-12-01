import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const studentApi = axios.create({
  baseURL: `${API_URL}/api/student`,
  withCredentials: true,
});

// Request interceptor to add auth token
studentApi.interceptors.request.use(
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
studentApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await axios.post(
          `${API_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const accessToken = response.data.data.accessToken;
        localStorage.setItem('accessToken', accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return studentApi(originalRequest);
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
export interface DashboardStats {
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  totalChaptersCompleted: number;
  totalWatchTimeHours: number;
  certificates: number;
}

export interface ContinueLearningCourse {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  category: string;
  totalChapters: number;
  completedChapters: number;
  progressPercentage: number;
  lastAccessedAt: string | null;
  nextChapter: {
    id: string;
    title: string;
    order: number;
  } | null;
  purchasedAt: string;
}

export interface StudyStreak {
  currentStreak: number;
  longestStreak: number;
  totalStudyDays: number;
}

export interface Gamification {
  level: number;
  totalXP: number;
  xpToNextLevel: number;
  recentBadges: {
    id: string;
    name: string;
    icon: string;
    earnedAt: string;
  }[];
}

export interface DashboardData {
  stats: DashboardStats;
  continueLearning: ContinueLearningCourse[];
  studyStreak: StudyStreak;
  gamification: Gamification;
}

export interface MyCourse {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  author: {
    id: string;
    name: string;
    surname: string;
    avatar: string | null;
  };
  totalChapters: number;
  completedChapters: number;
  progressPercentage: number;
  lastAccessedAt: string | null;
  purchasedAt: string;
  status: 'completed' | 'in_progress' | 'not_started';
}

export interface ChapterProgress {
  id: string;
  title: string;
  description: string | null;
  order: number;
  isFree: boolean;
  hasVideo: boolean;
  hasTheory: boolean;
  hasAssignment: boolean;
  hasQuiz: boolean;
  videoDuration: number | null;
  progress: {
    isCompleted: boolean;
    watchPercentage: number;
    lastPosition: number;
  };
}

export interface CourseForLearning {
  course: {
    id: string;
    title: string;
    slug: string;
    description: string;
    thumbnail: string | null;
    category: {
      id: string;
      name: string;
      slug: string;
    };
    author: {
      id: string;
      name: string;
      surname: string;
      avatar: string | null;
    };
  };
  versionId: string;
  chapters: ChapterProgress[];
  progress: {
    completedChapters: number;
    totalChapters: number;
    overallProgress: number;
  };
  finalExam: {
    id: string;
    title: string;
    type: string;
    passingScore: number;
    timeLimit: number | null;
    lockUntilChaptersComplete: boolean;
    isUnlocked: boolean;
  } | null;
  certificate: {
    id: string;
    certificateNumber: string;
    issuedAt: string;
    pdfUrl: string | null;
  } | null;
}

export interface ChapterForLearning {
  chapter: {
    id: string;
    title: string;
    description: string | null;
    order: number;
    theory: string | null;
    assignmentFile: string | null;
    answerFile: string | null;
    video: {
      id: string;
      duration: number | null;
      hlsMasterUrl: string | null;
    } | null;
    quiz: {
      id: string;
      title: string;
      type: string;
      passingScore: number;
      timeLimit: number | null;
      questionCount: number;
    } | null;
  };
  progress: {
    isCompleted: boolean;
    watchPercentage: number;
    lastPosition: number;
    canSkipAhead: boolean;
  };
  notes: Note[];
  bookmarks: Bookmark[];
  courseInfo: {
    id: string;
    title: string;
    slug: string;
  };
}

export interface Transaction {
  id: string;
  course: {
    id: string;
    title: string;
    slug: string;
    thumbnail: string | null;
  };
  originalAmount: number;
  finalAmount: number;
  discount: {
    code: string;
    percentage: number;
  } | null;
  status: string;
  paymentId: string | null;
  purchasedAt: string;
}

export interface Certificate {
  id: string;
  certificateNumber: string;
  studentName: string;
  courseName: string;
  quizTitle: string;
  score: number;
  completionDate: string;
  issuedAt: string;
  pdfUrl: string | null;
}

export interface UserPreferences {
  id: string;
  emailNotifications: boolean;
  progressReminders: boolean;
  weeklyReports: boolean;
  reminderTime: string | null;
  reminderDays: string[];
  theme: string;
  language: string;
}

export interface Note {
  id: string;
  chapterId: string;
  content: string;
  highlightedText: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  chapter?: {
    id: string;
    title: string;
    order: number;
  };
}

export interface Bookmark {
  id: string;
  chapterId: string;
  videoId: string | null;
  timestamp: number | null;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  chapter?: {
    id: string;
    title: string;
    order: number;
  };
}

// API Functions
export const studentApiClient = {
  // Dashboard
  getDashboard: async (): Promise<{ success: boolean; data: DashboardData }> => {
    const response = await studentApi.get('/dashboard');
    return response.data;
  },

  // My Courses
  getMyCourses: async (params?: {
    filter?: string;
    sort?: string;
    search?: string;
  }): Promise<{ success: boolean; data: { courses: MyCourse[]; total: number } }> => {
    const response = await studentApi.get('/courses', { params });
    return response.data;
  },

  // Course for Learning
  getCourseForLearning: async (
    courseSlug: string
  ): Promise<{ success: boolean; data: CourseForLearning }> => {
    const response = await studentApi.get(`/courses/${courseSlug}/learn`);
    return response.data;
  },

  // Chapter for Learning
  getChapterForLearning: async (
    chapterId: string
  ): Promise<{ success: boolean; data: ChapterForLearning }> => {
    const response = await studentApi.get(`/chapters/${chapterId}`);
    return response.data;
  },

  // Transaction History
  getTransactionHistory: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    data: {
      transactions: Transaction[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
      summary: {
        totalPurchases: number;
        totalSpent: number;
      };
    };
  }> => {
    const response = await studentApi.get('/transactions', { params });
    return response.data;
  },

  // Certificates
  getCertificates: async (): Promise<{
    success: boolean;
    data: { certificates: Certificate[] };
  }> => {
    const response = await studentApi.get('/certificates');
    return response.data;
  },

  // Preferences
  getPreferences: async (): Promise<{
    success: boolean;
    data: { preferences: UserPreferences };
  }> => {
    const response = await studentApi.get('/preferences');
    return response.data;
  },

  updatePreferences: async (
    preferences: Partial<UserPreferences>
  ): Promise<{ success: boolean; data: { preferences: UserPreferences } }> => {
    const response = await studentApi.put('/preferences', preferences);
    return response.data;
  },

  // Notes
  saveNote: async (data: {
    chapterId: string;
    content: string;
    highlightedText?: string;
    color?: string;
    noteId?: string;
  }): Promise<{ success: boolean; data: { note: Note } }> => {
    const response = await studentApi.post('/notes', data);
    return response.data;
  },

  deleteNote: async (noteId: string): Promise<{ success: boolean }> => {
    const response = await studentApi.delete(`/notes/${noteId}`);
    return response.data;
  },

  getCourseNotes: async (
    courseId: string
  ): Promise<{ success: boolean; data: { notes: Note[] } }> => {
    const response = await studentApi.get(`/courses/${courseId}/notes`);
    return response.data;
  },

  // Bookmarks
  createBookmark: async (data: {
    chapterId: string;
    videoId?: string;
    timestamp?: number;
    title: string;
    description?: string;
  }): Promise<{ success: boolean; data: { bookmark: Bookmark } }> => {
    const response = await studentApi.post('/bookmarks', data);
    return response.data;
  },

  deleteBookmark: async (bookmarkId: string): Promise<{ success: boolean }> => {
    const response = await studentApi.delete(`/bookmarks/${bookmarkId}`);
    return response.data;
  },

  getCourseBookmarks: async (
    courseId: string
  ): Promise<{ success: boolean; data: { bookmarks: Bookmark[] } }> => {
    const response = await studentApi.get(`/courses/${courseId}/bookmarks`);
    return response.data;
  },

  // Reviews
  canReview: async (courseId: string): Promise<{
    success: boolean;
    data: {
      canReview: boolean;
      reason?: string;
      completionPercentage: number;
      hasExistingReview: boolean;
    };
  }> => {
    const response = await axios.get(`${API_URL}/api/courses/${courseId}/can-review`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    });
    return response.data;
  },

  createReview: async (
    courseId: string,
    data: {
      rating: number;
      title?: string;
      comment?: string;
      pros?: string;
      cons?: string;
      wouldRecommend?: boolean;
      isAnonymous?: boolean;
    }
  ): Promise<{ success: boolean; data: any; message: string }> => {
    const response = await axios.post(`${API_URL}/api/courses/${courseId}/reviews`, data, {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    });
    return response.data;
  },

  updateReview: async (
    reviewId: string,
    data: {
      rating?: number;
      title?: string;
      comment?: string;
      pros?: string;
      cons?: string;
      wouldRecommend?: boolean;
      isAnonymous?: boolean;
    }
  ): Promise<{ success: boolean; data: any; message: string }> => {
    const response = await axios.put(`${API_URL}/api/reviews/${reviewId}`, data, {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    });
    return response.data;
  },

  deleteReview: async (reviewId: string): Promise<{ success: boolean; message: string }> => {
    const response = await axios.delete(`${API_URL}/api/reviews/${reviewId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    });
    return response.data;
  },

  getCourseReviews: async (
    courseId: string,
    params?: { sortBy?: string; page?: number; limit?: number; rating?: number }
  ): Promise<{
    success: boolean;
    data: {
      reviews: any[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    };
  }> => {
    const response = await axios.get(`${API_URL}/api/courses/${courseId}/reviews`, { params });
    return response.data;
  },

  getCourseReviewStats: async (
    courseId: string
  ): Promise<{
    success: boolean;
    data: {
      averageRating: number;
      totalReviews: number;
      ratingDistribution: { [key: number]: number };
      wouldRecommendPercentage: number;
    };
  }> => {
    const response = await axios.get(`${API_URL}/api/courses/${courseId}/reviews/stats`);
    return response.data;
  },

  voteReview: async (
    reviewId: string,
    isHelpful: boolean
  ): Promise<{ success: boolean; message: string }> => {
    const response = await axios.post(
      `${API_URL}/api/reviews/${reviewId}/vote`,
      { isHelpful },
      { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }
    );
    return response.data;
  },

  removeVote: async (reviewId: string): Promise<{ success: boolean; message: string }> => {
    const response = await axios.delete(`${API_URL}/api/reviews/${reviewId}/vote`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    });
    return response.data;
  },

  getMyReviews: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: any }> => {
    const response = await axios.get(`${API_URL}/api/my-reviews`, {
      params,
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    });
    return response.data;
  },

  // Messages
  sendMessage: async (data: {
    subject: string;
    content: string;
    courseId?: string;
    attachmentUrl?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  }): Promise<{ success: boolean; data: any; message: string }> => {
    const response = await axios.post(`${API_URL}/api/messages`, data, {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    });
    return response.data;
  },

  getMyMessages: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: any }> => {
    const response = await axios.get(`${API_URL}/api/messages`, {
      params,
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    });
    return response.data;
  },

  getMessage: async (messageId: string): Promise<{ success: boolean; data: any }> => {
    const response = await axios.get(`${API_URL}/api/messages/${messageId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    });
    return response.data;
  },

  replyToMessage: async (
    messageId: string,
    content: string,
    attachmentUrl?: string
  ): Promise<{ success: boolean; data: any; message: string }> => {
    const response = await axios.post(
      `${API_URL}/api/messages/${messageId}/replies`,
      { content, attachmentUrl },
      { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }
    );
    return response.data;
  },

  deleteMessage: async (messageId: string): Promise<{ success: boolean; message: string }> => {
    const response = await axios.delete(`${API_URL}/api/messages/${messageId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    });
    return response.data;
  },

  getUnreadMessageCount: async (): Promise<{ success: boolean; data: { count: number } }> => {
    const response = await axios.get(`${API_URL}/api/messages/unread-count`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    });
    return response.data;
  },
};

export default studentApi;

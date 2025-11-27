import apiClient from './authApi';

// TypeScript Interfaces
export enum QuestionType {
  SINGLE_CHOICE = 'SINGLE_CHOICE',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
}

export enum QuizType {
  CHAPTER_QUIZ = 'CHAPTER_QUIZ',
  FINAL_EXAM = 'FINAL_EXAM',
  PRACTICE_QUIZ = 'PRACTICE_QUIZ',
}

export enum QuizAttemptStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED',
  TIME_EXPIRED = 'TIME_EXPIRED',
}

export interface QuizAnswer {
  id: string;
  answer: string;
  answerImage?: string;
  isCorrect: boolean;
  order: number;
}

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  questionImage?: string;
  explanation?: string;
  points: number;
  order: number;
  category?: string;
  tags: string[];
  difficulty?: string;
  answers: QuizAnswer[];
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  type: QuizType;
  chapterContentId?: string;
  passingScore: number;
  totalPoints: number;
  showScore: boolean;
  showCorrectAnswers: boolean;
  showExplanations: boolean;
  maxAttempts?: number;
  timeLimit?: number;
  oneQuestionPerPage: boolean;
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  showProgressBar: boolean;
  preventTabSwitch: boolean;
  preventCopyPaste: boolean;
  logAttemptDetails: boolean;
  requireFullscreen: boolean;
  lockUntilChaptersComplete: boolean;
  generateCertificate: boolean;
  requirePassing: boolean;
  questions?: QuizQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  quizId: string;
  attemptNumber: number;
  status: QuizAttemptStatus;
  score?: number;
  pointsEarned?: number;
  totalPoints?: number;
  passed?: boolean;
  startedAt: string;
  completedAt?: string;
  timeSpent?: number;
  timeRemaining?: number;
  currentQuestionIndex: number;
  questionsAnswered: number;
  markedForReview: string[];
  tabSwitchCount: number;
  copyPasteCount: number;
  lastSavedAt?: string;
  quiz?: Quiz;
  responses?: QuizResponse[];
  certificate?: Certificate;
}

export interface QuizResponse {
  id: string;
  attemptId: string;
  questionId: string;
  answerIds: string[];
  isCorrect?: boolean;
  pointsEarned: number;
  timeSpent?: number;
  question?: QuizQuestion;
}

export interface Certificate {
  id: string;
  certificateNumber: string;
  studentName: string;
  courseName: string;
  quizTitle: string;
  score: number;
  completionDate: string;
  pdfUrl?: string;
}

export interface QuizAnalytics {
  id: string;
  quizId: string;
  date: string;
  totalAttempts: number;
  completedAttempts: number;
  averageScore?: number;
  passRate?: number;
  averageTime?: number;
  questionStats?: any;
}

// Use the shared apiClient which has token refresh logic built-in

// Admin API - Quiz Management
export const quizApi = {
  // Create quiz
  async create(data: Partial<Quiz>) {
    const response = await apiClient.post('/quizzes', data);
    return response.data;
  },

  // Get quiz by ID
  async getById(quizId: string, includeQuestions = true) {
    const response = await apiClient.get(`/quizzes/${quizId}`, {
      params: { includeQuestions },
    });
    return response.data;
  },

  // Update quiz
  async update(quizId: string, data: Partial<Quiz>) {
    const response = await apiClient.put(`/quizzes/${quizId}`, data);
    return response.data;
  },

  // Delete quiz
  async delete(quizId: string) {
    const response = await apiClient.delete(`/quizzes/${quizId}`);
    return response.data;
  },

  // Add question
  async addQuestion(quizId: string, data: Partial<QuizQuestion>) {
    const response = await apiClient.post(`/quizzes/${quizId}/questions`, data);
    return response.data;
  },

  // Update question
  async updateQuestion(questionId: string, data: Partial<QuizQuestion>) {
    const response = await apiClient.put(`/quizzes/questions/${questionId}`, data);
    return response.data;
  },

  // Delete question
  async deleteQuestion(questionId: string) {
    const response = await apiClient.delete(`/quizzes/questions/${questionId}`);
    return response.data;
  },

  // Import questions from CSV
  async importQuestions(quizId: string, csvData: any[]) {
    const response = await apiClient.post(`/quizzes/${quizId}/import-questions`, {
      csvData,
    });
    return response.data;
  },

  // Create from template
  async createFromTemplate(templateId: string, data: Partial<Quiz>) {
    const response = await apiClient.post(
      `/quizzes/templates/${templateId}/create`,
      data
    );
    return response.data;
  },

  // Get analytics
  async getAnalytics(quizId: string, days = 30) {
    const response = await apiClient.get(`/quizzes/${quizId}/analytics`, {
      params: { days },
    });
    return response.data;
  },
};

// Student API - Quiz Taking
export const quizAttemptApi = {
  // Start quiz attempt
  async start(quizId: string) {
    const response = await apiClient.post(`/quizzes/${quizId}/start`);
    return response.data;
  },

  // Submit answer
  async submitAnswer(
    attemptId: string,
    questionId: string,
    answerIds: string[],
    timeSpent?: number
  ) {
    const response = await apiClient.post(`/quizzes/attempts/${attemptId}/answers`, {
      questionId,
      answerIds,
      timeSpent,
    });
    return response.data;
  },

  // Auto-save progress
  async autoSave(attemptId: string, autoSaveData: any) {
    const response = await apiClient.post(
      `/quizzes/attempts/${attemptId}/auto-save`,
      { autoSaveData }
    );
    return response.data;
  },

  // Toggle mark for review
  async toggleMarkForReview(attemptId: string, questionId: string) {
    const response = await apiClient.post(
      `/quizzes/attempts/${attemptId}/mark-for-review`,
      { questionId }
    );
    return response.data;
  },

  // Log tab switch
  async logTabSwitch(attemptId: string) {
    const response = await apiClient.post(
      `/quizzes/attempts/${attemptId}/log-tab-switch`
    );
    return response.data;
  },

  // Log copy/paste
  async logCopyPaste(attemptId: string, action: 'copy' | 'paste') {
    const response = await apiClient.post(
      `/quizzes/attempts/${attemptId}/log-copy-paste`,
      { action }
    );
    return response.data;
  },

  // Complete quiz
  async complete(attemptId: string, timeRemaining?: number) {
    const response = await apiClient.post(
      `/quizzes/attempts/${attemptId}/complete`,
      { timeRemaining }
    );
    return response.data;
  },

  // Get attempt results
  async getResults(attemptId: string) {
    const response = await apiClient.get(`/quizzes/attempts/${attemptId}/results`);
    return response.data;
  },

  // Get user's attempts
  async getUserAttempts(quizId: string) {
    const response = await apiClient.get(`/quizzes/${quizId}/attempts`);
    return response.data;
  },
};

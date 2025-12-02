import { prisma } from '../config/database';
import { QuizType, QuestionType, QuizAttemptStatus } from '@prisma/client';

interface CreateQuizData {
  title: string;
  description?: string;
  type: QuizType;
  chapterContentId?: string;
  chapterId?: string;
  courseVersionId?: string;
  passingScore?: number;
  maxAttempts?: number;
  timeLimit?: number;
  oneQuestionPerPage?: boolean;
  randomizeQuestions?: boolean;
  randomizeAnswers?: boolean;
  showCorrectAnswers?: boolean;
  showExplanations?: boolean;
  preventTabSwitch?: boolean;
  preventCopyPaste?: boolean;
  lockUntilChaptersComplete?: boolean;
  generateCertificate?: boolean;
  requirePassing?: boolean;
}

interface CreateQuestionData {
  quizId: string;
  type: QuestionType;
  question: string;
  questionImage?: string;
  explanation?: string;
  points: number;
  order: number;
  category?: string;
  tags?: string[];
  difficulty?: string;
  answers: {
    answer: string;
    answerImage?: string;
    isCorrect: boolean;
    order: number;
  }[];
}

interface StartQuizData {
  userId: string;
  quizId: string;
  ipAddress: string;
  userAgent: string;
}

interface SubmitAnswerData {
  attemptId: string;
  questionId: string;
  answerIds: string[];
  timeSpent?: number;
}

interface CompleteQuizData {
  attemptId: string;
  timeRemaining?: number;
}

class QuizService {
  /**
   * Create a new quiz
   */
  async createQuiz(data: CreateQuizData) {
    const quiz = await prisma.quiz.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        chapterContentId: data.chapterContentId,
        chapterId: data.chapterId,
        courseVersionId: data.courseVersionId,
        passingScore: data.passingScore ?? 70,
        maxAttempts: data.maxAttempts,
        timeLimit: data.timeLimit,
        oneQuestionPerPage: data.oneQuestionPerPage ?? true,
        randomizeQuestions: data.randomizeQuestions ?? false,
        randomizeAnswers: data.randomizeAnswers ?? false,
        showCorrectAnswers: data.showCorrectAnswers ?? true,
        showExplanations: data.showExplanations ?? true,
        preventTabSwitch: data.preventTabSwitch ?? false,
        preventCopyPaste: data.preventCopyPaste ?? false,
        lockUntilChaptersComplete: data.lockUntilChaptersComplete ?? false,
        generateCertificate: data.generateCertificate ?? false,
        requirePassing: data.requirePassing ?? false,
      },
      include: {
        questions: {
          include: {
            answers: true,
          },
        },
      },
    });

    return quiz;
  }

  /**
   * Get all quizzes
   */
  async getAllQuizzes(options?: { type?: QuizType; includeQuestions?: boolean }) {
    const quizzes = await prisma.quiz.findMany({
      where: options?.type ? { type: options.type } : undefined,
      include: {
        questions: options?.includeQuestions
          ? {
              include: {
                answers: true,
              },
            }
          : {
              select: { id: true },
            },
        _count: {
          select: {
            questions: true,
            attempts: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return quizzes;
  }

  /**
   * Get quiz by ID
   */
  async getQuizById(quizId: string, includeQuestions: boolean = true) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: includeQuestions
          ? {
              include: {
                answers: {
                  orderBy: { order: 'asc' },
                },
              },
              orderBy: { order: 'asc' },
            }
          : false,
      },
    });

    return quiz;
  }

  /**
   * Update quiz
   */
  async updateQuiz(quizId: string, data: Partial<CreateQuizData>) {
    const quiz = await prisma.quiz.update({
      where: { id: quizId },
      data,
    });

    return quiz;
  }

  /**
   * Delete quiz
   */
  async deleteQuiz(quizId: string) {
    await prisma.quiz.delete({
      where: { id: quizId },
    });
  }

  /**
   * Add question to quiz
   */
  async addQuestion(data: CreateQuestionData) {
    const question = await prisma.quizQuestion.create({
      data: {
        quizId: data.quizId,
        type: data.type,
        question: data.question,
        questionImage: data.questionImage,
        explanation: data.explanation,
        points: data.points,
        order: data.order,
        category: data.category,
        tags: data.tags || [],
        difficulty: data.difficulty,
        answers: {
          create: data.answers,
        },
      },
      include: {
        answers: true,
      },
    });

    // Update quiz total points
    await this.updateQuizTotalPoints(data.quizId);

    return question;
  }

  /**
   * Update question
   */
  async updateQuestion(
    questionId: string,
    data: Partial<CreateQuestionData>
  ) {
    const { answers, ...questionData } = data;

    const question = await prisma.quizQuestion.update({
      where: { id: questionId },
      data: questionData,
      include: {
        answers: true,
      },
    });

    // Update answers if provided
    if (answers) {
      // Delete existing answers
      await prisma.quizAnswer.deleteMany({
        where: { questionId },
      });

      // Create new answers
      await prisma.quizAnswer.createMany({
        data: answers.map((answer) => ({
          questionId,
          ...answer,
        })),
      });
    }

    if (data.quizId) {
      await this.updateQuizTotalPoints(data.quizId);
    }

    return question;
  }

  /**
   * Delete question
   */
  async deleteQuestion(questionId: string) {
    const question = await prisma.quizQuestion.findUnique({
      where: { id: questionId },
    });

    await prisma.quizQuestion.delete({
      where: { id: questionId },
    });

    if (question?.quizId) {
      await this.updateQuizTotalPoints(question.quizId);
    }
  }

  /**
   * Update quiz total points based on questions
   */
  private async updateQuizTotalPoints(quizId: string) {
    const questions = await prisma.quizQuestion.findMany({
      where: { quizId },
      select: { points: true },
    });

    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

    await prisma.quiz.update({
      where: { id: quizId },
      data: { totalPoints },
    });
  }

  /**
   * Start a quiz attempt
   */
  async startQuizAttempt(data: StartQuizData) {
    const { userId, quizId, ipAddress, userAgent } = data;

    // Get quiz details
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          select: { points: true },
        },
      },
    });

    if (!quiz) {
      throw new Error('Quiz not found');
    }

    // Check max attempts
    if (quiz.maxAttempts) {
      const existingAttempts = await prisma.quizAttempt.count({
        where: {
          userId,
          quizId,
          status: { in: ['COMPLETED', 'TIME_EXPIRED'] },
        },
      });

      if (existingAttempts >= quiz.maxAttempts) {
        throw new Error('Maximum attempts reached');
      }
    }

    // Check for existing in-progress attempt
    const inProgressAttempt = await prisma.quizAttempt.findFirst({
      where: {
        userId,
        quizId,
        status: 'IN_PROGRESS',
      },
    });

    if (inProgressAttempt) {
      // Resume existing attempt
      return inProgressAttempt;
    }

    // Get next attempt number
    const lastAttempt = await prisma.quizAttempt.findFirst({
      where: { userId, quizId },
      orderBy: { attemptNumber: 'desc' },
    });

    const attemptNumber = (lastAttempt?.attemptNumber || 0) + 1;

    // Calculate total points
    const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);

    // Create new attempt
    const attempt = await prisma.quizAttempt.create({
      data: {
        userId,
        quizId,
        attemptNumber,
        status: 'IN_PROGRESS',
        totalPoints,
        ipAddress,
        userAgent,
      },
    });

    return attempt;
  }

  /**
   * Submit answer for a question
   */
  async submitAnswer(data: SubmitAnswerData) {
    const { attemptId, questionId, answerIds, timeSpent } = data;

    // Get question with answers
    const question = await prisma.quizQuestion.findUnique({
      where: { id: questionId },
      include: {
        answers: true,
      },
    });

    if (!question) {
      throw new Error('Question not found');
    }

    // Determine if answer is correct
    const correctAnswerIds = question.answers
      .filter((a) => a.isCorrect)
      .map((a) => a.id)
      .sort();

    const submittedAnswerIds = [...answerIds].sort();

    const isCorrect =
      correctAnswerIds.length === submittedAnswerIds.length &&
      correctAnswerIds.every((id, index) => id === submittedAnswerIds[index]);

    const pointsEarned = isCorrect ? question.points : 0;

    // Save or update response
    const response = await prisma.quizResponse.upsert({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId,
        },
      },
      create: {
        attemptId,
        questionId,
        answerIds,
        isCorrect,
        pointsEarned,
        timeSpent,
      },
      update: {
        answerIds,
        isCorrect,
        pointsEarned,
        timeSpent,
      },
    });

    // Update attempt progress
    const totalResponses = await prisma.quizResponse.count({
      where: { attemptId },
    });

    await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        questionsAnswered: totalResponses,
        lastSavedAt: new Date(),
      },
    });

    return response;
  }

  /**
   * Auto-save quiz progress
   */
  async autoSaveProgress(attemptId: string, autoSaveData: any) {
    await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        autoSaveData,
        lastSavedAt: new Date(),
      },
    });
  }

  /**
   * Mark question for review
   */
  async toggleMarkForReview(attemptId: string, questionId: string) {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      throw new Error('Attempt not found');
    }

    const markedQuestions = attempt.markedForReview || [];
    const index = markedQuestions.indexOf(questionId);

    let updated: string[];
    if (index > -1) {
      updated = markedQuestions.filter((id) => id !== questionId);
    } else {
      updated = [...markedQuestions, questionId];
    }

    await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        markedForReview: updated,
      },
    });

    return updated;
  }

  /**
   * Log tab switch
   */
  async logTabSwitch(attemptId: string) {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) return;

    const suspiciousActivity = (attempt.suspiciousActivity as any) || {
      tabSwitches: [],
    };

    suspiciousActivity.tabSwitches.push({
      timestamp: new Date().toISOString(),
    });

    await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        tabSwitchCount: attempt.tabSwitchCount + 1,
        suspiciousActivity,
      },
    });
  }

  /**
   * Log copy/paste attempt
   */
  async logCopyPaste(attemptId: string, action: 'copy' | 'paste') {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) return;

    const suspiciousActivity = (attempt.suspiciousActivity as any) || {
      copyPaste: [],
    };

    suspiciousActivity.copyPaste.push({
      action,
      timestamp: new Date().toISOString(),
    });

    await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        copyPasteCount: attempt.copyPasteCount + 1,
        suspiciousActivity,
      },
    });
  }

  /**
   * Complete quiz and calculate final score
   */
  async completeQuiz(data: CompleteQuizData) {
    const { attemptId, timeRemaining } = data;

    // Get attempt with all responses
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: true,
        responses: true,
      },
    });

    if (!attempt) {
      throw new Error('Attempt not found');
    }

    if (attempt.status !== 'IN_PROGRESS') {
      throw new Error('Quiz is not in progress');
    }

    // Calculate score
    const pointsEarned = attempt.responses.reduce(
      (sum, r) => sum + r.pointsEarned,
      0
    );
    const totalPoints = attempt.totalPoints || 1;
    const score = (pointsEarned / totalPoints) * 100;
    const passed = score >= attempt.quiz.passingScore;

    // Calculate time spent
    const timeSpent = Math.floor(
      (new Date().getTime() - attempt.startedAt.getTime()) / 1000
    );

    // Update attempt
    const completedAttempt = await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'COMPLETED',
        score,
        pointsEarned,
        passed,
        completedAt: new Date(),
        timeSpent,
        timeRemaining,
      },
      include: {
        responses: {
          include: {
            question: {
              include: {
                answers: true,
              },
            },
          },
        },
      },
    });

    // Update analytics
    await this.updateQuizAnalytics(attempt.quizId);

    // Mark chapter as completed if quiz is passed
    if (passed) {
      await this.markChapterCompleted(attempt.userId, attempt.quizId);
    }

    // Generate certificate if applicable
    if (passed && attempt.quiz.generateCertificate) {
      // Check if all chapters in the course are completed
      const allChaptersCompleted = await this.checkAllChaptersCompleted(
        attempt.userId,
        attempt.quizId
      );

      if (allChaptersCompleted) {
        await this.generateCertificate(completedAttempt);
      }
    }

    return completedAttempt;
  }

  /**
   * Expire quiz due to time limit
   */
  async expireQuiz(attemptId: string) {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: true,
        responses: true,
      },
    });

    if (!attempt || attempt.status !== 'IN_PROGRESS') {
      return;
    }

    // Calculate score with submitted answers
    const pointsEarned = attempt.responses.reduce(
      (sum, r) => sum + r.pointsEarned,
      0
    );
    const totalPoints = attempt.totalPoints || 1;
    const score = (pointsEarned / totalPoints) * 100;
    const passed = score >= attempt.quiz.passingScore;

    await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'TIME_EXPIRED',
        score,
        pointsEarned,
        passed,
        completedAt: new Date(),
        timeRemaining: 0,
      },
    });

    await this.updateQuizAnalytics(attempt.quizId);
  }

  /**
   * Get quiz attempt with results
   */
  async getAttemptResults(attemptId: string) {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: true,
        responses: {
          include: {
            question: {
              include: {
                answers: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
        certificate: true,
      },
    });

    return attempt;
  }

  /**
   * Get user's quiz attempts
   */
  async getUserAttempts(userId: string, quizId: string) {
    const attempts = await prisma.quizAttempt.findMany({
      where: {
        userId,
        quizId,
      },
      orderBy: {
        attemptNumber: 'desc',
      },
      include: {
        quiz: {
          select: {
            title: true,
            passingScore: true,
            maxAttempts: true,
          },
        },
      },
    });

    return attempts;
  }

  /**
   * Update quiz analytics
   */
  private async updateQuizAnalytics(quizId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attempts = await prisma.quizAttempt.findMany({
      where: {
        quizId,
        status: { in: ['COMPLETED', 'TIME_EXPIRED'] },
        completedAt: {
          gte: today,
        },
      },
    });

    if (attempts.length === 0) return;

    const totalAttempts = attempts.length;
    const completedAttempts = attempts.filter(
      (a) => a.status === 'COMPLETED'
    ).length;

    const scores = attempts
      .filter((a) => a.score !== null)
      .map((a) => parseFloat(a.score!.toString()));
    const averageScore =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;

    const passedCount = attempts.filter((a) => a.passed).length;
    const passRate = (passedCount / totalAttempts) * 100;

    const times = attempts
      .filter((a) => a.timeSpent !== null)
      .map((a) => a.timeSpent!);
    const averageTime =
      times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;

    await prisma.quizAnalytics.upsert({
      where: {
        quizId_date: {
          quizId,
          date: today,
        },
      },
      create: {
        quizId,
        date: today,
        totalAttempts,
        completedAttempts,
        averageScore,
        passRate,
        averageTime,
      },
      update: {
        totalAttempts,
        completedAttempts,
        averageScore,
        passRate,
        averageTime,
      },
    });
  }

  /**
   * Mark chapter as completed when quiz is passed
   */
  private async markChapterCompleted(userId: string, quizId: string) {
    // Find the quiz with its chapter
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        chapter: {
          include: {
            version: true,
          },
        },
        chapterContent: {
          include: {
            chapter: {
              include: {
                version: true,
              },
            },
          },
        },
      },
    });

    if (!quiz) return;

    // Get chapter from either direct relation or through chapterContent
    const chapter = quiz.chapter || quiz.chapterContent?.chapter;
    if (!chapter) return;

    const courseVersionId = chapter.versionId;
    const chapterId = chapter.id;

    // Mark progress as completed
    await prisma.progress.upsert({
      where: {
        userId_chapterId: {
          userId,
          chapterId,
        },
      },
      create: {
        userId,
        chapterId,
        courseVersionId,
        isCompleted: true,
      },
      update: {
        isCompleted: true,
      },
    });
  }

  /**
   * Check if all chapters in the course are completed
   */
  private async checkAllChaptersCompleted(
    userId: string,
    quizId: string
  ): Promise<boolean> {
    // Find the quiz to get the course version
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        chapter: {
          include: {
            version: {
              include: {
                chapters: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
        chapterContent: {
          include: {
            chapter: {
              include: {
                version: {
                  include: {
                    chapters: {
                      orderBy: { order: 'asc' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!quiz) return false;

    // Get chapter and version from either direct relation or through chapterContent
    const chapter = quiz.chapter || quiz.chapterContent?.chapter;
    if (!chapter || !chapter.version) return false;

    const chapters = chapter.version.chapters;
    if (chapters.length === 0) return false;

    // Get user's progress for all chapters
    const progress = await prisma.progress.findMany({
      where: {
        userId,
        chapterId: { in: chapters.map((c) => c.id) },
      },
    });

    // Check if all chapters are completed
    const completedChapterIds = new Set(
      progress.filter((p) => p.isCompleted).map((p) => p.chapterId)
    );

    return chapters.every((chapter) => completedChapterIds.has(chapter.id));
  }

  /**
   * Generate certificate
   */
  private async generateCertificate(attempt: any) {
    const user = await prisma.user.findUnique({
      where: { id: attempt.userId },
    });

    const course = await prisma.course.findFirst({
      where: {
        versions: {
          some: {
            chapters: {
              some: {
                contents: {
                  some: {
                    quiz: {
                      id: attempt.quizId,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !course) return;

    const certificateNumber = `CERT-${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)
      .toUpperCase()}`;

    await prisma.certificate.create({
      data: {
        attemptId: attempt.id,
        userId: attempt.userId,
        courseId: course.id,
        quizId: attempt.quizId,
        certificateNumber,
        studentName: `${user.name} ${user.surname}`,
        courseName: course.title,
        quizTitle: attempt.quiz.title,
        score: attempt.score,
        completionDate: attempt.completedAt || new Date(),
      },
    });
  }

  /**
   * Get quiz analytics
   */
  async getQuizAnalytics(quizId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await prisma.quizAnalytics.findMany({
      where: {
        quizId,
        date: {
          gte: startDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    return analytics;
  }

  /**
   * Import questions from CSV data
   */
  async importQuestionsFromCSV(quizId: string, csvData: any[]) {
    const questions = [];

    for (const row of csvData) {
      const question = await this.addQuestion({
        quizId,
        type: row.type || 'SINGLE_CHOICE',
        question: row.question,
        explanation: row.explanation,
        points: parseInt(row.points) || 1,
        order: parseInt(row.order),
        category: row.category,
        tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()) : [],
        difficulty: row.difficulty,
        answers: [
          {
            answer: row.answer1,
            isCorrect: row.correct === '1',
            order: 0,
          },
          {
            answer: row.answer2,
            isCorrect: row.correct === '2',
            order: 1,
          },
          {
            answer: row.answer3,
            isCorrect: row.correct === '3',
            order: 2,
          },
          {
            answer: row.answer4,
            isCorrect: row.correct === '4',
            order: 3,
          },
        ].filter((a) => a.answer),
      });

      questions.push(question);
    }

    return questions;
  }

  /**
   * Create quiz from template
   */
  async createQuizFromTemplate(templateId: string, data: Partial<CreateQuizData>) {
    const template = await prisma.quiz.findUnique({
      where: { id: templateId },
      include: {
        questions: {
          include: {
            answers: true,
          },
        },
      },
    });

    if (!template || !template.isTemplate) {
      throw new Error('Template not found');
    }

    // Create new quiz from template
    const quiz = await this.createQuiz({
      ...data,
      title: data.title || template.title,
      description: data.description || template.description,
      type: data.type || template.type,
      passingScore: data.passingScore ?? template.passingScore,
      maxAttempts: data.maxAttempts ?? template.maxAttempts,
      timeLimit: data.timeLimit ?? template.timeLimit,
      oneQuestionPerPage: data.oneQuestionPerPage ?? template.oneQuestionPerPage,
      randomizeQuestions: data.randomizeQuestions ?? template.randomizeQuestions,
      randomizeAnswers: data.randomizeAnswers ?? template.randomizeAnswers,
      showCorrectAnswers: data.showCorrectAnswers ?? template.showCorrectAnswers,
      showExplanations: data.showExplanations ?? template.showExplanations,
    });

    // Copy questions
    for (const question of template.questions) {
      await this.addQuestion({
        quizId: quiz.id,
        type: question.type,
        question: question.question,
        questionImage: question.questionImage || undefined,
        explanation: question.explanation || undefined,
        points: question.points,
        order: question.order,
        category: question.category || undefined,
        tags: question.tags,
        difficulty: question.difficulty || undefined,
        answers: question.answers.map((a) => ({
          answer: a.answer,
          answerImage: a.answerImage || undefined,
          isCorrect: a.isCorrect,
          order: a.order,
        })),
      });
    }

    return quiz;
  }
}

export default new QuizService();

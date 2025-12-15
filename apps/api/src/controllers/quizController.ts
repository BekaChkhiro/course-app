import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import quizService from '../services/quiz.service';

/**
 * Get all quizzes (admin)
 */
export const getAllQuizzes = async (req: AuthRequest, res: Response) => {
  try {
    const { type, includeQuestions } = req.query;

    const quizzes = await quizService.getAllQuizzes({
      type: type as any,
      includeQuestions: includeQuestions === 'true',
    });

    res.json({
      success: true,
      data: quizzes,
    });
  } catch (error) {
    console.error('Get all quizzes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get quizzes',
    });
  }
};

/**
 * Create a new quiz
 */
export const createQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const quiz = await quizService.createQuiz(req.body);

    res.json({
      success: true,
      data: quiz,
      message: 'Quiz created successfully',
    });
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create quiz',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get quiz by ID
 */
export const getQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const { quizId } = req.params;
    const { includeQuestions } = req.query;

    const quiz = await quizService.getQuizById(
      quizId,
      includeQuestions === 'true'
    );

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found',
      });
    }

    res.json({
      success: true,
      data: quiz,
    });
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get quiz',
    });
  }
};

/**
 * Update quiz
 */
export const updateQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const { quizId } = req.params;

    const quiz = await quizService.updateQuiz(quizId, req.body);

    res.json({
      success: true,
      data: quiz,
      message: 'Quiz updated successfully',
    });
  } catch (error) {
    console.error('Update quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update quiz',
    });
  }
};

/**
 * Delete quiz
 */
export const deleteQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const { quizId } = req.params;

    await quizService.deleteQuiz(quizId);

    res.json({
      success: true,
      message: 'Quiz deleted successfully',
    });
  } catch (error) {
    console.error('Delete quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete quiz',
    });
  }
};

/**
 * Add question to quiz
 */
export const addQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const { quizId } = req.params;

    console.log('Adding question to quiz:', quizId);
    console.log('Question data:', JSON.stringify(req.body, null, 2));

    // Validate answers have order field
    const answersWithOrder = (req.body.answers || []).map((a: any, index: number) => ({
      answer: a.answer,
      isCorrect: a.isCorrect,
      order: a.order ?? index,
    }));

    const question = await quizService.addQuestion({
      quizId,
      type: req.body.type,
      question: req.body.question,
      questionImage: req.body.questionImage,
      explanation: req.body.explanation,
      points: req.body.points || 1,
      order: req.body.order ?? 0,
      answers: answersWithOrder,
    });

    res.json({
      success: true,
      data: question,
      message: 'Question added successfully',
    });
  } catch (error) {
    console.error('Add question error:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      message: 'Failed to add question',
    });
  }
};

/**
 * Update question
 */
export const updateQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const { questionId } = req.params;

    const question = await quizService.updateQuestion(questionId, req.body);

    res.json({
      success: true,
      data: question,
      message: 'Question updated successfully',
    });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update question',
    });
  }
};

/**
 * Delete question
 */
export const deleteQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const { questionId } = req.params;

    await quizService.deleteQuestion(questionId);

    res.json({
      success: true,
      message: 'Question deleted successfully',
    });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete question',
    });
  }
};

/**
 * Start quiz attempt
 */
export const startQuizAttempt = async (req: AuthRequest, res: Response) => {
  try {
    const { quizId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const ipAddress = (req.ip || req.socket.remoteAddress || '').replace(
      '::ffff:',
      ''
    );
    const userAgent = req.headers['user-agent'] || '';

    const attempt = await quizService.startQuizAttempt({
      userId,
      quizId,
      ipAddress,
      userAgent,
    });

    res.json({
      success: true,
      data: attempt,
      message: 'Quiz attempt started',
    });
  } catch (error) {
    console.error('Start quiz attempt error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to start quiz',
    });
  }
};

/**
 * Submit answer for a question
 */
export const submitAnswer = async (req: AuthRequest, res: Response) => {
  try {
    const { attemptId } = req.params;
    const { questionId, answerIds, timeSpent } = req.body;

    const response = await quizService.submitAnswer({
      attemptId,
      questionId,
      answerIds,
      timeSpent,
    });

    res.json({
      success: true,
      data: response,
      message: 'Answer submitted',
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit answer',
    });
  }
};

/**
 * Auto-save quiz progress
 */
export const autoSaveProgress = async (req: AuthRequest, res: Response) => {
  try {
    const { attemptId } = req.params;
    const { autoSaveData } = req.body;

    await quizService.autoSaveProgress(attemptId, autoSaveData);

    res.json({
      success: true,
      message: 'Progress saved',
    });
  } catch (error) {
    console.error('Auto-save progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save progress',
    });
  }
};

/**
 * Toggle mark for review
 */
export const toggleMarkForReview = async (req: AuthRequest, res: Response) => {
  try {
    const { attemptId } = req.params;
    const { questionId } = req.body;

    const markedQuestions = await quizService.toggleMarkForReview(
      attemptId,
      questionId
    );

    res.json({
      success: true,
      data: { markedQuestions },
    });
  } catch (error) {
    console.error('Toggle mark for review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle mark for review',
    });
  }
};

/**
 * Log tab switch
 */
export const logTabSwitch = async (req: AuthRequest, res: Response) => {
  try {
    const { attemptId } = req.params;

    await quizService.logTabSwitch(attemptId);

    res.json({
      success: true,
      message: 'Tab switch logged',
    });
  } catch (error) {
    console.error('Log tab switch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log tab switch',
    });
  }
};

/**
 * Log copy/paste attempt
 */
export const logCopyPaste = async (req: AuthRequest, res: Response) => {
  try {
    const { attemptId } = req.params;
    const { action } = req.body;

    await quizService.logCopyPaste(attemptId, action);

    res.json({
      success: true,
      message: 'Copy/paste logged',
    });
  } catch (error) {
    console.error('Log copy/paste error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log copy/paste',
    });
  }
};

/**
 * Complete quiz
 */
export const completeQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const { attemptId } = req.params;
    const { timeRemaining } = req.body;

    const attempt = await quizService.completeQuiz({
      attemptId,
      timeRemaining,
    });

    res.json({
      success: true,
      data: attempt,
      message: 'Quiz completed successfully',
    });
  } catch (error) {
    console.error('Complete quiz error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to complete quiz',
    });
  }
};

/**
 * Get quiz attempt results
 */
export const getAttemptResults = async (req: AuthRequest, res: Response) => {
  try {
    const { attemptId } = req.params;

    const attempt = await quizService.getAttemptResults(attemptId);

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found',
      });
    }

    res.json({
      success: true,
      data: attempt,
    });
  } catch (error) {
    console.error('Get attempt results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get results',
    });
  }
};

/**
 * Get user's quiz attempts
 */
export const getUserAttempts = async (req: AuthRequest, res: Response) => {
  try {
    const { quizId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const attempts = await quizService.getUserAttempts(userId, quizId);

    res.json({
      success: true,
      data: attempts,
    });
  } catch (error) {
    console.error('Get user attempts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get attempts',
    });
  }
};

/**
 * Get quiz analytics
 */
export const getQuizAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { quizId } = req.params;
    const { days } = req.query;

    const analytics = await quizService.getQuizAnalytics(
      quizId,
      days ? parseInt(days as string) : 30
    );

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Get quiz analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics',
    });
  }
};

/**
 * Import questions from CSV
 */
export const importQuestionsFromCSV = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { quizId } = req.params;
    const { csvData } = req.body;

    const questions = await quizService.importQuestionsFromCSV(quizId, csvData);

    res.json({
      success: true,
      data: questions,
      message: `Imported ${questions.length} questions successfully`,
    });
  } catch (error) {
    console.error('Import questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import questions',
    });
  }
};

/**
 * Create quiz from template
 */
export const createQuizFromTemplate = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { templateId } = req.params;

    const quiz = await quizService.createQuizFromTemplate(templateId, req.body);

    res.json({
      success: true,
      data: quiz,
      message: 'Quiz created from template successfully',
    });
  } catch (error) {
    console.error('Create quiz from template error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create quiz',
    });
  }
};

/**
 * Regenerate certificate for a passed attempt
 */
export const regenerateCertificate = async (req: AuthRequest, res: Response) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const certificate = await quizService.regenerateCertificate(attemptId, userId);

    if (!certificate) {
      return res.status(400).json({
        success: false,
        message: 'სერტიფიკატის გენერაცია ვერ მოხერხდა. დარწმუნდით რომ გამოცდა ჩაბარებულია და ყველა თავი დასრულებულია.',
      });
    }

    res.json({
      success: true,
      data: certificate,
      message: 'სერტიფიკატი წარმატებით შეიქმნა',
    });
  } catch (error) {
    console.error('Regenerate certificate error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to regenerate certificate',
    });
  }
};

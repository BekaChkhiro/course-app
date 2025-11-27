import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import * as quizController from '../controllers/quizController';

const router = Router();

// Public routes (none - all quiz routes require authentication)

// Student routes - require authentication
router.use(requireAuth);

// Start quiz attempt
router.post('/:quizId/start', quizController.startQuizAttempt);

// Submit answer
router.post('/attempts/:attemptId/answers', quizController.submitAnswer);

// Auto-save progress
router.post('/attempts/:attemptId/auto-save', quizController.autoSaveProgress);

// Mark for review
router.post(
  '/attempts/:attemptId/mark-for-review',
  quizController.toggleMarkForReview
);

// Log tab switch
router.post('/attempts/:attemptId/log-tab-switch', quizController.logTabSwitch);

// Log copy/paste
router.post('/attempts/:attemptId/log-copy-paste', quizController.logCopyPaste);

// Complete quiz
router.post('/attempts/:attemptId/complete', quizController.completeQuiz);

// Get attempt results
router.get('/attempts/:attemptId/results', quizController.getAttemptResults);

// Get user's attempts for a quiz
router.get('/:quizId/attempts', quizController.getUserAttempts);

// Get quiz (students can view if they have access)
router.get('/:quizId', quizController.getQuiz);

// Admin routes - require admin role
router.use(requireAdmin);

// Get all quizzes (admin)
router.get('/', quizController.getAllQuizzes);

// Create quiz
router.post('/', quizController.createQuiz);

// Update quiz
router.put('/:quizId', quizController.updateQuiz);

// Delete quiz
router.delete('/:quizId', quizController.deleteQuiz);

// Question management
router.post('/:quizId/questions', quizController.addQuestion);
router.put('/questions/:questionId', quizController.updateQuestion);
router.delete('/questions/:questionId', quizController.deleteQuestion);

// Import questions from CSV
router.post('/:quizId/import-questions', quizController.importQuestionsFromCSV);

// Create quiz from template
router.post(
  '/templates/:templateId/create',
  quizController.createQuizFromTemplate
);

// Get quiz analytics
router.get('/:quizId/analytics', quizController.getQuizAnalytics);

export default router;

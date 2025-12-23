import express from 'express';
import {
  getDashboard,
  getMyCourses,
  getCourseForLearning,
  getChapterForLearning,
  getTransactionHistory,
  getCertificates,
  getCertificateById,
  generateCertificate,
  getPreferences,
  updatePreferences,
  saveNote,
  deleteNote,
  createBookmark,
  deleteBookmark,
  getCourseNotes,
  getCourseBookmarks,
  updateChapterProgress,
  markChapterComplete,
  getChapterComments,
  createComment,
  deleteComment,
} from '../controllers/studentController';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Dashboard
router.get('/dashboard', getDashboard);

// My Courses
router.get('/courses', getMyCourses);
router.get('/courses/:courseSlug/learn', getCourseForLearning);
router.get('/courses/:courseId/notes', getCourseNotes);
router.get('/courses/:courseId/bookmarks', getCourseBookmarks);

// Chapter Learning
router.get('/chapters/:chapterId', getChapterForLearning);
router.put('/chapters/:chapterId/progress', updateChapterProgress);
router.post('/chapters/:chapterId/complete', markChapterComplete);

// Chapter Comments
router.get('/chapters/:chapterId/comments', getChapterComments);
router.post('/chapters/:chapterId/comments', createComment);
router.delete('/comments/:commentId', deleteComment);

// Transaction History
router.get('/transactions', getTransactionHistory);

// Certificates
router.get('/certificates', getCertificates);
router.get('/certificates/:certificateId', getCertificateById);
router.post('/certificates/generate', generateCertificate);

// User Preferences
router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);

// Notes
router.post('/notes', saveNote);
router.delete('/notes/:noteId', deleteNote);

// Bookmarks
router.post('/bookmarks', createBookmark);
router.delete('/bookmarks/:bookmarkId', deleteBookmark);

export default router;

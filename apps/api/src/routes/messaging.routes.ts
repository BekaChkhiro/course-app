import express from 'express';
import {
  // Student endpoints
  createMessage,
  getMyMessages,
  getMessage,
  addReply,
  deleteMessage,
  getUnreadCount,
  // Admin endpoints
  getAllMessages,
  assignMessage,
  updateStatus,
  updatePriority,
  updateInternalNotes,
  bulkUpdateStatus,
  bulkAssign,
  getMessagingAnalytics,
  getTeamPerformance,
  // Canned responses
  getCannedResponses,
  createCannedResponse,
  updateCannedResponse,
  deleteCannedResponse,
} from '../controllers/messaging.controller';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = express.Router();

// ==========================================
// STUDENT ROUTES
// ==========================================

// Create a new message
router.post('/messages', requireAuth, createMessage);

// Get user's messages
router.get('/messages', requireAuth, getMyMessages);

// Get unread count
router.get('/messages/unread-count', requireAuth, getUnreadCount);

// Get single message with replies
router.get('/messages/:messageId', requireAuth, getMessage);

// Add reply to a message
router.post('/messages/:messageId/replies', requireAuth, addReply);

// Delete message
router.delete('/messages/:messageId', requireAuth, deleteMessage);

// ==========================================
// ADMIN ROUTES
// ==========================================

// Get all messages with filters
router.get('/admin/messages', requireAuth, requireAdmin, getAllMessages);

// Get messaging analytics
router.get('/admin/messages/analytics', requireAuth, requireAdmin, getMessagingAnalytics);

// Get team performance
router.get('/admin/messages/team-performance', requireAuth, requireAdmin, getTeamPerformance);

// Assign message to admin
router.post('/admin/messages/:messageId/assign', requireAuth, requireAdmin, assignMessage);

// Update message status
router.post('/admin/messages/:messageId/status', requireAuth, requireAdmin, updateStatus);

// Update message priority
router.post('/admin/messages/:messageId/priority', requireAuth, requireAdmin, updatePriority);

// Update internal notes
router.put('/admin/messages/:messageId/notes', requireAuth, requireAdmin, updateInternalNotes);

// Bulk update status
router.post('/admin/messages/bulk-status', requireAuth, requireAdmin, bulkUpdateStatus);

// Bulk assign
router.post('/admin/messages/bulk-assign', requireAuth, requireAdmin, bulkAssign);

// ==========================================
// CANNED RESPONSES (Admin only)
// ==========================================

// Get all canned responses
router.get('/admin/canned-responses', requireAuth, requireAdmin, getCannedResponses);

// Create canned response
router.post('/admin/canned-responses', requireAuth, requireAdmin, createCannedResponse);

// Update canned response
router.put('/admin/canned-responses/:id', requireAuth, requireAdmin, updateCannedResponse);

// Delete canned response
router.delete('/admin/canned-responses/:id', requireAuth, requireAdmin, deleteCannedResponse);

export default router;

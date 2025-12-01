import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { MessagingService } from '../services/messaging.service';
import { EmailService } from '../services/emailService';
import { MessageStatus, MessagePriority, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================
// STUDENT ENDPOINTS
// ==========================================

/**
 * Create a new message
 */
export const createMessage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { subject, content, courseId, attachmentUrl, priority } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!subject || !content) {
      return res.status(400).json({ success: false, message: 'Subject and content are required' });
    }

    const message = await MessagingService.createMessage({
      userId,
      subject,
      content,
      courseId,
      attachmentUrl,
      priority,
    });

    // Notify admins about new message
    try {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true },
        select: { id: true, email: true, name: true },
      });

      const studentName = `${message.user.name} ${message.user.surname}`;
      const messagePreview = content.substring(0, 100);

      for (const admin of admins) {
        await EmailService.sendNewMessageNotificationToAdmin(
          admin.email,
          admin.name,
          studentName,
          subject,
          messagePreview,
          message.id
        );
      }
    } catch (emailError) {
      console.error('Failed to send admin notification:', emailError);
    }

    return res.status(201).json({
      success: true,
      data: message,
      message: 'Message sent successfully',
    });
  } catch (error: any) {
    console.error('Error creating message:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get user's messages
 */
export const getMyMessages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { status, page = '1', limit = '20' } = req.query;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await MessagingService.getMessages({
      userId,
      status: status as MessageStatus | undefined,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error getting messages:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get single message with replies
 */
export const getMessage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { messageId } = req.params;
    const isAdmin = req.user?.role === 'ADMIN';

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const message = await MessagingService.getMessage(messageId, userId, isAdmin);

    // Mark as read if student viewing their own message
    if (!isAdmin && message.userId === userId) {
      await MessagingService.markAsRead(messageId, userId);
    }

    return res.json({
      success: true,
      data: message,
    });
  } catch (error: any) {
    console.error('Error getting message:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Add reply to a message
 */
export const addReply = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { messageId } = req.params;
    const { content, attachmentUrl, isInternal } = req.body;
    const isAdmin = req.user?.role === 'ADMIN';

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!content) {
      return res.status(400).json({ success: false, message: 'Reply content is required' });
    }

    const reply = await MessagingService.addReply({
      messageId,
      userId,
      content,
      attachmentUrl,
      isInternal: isAdmin ? isInternal : false,
    });

    // If admin replied (not internal), notify the student
    if (isAdmin && !isInternal) {
      try {
        const message = await MessagingService.getMessage(messageId, userId, true);
        const shouldSend = await EmailService.shouldSendNotification(message.userId, 'comment');

        if (shouldSend) {
          const replyPreview = content.substring(0, 100);
          await EmailService.sendMessageReplyNotification(
            message.user.email,
            message.user.name,
            `${reply.user.name} ${reply.user.surname}`,
            message.subject,
            replyPreview,
            messageId,
            message.userId
          );
        }
      } catch (emailError) {
        console.error('Failed to send reply notification:', emailError);
      }
    }

    return res.status(201).json({
      success: true,
      data: reply,
      message: 'Reply added successfully',
    });
  } catch (error: any) {
    console.error('Error adding reply:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Delete message
 */
export const deleteMessage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { messageId } = req.params;
    const isAdmin = req.user?.role === 'ADMIN';

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    await MessagingService.deleteMessage(messageId, userId, isAdmin);

    return res.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting message:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Get unread message count
 */
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN';

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const count = await MessagingService.getUnreadCount(userId, isAdmin);

    return res.json({
      success: true,
      data: { count },
    });
  } catch (error: any) {
    console.error('Error getting unread count:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// ADMIN ENDPOINTS
// ==========================================

/**
 * Get all messages with filters
 */
export const getAllMessages = async (req: AuthRequest, res: Response) => {
  try {
    const {
      status,
      priority,
      assignedToId,
      courseId,
      unassigned,
      search,
      sortBy = 'newest',
      page = '1',
      limit = '20',
    } = req.query;

    const result = await MessagingService.getMessages({
      status: status as MessageStatus | undefined,
      priority: priority as MessagePriority | undefined,
      assignedToId: assignedToId as string | undefined,
      courseId: courseId as string | undefined,
      unassigned: unassigned === 'true',
      search: search as string | undefined,
      sortBy: sortBy as any,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error getting all messages:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Assign message to admin
 */
export const assignMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const { assignedToId } = req.body;

    const message = await MessagingService.assignMessage(messageId, assignedToId || null);

    return res.json({
      success: true,
      data: message,
      message: assignedToId ? 'Message assigned successfully' : 'Message unassigned',
    });
  } catch (error: any) {
    console.error('Error assigning message:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Update message status
 */
export const updateStatus = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user?.id;
    const { messageId } = req.params;
    const { status } = req.body;

    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!Object.values(MessageStatus).includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const message = await MessagingService.updateStatus(messageId, status, adminId);

    return res.json({
      success: true,
      data: message,
      message: 'Status updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating status:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Update message priority
 */
export const updatePriority = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const { priority } = req.body;

    if (!Object.values(MessagePriority).includes(priority)) {
      return res.status(400).json({ success: false, message: 'Invalid priority' });
    }

    const message = await MessagingService.updatePriority(messageId, priority);

    return res.json({
      success: true,
      data: message,
      message: 'Priority updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating priority:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Update internal notes
 */
export const updateInternalNotes = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const { notes } = req.body;

    const message = await MessagingService.updateInternalNotes(messageId, notes);

    return res.json({
      success: true,
      data: message,
      message: 'Notes updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating notes:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Bulk update message status
 */
export const bulkUpdateStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { messageIds, status } = req.body;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Message IDs are required' });
    }

    if (!Object.values(MessageStatus).includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const result = await MessagingService.bulkUpdateStatus(messageIds, status);

    return res.json({
      success: true,
      data: result,
      message: `${result.count} messages updated successfully`,
    });
  } catch (error: any) {
    console.error('Error bulk updating status:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Bulk assign messages
 */
export const bulkAssign = async (req: AuthRequest, res: Response) => {
  try {
    const { messageIds, assignedToId } = req.body;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Message IDs are required' });
    }

    const result = await MessagingService.bulkAssign(messageIds, assignedToId || null);

    return res.json({
      success: true,
      data: result,
      message: `${result.count} messages assigned successfully`,
    });
  } catch (error: any) {
    console.error('Error bulk assigning messages:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Get messaging analytics
 */
export const getMessagingAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const analytics = await MessagingService.getAnalytics(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    return res.json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    console.error('Error getting messaging analytics:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get team performance metrics
 */
export const getTeamPerformance = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const performance = await MessagingService.getTeamPerformance(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    return res.json({
      success: true,
      data: performance,
    });
  } catch (error: any) {
    console.error('Error getting team performance:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// CANNED RESPONSES
// ==========================================

/**
 * Get all canned responses
 */
export const getCannedResponses = async (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.query;

    const responses = await MessagingService.getCannedResponses(category as string | undefined);

    return res.json({
      success: true,
      data: responses,
    });
  } catch (error: any) {
    console.error('Error getting canned responses:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create canned response
 */
export const createCannedResponse = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { title, content, category, shortcut } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    const response = await MessagingService.createCannedResponse(
      userId,
      title,
      content,
      category,
      shortcut
    );

    return res.status(201).json({
      success: true,
      data: response,
      message: 'Canned response created successfully',
    });
  } catch (error: any) {
    console.error('Error creating canned response:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Update canned response
 */
export const updateCannedResponse = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, category, shortcut, isActive } = req.body;

    const response = await MessagingService.updateCannedResponse(id, {
      title,
      content,
      category,
      shortcut,
      isActive,
    });

    return res.json({
      success: true,
      data: response,
      message: 'Canned response updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating canned response:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Delete canned response
 */
export const deleteCannedResponse = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await MessagingService.deleteCannedResponse(id);

    return res.json({
      success: true,
      message: 'Canned response deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting canned response:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

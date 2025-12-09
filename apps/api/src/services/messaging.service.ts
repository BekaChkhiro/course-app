import { PrismaClient, MessageStatus, MessagePriority } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateMessageInput {
  userId: string;
  subject: string;
  content: string;
  courseId?: string;
  chapterId?: string;
  attachmentUrl?: string;
  priority?: MessagePriority;
}

interface CreateReplyInput {
  messageId: string;
  userId: string;
  content: string;
  attachmentUrl?: string;
  isInternal?: boolean;
}

interface MessageFilters {
  userId?: string;
  assignedToId?: string;
  courseId?: string;
  status?: MessageStatus;
  priority?: MessagePriority;
  unassigned?: boolean;
  search?: string;
  sortBy?: 'newest' | 'oldest' | 'priority' | 'status';
  page?: number;
  limit?: number;
}

export class MessagingService {
  /**
   * Create a new message from a student
   */
  static async createMessage(input: CreateMessageInput) {
    const { userId, subject, content, courseId, chapterId, attachmentUrl, priority } = input;

    const message = await prisma.studentMessage.create({
      data: {
        userId,
        subject,
        content,
        courseId,
        attachmentUrl,
        priority: priority || MessagePriority.MEDIUM,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
            avatar: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    return message;
  }

  /**
   * Get messages with filters
   */
  static async getMessages(filters: MessageFilters) {
    const {
      userId,
      assignedToId,
      courseId,
      status,
      priority,
      unassigned,
      search,
      sortBy = 'newest',
      page = 1,
      limit = 20,
    } = filters;

    const where: any = {};

    if (userId) where.userId = userId;
    if (assignedToId) where.assignedToId = assignedToId;
    if (courseId) where.courseId = courseId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (unassigned) where.assignedToId = null;
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Determine sort order
    let orderBy: any = { createdAt: 'desc' };
    switch (sortBy) {
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'priority':
        orderBy = [
          { priority: 'desc' }, // URGENT, HIGH, MEDIUM, LOW
          { createdAt: 'desc' },
        ];
        break;
      case 'status':
        orderBy = [
          { status: 'asc' }, // NEW first
          { createdAt: 'desc' },
        ];
        break;
    }

    const [messages, total] = await Promise.all([
      prisma.studentMessage.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              surname: true,
              email: true,
              avatar: true,
            },
          },
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              surname: true,
              avatar: true,
            },
          },
          replies: {
            orderBy: { createdAt: 'asc' },
            take: 1,
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  surname: true,
                  avatar: true,
                  role: true,
                },
              },
            },
          },
          _count: {
            select: { replies: true },
          },
        },
      }),
      prisma.studentMessage.count({ where }),
    ]);

    return {
      messages,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single message with all replies
   */
  static async getMessage(messageId: string, userId?: string, isAdmin: boolean = false) {
    const message = await prisma.studentMessage.findUnique({
      where: { id: messageId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
            avatar: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            surname: true,
            avatar: true,
          },
        },
        replies: {
          where: isAdmin ? {} : { isInternal: false }, // Hide internal notes from students
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                surname: true,
                avatar: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Check permissions
    if (!isAdmin && userId && message.userId !== userId) {
      throw new Error('You do not have permission to view this message');
    }

    return message;
  }

  /**
   * Add a reply to a message
   */
  static async addReply(input: CreateReplyInput) {
    const { messageId, userId, content, attachmentUrl, isInternal } = input;

    // Get the message to check permissions and status
    const message = await prisma.studentMessage.findUnique({
      where: { id: messageId },
      include: {
        user: true,
      },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Get the replying user's role
    const replyingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const isAdmin = replyingUser?.role === 'ADMIN';

    // Check permissions - only sender or admin can reply
    if (!isAdmin && message.userId !== userId) {
      throw new Error('You do not have permission to reply to this message');
    }

    // Only admins can make internal notes
    if (isInternal && !isAdmin) {
      throw new Error('Only admins can create internal notes');
    }

    // Create the reply
    const reply = await prisma.messageReply.create({
      data: {
        messageId,
        userId,
        content,
        attachmentUrl,
        isInternal: isInternal ?? false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            surname: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    // Update message status and first response time if admin replied
    if (isAdmin && !isInternal) {
      const updateData: any = {
        status: MessageStatus.ANSWERED,
      };

      // Set first response time if not set
      if (!message.firstResponseAt) {
        updateData.firstResponseAt = new Date();
      }

      await prisma.studentMessage.update({
        where: { id: messageId },
        data: updateData,
      });
    } else if (!isAdmin) {
      // If student replied to an answered message, set it back to in progress
      if (message.status === MessageStatus.ANSWERED || message.status === MessageStatus.RESOLVED) {
        await prisma.studentMessage.update({
          where: { id: messageId },
          data: { status: MessageStatus.IN_PROGRESS },
        });
      }
    }

    return reply;
  }

  /**
   * Update message status
   */
  static async updateStatus(messageId: string, status: MessageStatus, adminId?: string) {
    const updateData: any = { status };

    if (status === MessageStatus.RESOLVED) {
      updateData.resolvedAt = new Date();
    }

    const message = await prisma.studentMessage.update({
      where: { id: messageId },
      data: updateData,
    });

    return message;
  }

  /**
   * Assign message to an admin
   */
  static async assignMessage(messageId: string, assignedToId: string | null) {
    const message = await prisma.studentMessage.update({
      where: { id: messageId },
      data: {
        assignedToId,
        status: assignedToId ? MessageStatus.IN_PROGRESS : MessageStatus.NEW,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            surname: true,
            avatar: true,
          },
        },
      },
    });

    return message;
  }

  /**
   * Update message priority
   */
  static async updatePriority(messageId: string, priority: MessagePriority) {
    const message = await prisma.studentMessage.update({
      where: { id: messageId },
      data: { priority },
    });

    return message;
  }

  /**
   * Add internal notes to a message
   */
  static async updateInternalNotes(messageId: string, notes: string) {
    const message = await prisma.studentMessage.update({
      where: { id: messageId },
      data: { internalNotes: notes },
    });

    return message;
  }

  /**
   * Delete a message
   */
  static async deleteMessage(messageId: string, userId: string, isAdmin: boolean = false) {
    const message = await prisma.studentMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (!isAdmin && message.userId !== userId) {
      throw new Error('You do not have permission to delete this message');
    }

    await prisma.studentMessage.delete({
      where: { id: messageId },
    });

    return { success: true };
  }

  /**
   * Bulk update message status
   */
  static async bulkUpdateStatus(messageIds: string[], status: MessageStatus) {
    const updateData: any = { status };

    if (status === MessageStatus.RESOLVED) {
      updateData.resolvedAt = new Date();
    }

    await prisma.studentMessage.updateMany({
      where: { id: { in: messageIds } },
      data: updateData,
    });

    return { success: true, count: messageIds.length };
  }

  /**
   * Bulk assign messages
   */
  static async bulkAssign(messageIds: string[], assignedToId: string | null) {
    await prisma.studentMessage.updateMany({
      where: { id: { in: messageIds } },
      data: {
        assignedToId,
        status: assignedToId ? MessageStatus.IN_PROGRESS : MessageStatus.NEW,
      },
    });

    return { success: true, count: messageIds.length };
  }

  // ==========================================
  // CANNED RESPONSES
  // ==========================================

  /**
   * Get all canned responses
   */
  static async getCannedResponses(category?: string) {
    const where: any = { isActive: true };
    if (category) where.category = category;

    const responses = await prisma.cannedResponse.findMany({
      where,
      orderBy: [
        { usageCount: 'desc' },
        { title: 'asc' },
      ],
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            surname: true,
          },
        },
      },
    });

    return responses;
  }

  /**
   * Create a canned response
   */
  static async createCannedResponse(
    createdById: string,
    title: string,
    content: string,
    category?: string,
    shortcut?: string
  ) {
    const response = await prisma.cannedResponse.create({
      data: {
        createdById,
        title,
        content,
        category,
        shortcut,
      },
    });

    return response;
  }

  /**
   * Update a canned response
   */
  static async updateCannedResponse(
    id: string,
    data: {
      title?: string;
      content?: string;
      category?: string;
      shortcut?: string;
      isActive?: boolean;
    }
  ) {
    const response = await prisma.cannedResponse.update({
      where: { id },
      data,
    });

    return response;
  }

  /**
   * Delete a canned response
   */
  static async deleteCannedResponse(id: string) {
    await prisma.cannedResponse.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * Use a canned response (increment usage count)
   */
  static async useCannedResponse(id: string) {
    const response = await prisma.cannedResponse.update({
      where: { id },
      data: {
        usageCount: { increment: 1 },
      },
    });

    return response;
  }

  // ==========================================
  // ANALYTICS
  // ==========================================

  /**
   * Get messaging analytics
   */
  static async getAnalytics(startDate?: Date, endDate?: Date) {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    const where = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    const [
      total,
      newMessages,
      inProgress,
      answered,
      resolved,
      messagesWithResponseTime,
      messagesWithResolutionTime,
      byPriority,
      messagesOverTime,
    ] = await Promise.all([
      prisma.studentMessage.count({ where }),
      prisma.studentMessage.count({ where: { ...where, status: MessageStatus.NEW } }),
      prisma.studentMessage.count({ where: { ...where, status: MessageStatus.IN_PROGRESS } }),
      prisma.studentMessage.count({ where: { ...where, status: MessageStatus.ANSWERED } }),
      prisma.studentMessage.count({ where: { ...where, status: MessageStatus.RESOLVED } }),
      // For response time calculation
      prisma.studentMessage.findMany({
        where: {
          ...where,
          firstResponseAt: { not: null },
        },
        select: {
          createdAt: true,
          firstResponseAt: true,
        },
      }),
      // For resolution time calculation
      prisma.studentMessage.findMany({
        where: {
          ...where,
          status: MessageStatus.RESOLVED,
          resolvedAt: { not: null },
        },
        select: {
          createdAt: true,
          resolvedAt: true,
        },
      }),
      // Get messages by priority
      prisma.studentMessage.groupBy({
        by: ['priority'],
        where,
        _count: true,
      }),
      // Messages over time
      prisma.$queryRaw<any[]>`
        SELECT
          DATE(created_at) as date,
          COUNT(*) as count
        FROM student_messages
        WHERE created_at >= ${startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
          AND created_at <= ${endDate || new Date()}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `
    ]);

    // Calculate average response time (in seconds)
    let avgResponseTime = 0;
    if (messagesWithResponseTime.length > 0) {
      const totalResponseTime = messagesWithResponseTime.reduce((sum, m) => {
        if (m.firstResponseAt) {
          return sum + (m.firstResponseAt.getTime() - m.createdAt.getTime());
        }
        return sum;
      }, 0);
      avgResponseTime = Math.round(totalResponseTime / messagesWithResponseTime.length / 1000); // in seconds
    }

    // Calculate average resolution time (in seconds)
    let avgResolutionTime = 0;
    if (messagesWithResolutionTime.length > 0) {
      const totalResolutionTime = messagesWithResolutionTime.reduce((sum, m) => {
        if (m.resolvedAt) {
          return sum + (m.resolvedAt.getTime() - m.createdAt.getTime());
        }
        return sum;
      }, 0);
      avgResolutionTime = Math.round(totalResolutionTime / messagesWithResolutionTime.length / 1000); // in seconds
    }

    // Open messages = NEW + IN_PROGRESS
    const openMessages = newMessages + inProgress;

    // Format messages by priority for frontend
    const messagesByPriority: Record<string, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      URGENT: 0,
    };
    byPriority.forEach(p => {
      messagesByPriority[p.priority] = p._count;
    });

    return {
      totalMessages: total,
      openMessages,
      resolvedMessages: resolved,
      avgResponseTime, // in seconds
      avgResolutionTime, // in seconds
      messagesByPriority,
      messagesOverTime: messagesOverTime.map((m: any) => ({
        date: m.date,
        count: parseInt(m.count)
      })),
      // Legacy fields for backward compatibility
      total,
      newMessages,
      inProgress,
      answered,
      resolved,
      avgResponseTimeMinutes: Math.round(avgResponseTime / 60),
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
    };
  }

  /**
   * Get team performance metrics
   */
  static async getTeamPerformance(startDate?: Date, endDate?: Date) {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    const where = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    // Get admin users
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
        avatar: true,
      },
    });

    // Get performance for each admin
    const performance = await Promise.all(
      admins.map(async (admin) => {
        const [assigned, resolved, messagesWithResponseTime] = await Promise.all([
          prisma.studentMessage.count({
            where: { ...where, assignedToId: admin.id },
          }),
          prisma.studentMessage.count({
            where: { ...where, assignedToId: admin.id, status: MessageStatus.RESOLVED },
          }),
          // Get messages with response time for this admin
          prisma.studentMessage.findMany({
            where: {
              ...where,
              assignedToId: admin.id,
              firstResponseAt: { not: null },
            },
            select: {
              createdAt: true,
              firstResponseAt: true,
            },
          }),
        ]);

        // Calculate average response time for this admin
        let avgResponseTime = 0;
        if (messagesWithResponseTime.length > 0) {
          const totalResponseTime = messagesWithResponseTime.reduce((sum, m) => {
            if (m.firstResponseAt) {
              return sum + (m.firstResponseAt.getTime() - m.createdAt.getTime());
            }
            return sum;
          }, 0);
          avgResponseTime = Math.round(totalResponseTime / messagesWithResponseTime.length / 1000); // in seconds
        }

        return {
          id: admin.id,
          name: admin.name,
          surname: admin.surname,
          email: admin.email,
          avatar: admin.avatar,
          messagesHandled: assigned,
          messagesResolved: resolved,
          avgResponseTime, // in seconds
          resolutionRate: assigned > 0 ? Math.round((resolved / assigned) * 100) : 0,
        };
      })
    );

    return performance;
  }

  /**
   * Mark message as read
   */
  static async markAsRead(messageId: string, userId: string) {
    const message = await prisma.studentMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Update status if NEW
    if (message.status === MessageStatus.NEW) {
      await prisma.studentMessage.update({
        where: { id: messageId },
        data: { status: MessageStatus.READ },
      });
    }

    return { success: true };
  }

  /**
   * Get unread message count for a user
   */
  static async getUnreadCount(userId: string, isAdmin: boolean = false) {
    let where: any = {};

    if (isAdmin) {
      // For admins, count new messages assigned to them or unassigned
      where = {
        OR: [
          { assignedToId: userId, status: MessageStatus.NEW },
          { assignedToId: null, status: MessageStatus.NEW },
        ],
      };
    } else {
      // For students, count messages with new admin replies
      const messages = await prisma.studentMessage.findMany({
        where: { userId },
        select: {
          id: true,
          replies: {
            where: { isInternal: false },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              user: { select: { role: true } },
              createdAt: true,
            },
          },
        },
      });

      // Count messages where last reply is from admin
      const unreadCount = messages.filter((m) => {
        const lastReply = m.replies[0];
        return lastReply && lastReply.user.role === 'ADMIN';
      }).length;

      return unreadCount;
    }

    return prisma.studentMessage.count({ where });
  }
}

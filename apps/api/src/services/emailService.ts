import { Resend } from 'resend';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Initialize Resend with API key
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  templateType?: string;
  userId?: string;
  metadata?: any;
}

export class EmailService {
  /**
   * Send a generic email and log it
   */
  static async sendEmail(options: SendEmailOptions): Promise<boolean> {
    const { to, subject, html, templateType, userId, metadata } = options;

    if (!resend) {
      console.warn('Resend API key not configured. Email not sent:', {
        to: options.to,
        subject: options.subject,
      });
      // In development, log the email instead of throwing an error
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 Email Details (Development):', {
          to: options.to,
          subject: options.subject,
          html: options.html,
        });
        // Log to database even in dev mode
        if (templateType) {
          await this.logEmail(to, userId, subject, templateType, 'sent', null, null, metadata);
        }
        return true;
      }
      throw new Error('Resend API key not configured');
    }

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      if (error) {
        console.error('Resend email error:', error);
        // Log failed email
        if (templateType) {
          await this.logEmail(to, userId, subject, templateType, 'failed', error.message, null, metadata);
        }
        throw new Error('Failed to send email');
      }

      console.log('✅ Email sent successfully:', data?.id);
      // Log successful email
      if (templateType) {
        await this.logEmail(to, userId, subject, templateType, 'sent', null, data?.id, metadata);
      }
      return true;
    } catch (error: any) {
      console.error('Resend email error:', error);
      // Log failed email
      if (templateType) {
        await this.logEmail(to, userId, subject, templateType, 'failed', error.message, null, metadata);
      }
      throw new Error('Failed to send email');
    }
  }

  /**
   * Log email to database
   */
  private static async logEmail(
    toEmail: string,
    toUserId: string | undefined,
    subject: string,
    templateType: string,
    status: string,
    errorMessage: string | null,
    messageId: string | null | undefined,
    metadata?: any
  ) {
    try {
      await prisma.emailLog.create({
        data: {
          toEmail,
          toUserId,
          subject,
          templateType,
          status,
          errorMessage,
          messageId,
          metadata,
        },
      });
    } catch (error) {
      console.error('Failed to log email:', error);
    }
  }

  /**
   * Send email verification email
   */
  static async sendVerificationEmail(
    email: string,
    name: string,
    verificationToken: string
  ): Promise<boolean> {
    const verificationUrl = `${FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: #f9f9f9;
              padding: 30px;
              border-radius: 10px;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #4F46E5;
              color: #ffffff;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Welcome to Course Platform!</h2>
            <p>Hi ${name},</p>
            <p>Thank you for registering with Course Platform. Please verify your email address to activate your account.</p>
            <a href="${verificationUrl}" class="button">Verify Email</a>
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #4F46E5;">${verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <div class="footer">
              <p>If you didn't create an account, please ignore this email.</p>
              <p>&copy; ${new Date().getFullYear()} Course Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Welcome to Course Platform!

      Hi ${name},

      Thank you for registering with Course Platform. Please verify your email address by clicking the link below:

      ${verificationUrl}

      This link will expire in 24 hours.

      If you didn't create an account, please ignore this email.
    `;

    return this.sendEmail({
      to: email,
      subject: 'Verify your email - Course Platform',
      html,
      text,
    });
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(
    email: string,
    name: string,
    resetToken: string
  ): Promise<boolean> {
    const resetUrl = `${FRONTEND_URL}/auth/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: #f9f9f9;
              padding: 30px;
              border-radius: 10px;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #EF4444;
              color: #ffffff;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
            }
            .warning {
              background: #FEF3C7;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
              border-left: 4px solid #F59E0B;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Password Reset Request</h2>
            <p>Hi ${name},</p>
            <p>We received a request to reset your password for your Course Platform account.</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #EF4444;">${resetUrl}</p>
            <div class="warning">
              <strong>Security Notice:</strong> This link will expire in 1 hour. If you didn't request this password reset, please ignore this email and your password will remain unchanged.
            </div>
            <div class="footer">
              <p>For security reasons, this link can only be used once.</p>
              <p>&copy; ${new Date().getFullYear()} Course Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Password Reset Request

      Hi ${name},

      We received a request to reset your password for your Course Platform account.

      Click the link below to reset your password:
      ${resetUrl}

      This link will expire in 1 hour.

      If you didn't request this password reset, please ignore this email and your password will remain unchanged.
    `;

    return this.sendEmail({
      to: email,
      subject: 'Password Reset - Course Platform',
      html,
      text,
    });
  }

  /**
   * Send new device login notification
   */
  static async sendNewDeviceLoginEmail(
    email: string,
    name: string,
    deviceInfo: {
      deviceName: string;
      deviceType: string;
      browser?: string;
      ipAddress: string;
      location?: string;
    }
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: #f9f9f9;
              padding: 30px;
              border-radius: 10px;
            }
            .device-info {
              background: #fff;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>New Device Login Detected</h2>
            <p>Hi ${name},</p>
            <p>We detected a new login to your Course Platform account from a new device:</p>
            <div class="device-info">
              <p><strong>Device:</strong> ${deviceInfo.deviceName}</p>
              <p><strong>Device Type:</strong> ${deviceInfo.deviceType}</p>
              ${deviceInfo.browser ? `<p><strong>Browser:</strong> ${deviceInfo.browser}</p>` : ''}
              <p><strong>IP Address:</strong> ${deviceInfo.ipAddress}</p>
              ${deviceInfo.location ? `<p><strong>Location:</strong> ${deviceInfo.location}</p>` : ''}
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <p>If this was you, you can safely ignore this email. If you don't recognize this activity, please secure your account immediately by changing your password.</p>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Course Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      New Device Login Detected

      Hi ${name},

      We detected a new login to your Course Platform account from a new device:

      Device: ${deviceInfo.deviceName}
      Device Type: ${deviceInfo.deviceType}
      ${deviceInfo.browser ? `Browser: ${deviceInfo.browser}` : ''}
      IP Address: ${deviceInfo.ipAddress}
      ${deviceInfo.location ? `Location: ${deviceInfo.location}` : ''}
      Time: ${new Date().toLocaleString()}

      If this was you, you can safely ignore this email. If you don't recognize this activity, please secure your account immediately by changing your password.
    `;

    return this.sendEmail({
      to: email,
      subject: 'New Device Login - Course Platform',
      html,
      text,
    });
  }

  // ==========================================
  // COMMUNICATION SYSTEM EMAILS
  // ==========================================

  /**
   * Send notification to admin when new message is received
   */
  static async sendNewMessageNotificationToAdmin(
    adminEmail: string,
    adminName: string,
    studentName: string,
    subject: string,
    messagePreview: string,
    messageId: string
  ): Promise<boolean> {
    const messageUrl = `${FRONTEND_URL}/admin/messages/${messageId}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .container { background: #f9f9f9; padding: 30px; border-radius: 10px; }
            .message-box { background: #fff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4F46E5; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: #ffffff; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>New Student Message</h2>
            <p>Hi ${adminName},</p>
            <p>You have received a new message from <strong>${studentName}</strong>:</p>
            <div class="message-box">
              <p><strong>Subject:</strong> ${subject}</p>
              <p>${messagePreview}...</p>
            </div>
            <a href="${messageUrl}" class="button">View & Reply</a>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Course Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: adminEmail,
      subject: `New Message: ${subject} - Course Platform`,
      html,
      templateType: 'new_message_admin',
      metadata: { messageId, studentName },
    });
  }

  /**
   * Send notification to student when admin replies to their message
   */
  static async sendMessageReplyNotification(
    studentEmail: string,
    studentName: string,
    adminName: string,
    messageSubject: string,
    replyPreview: string,
    messageId: string,
    userId: string
  ): Promise<boolean> {
    const messageUrl = `${FRONTEND_URL}/dashboard/messages/${messageId}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .container { background: #f9f9f9; padding: 30px; border-radius: 10px; }
            .message-box { background: #fff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10B981; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: #ffffff; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>You Have a New Reply</h2>
            <p>Hi ${studentName},</p>
            <p><strong>${adminName}</strong> has replied to your message:</p>
            <div class="message-box">
              <p><strong>Re: ${messageSubject}</strong></p>
              <p>${replyPreview}...</p>
            </div>
            <a href="${messageUrl}" class="button">View Full Reply</a>
            <div class="footer">
              <p>You're receiving this email because you have a message in Course Platform.</p>
              <p>&copy; ${new Date().getFullYear()} Course Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: studentEmail,
      subject: `Re: ${messageSubject} - Course Platform`,
      html,
      templateType: 'message_reply',
      userId,
      metadata: { messageId, adminName },
    });
  }

  /**
   * Send review approval notification
   */
  static async sendReviewApprovedEmail(
    email: string,
    name: string,
    courseName: string,
    reviewId: string,
    userId: string
  ): Promise<boolean> {
    const courseUrl = `${FRONTEND_URL}/courses`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .container { background: #f9f9f9; padding: 30px; border-radius: 10px; }
            .success-box { background: #D1FAE5; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10B981; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: #ffffff; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Your Review Has Been Published!</h2>
            <p>Hi ${name},</p>
            <div class="success-box">
              <p>Your review for <strong>${courseName}</strong> has been approved and is now visible to other students.</p>
            </div>
            <p>Thank you for sharing your feedback! Your insights help other students make informed decisions about their learning journey.</p>
            <a href="${courseUrl}" class="button">View Courses</a>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Course Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `Your Review Has Been Published - Course Platform`,
      html,
      templateType: 'review_approved',
      userId,
      metadata: { reviewId, courseName },
    });
  }

  /**
   * Send review rejection notification
   */
  static async sendReviewRejectedEmail(
    email: string,
    name: string,
    courseName: string,
    rejectionReason: string,
    reviewId: string,
    userId: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .container { background: #f9f9f9; padding: 30px; border-radius: 10px; }
            .info-box { background: #FEF3C7; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #F59E0B; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Review Update</h2>
            <p>Hi ${name},</p>
            <p>We've reviewed your submission for <strong>${courseName}</strong> and unfortunately, it couldn't be published at this time.</p>
            <div class="info-box">
              <p><strong>Reason:</strong></p>
              <p>${rejectionReason}</p>
            </div>
            <p>You're welcome to submit a new review that meets our community guidelines. We appreciate your understanding and continued participation in our learning community.</p>
            <div class="footer">
              <p>If you believe this was a mistake, please contact our support team.</p>
              <p>&copy; ${new Date().getFullYear()} Course Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `Review Update - Course Platform`,
      html,
      templateType: 'review_rejected',
      userId,
      metadata: { reviewId, courseName, rejectionReason },
    });
  }

  /**
   * Send comment reply notification
   */
  static async sendCommentReplyNotification(
    email: string,
    name: string,
    replierName: string,
    chapterTitle: string,
    courseTitle: string,
    commentPreview: string,
    chapterId: string,
    courseSlug: string,
    userId: string
  ): Promise<boolean> {
    const chapterUrl = `${FRONTEND_URL}/dashboard/courses/${courseSlug}/learn?chapter=${chapterId}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .container { background: #f9f9f9; padding: 30px; border-radius: 10px; }
            .comment-box { background: #fff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4F46E5; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: #ffffff; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>New Reply to Your Comment</h2>
            <p>Hi ${name},</p>
            <p><strong>${replierName}</strong> replied to your comment in <strong>${chapterTitle}</strong> (${courseTitle}):</p>
            <div class="comment-box">
              <p>"${commentPreview}..."</p>
            </div>
            <a href="${chapterUrl}" class="button">View Discussion</a>
            <div class="footer">
              <p>You can manage your notification preferences in your account settings.</p>
              <p>&copy; ${new Date().getFullYear()} Course Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `New Reply in ${courseTitle} - Course Platform`,
      html,
      templateType: 'comment_reply',
      userId,
      metadata: { chapterId, courseSlug, replierName },
    });
  }

  /**
   * Check if user has email notifications enabled
   */
  static async shouldSendNotification(userId: string, notificationType: 'comment' | 'review' | 'marketing'): Promise<boolean> {
    try {
      const preferences = await prisma.userPreferences.findUnique({
        where: { userId },
      });

      if (!preferences) {
        return true; // Default to sending if no preferences set
      }

      switch (notificationType) {
        case 'comment':
          return preferences.commentNotifications;
        case 'review':
          return preferences.reviewNotifications;
        case 'marketing':
          return preferences.marketingEmails;
        default:
          return preferences.emailNotifications;
      }
    } catch (error) {
      console.error('Error checking notification preferences:', error);
      return true; // Default to sending on error
    }
  }

  /**
   * Get email logs with filtering
   */
  static async getEmailLogs(filters: {
    userId?: string;
    templateType?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { userId, templateType, status, startDate, endDate, page = 1, limit = 20 } = filters;

    const where: any = {};
    if (userId) where.toUserId = userId;
    if (templateType) where.templateType = templateType;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.emailLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get email analytics
   */
  static async getEmailAnalytics(startDate?: Date, endDate?: Date) {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    const where = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    const [total, sent, failed, byTemplate] = await Promise.all([
      prisma.emailLog.count({ where }),
      prisma.emailLog.count({ where: { ...where, status: 'sent' } }),
      prisma.emailLog.count({ where: { ...where, status: 'failed' } }),
      prisma.emailLog.groupBy({
        by: ['templateType'],
        where,
        _count: true,
      }),
    ]);

    return {
      total,
      sent,
      failed,
      successRate: total > 0 ? Math.round((sent / total) * 100) : 0,
      byTemplate: byTemplate.reduce((acc, t) => {
        acc[t.templateType] = t._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

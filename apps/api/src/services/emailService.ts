import { Resend } from 'resend';
import { PrismaClient } from '@prisma/client';
import { generateCertificatePDF } from './certificatePdfService';

const prisma = new PrismaClient();

// Lazy initialization for Resend (to ensure env vars are loaded)
let resend: Resend | null = null;

const getResend = () => {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
};

const getFromEmail = () => process.env.FROM_EMAIL || 'onboarding@resend.dev';
const getFrontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:3000';

// ==========================================
// BRAND CONSTANTS
// ==========================================
const BRAND = {
  name: 'Kursebi.online',
  colors: {
    primary: '#0e3355',      // Navy Blue
    primaryLight: '#1a4a7a',
    accent: '#ff4d40',       // Coral Red
    accentDark: '#ed3124',
    success: '#10B981',
    warning: '#F59E0B',
    gray: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      500: '#6B7280',
      700: '#374151',
      900: '#1F2937',
    },
  },
  logoUrl: () => `${getFrontendUrl()}/kursebi-logo.png`,
  websiteUrl: () => getFrontendUrl(),
  supportEmail: 'info@kursebi.online',
};

// ==========================================
// BASE EMAIL TEMPLATE
// ==========================================
interface EmailTemplateOptions {
  title: string;
  subtitle?: string;
  headerIcon?: string;
  headerGradient?: 'primary' | 'accent' | 'success' | 'warning';
  content: string;
  showLogo?: boolean;
}

const createEmailTemplate = (options: EmailTemplateOptions): string => {
  const { title, subtitle, headerIcon, headerGradient = 'primary', content, showLogo = true } = options;

  const gradientMap = {
    primary: `linear-gradient(135deg, ${BRAND.colors.primary} 0%, ${BRAND.colors.primaryLight} 100%)`,
    accent: `linear-gradient(135deg, ${BRAND.colors.accent} 0%, ${BRAND.colors.accentDark} 100%)`,
    success: `linear-gradient(135deg, ${BRAND.colors.success} 0%, #059669 100%)`,
    warning: `linear-gradient(135deg, ${BRAND.colors.warning} 0%, #D97706 100%)`,
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: ${BRAND.colors.gray[900]};
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .email-wrapper {
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: ${gradientMap[headerGradient]};
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header-icon {
            font-size: 40px;
            margin-bottom: 10px;
          }
          .header h2 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 14px;
          }
          .logo-section {
            text-align: center;
            padding: 25px 30px 15px 30px;
            border-bottom: 1px solid ${BRAND.colors.gray[200]};
          }
          .logo-section img {
            max-width: 180px;
            height: auto;
          }
          .content {
            padding: 30px;
          }
          .button {
            display: inline-block;
            padding: 14px 28px;
            background: ${BRAND.colors.accent};
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 10px 5px;
            transition: background 0.3s;
          }
          .button:hover {
            background: ${BRAND.colors.accentDark};
          }
          .button-secondary {
            background: ${BRAND.colors.primary};
          }
          .button-secondary:hover {
            background: ${BRAND.colors.primaryLight};
          }
          .info-box {
            background: ${BRAND.colors.gray[50]};
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid ${BRAND.colors.primary};
          }
          .success-box {
            background: #D1FAE5;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid ${BRAND.colors.success};
          }
          .warning-box {
            background: #FEF3C7;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid ${BRAND.colors.warning};
          }
          .accent-box {
            background: #FFF5F4;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid ${BRAND.colors.accent};
          }
          .details-card {
            background: #ffffff;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border: 1px solid ${BRAND.colors.gray[200]};
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid ${BRAND.colors.gray[100]};
          }
          .detail-row:last-child {
            border-bottom: none;
          }
          .detail-label {
            color: ${BRAND.colors.gray[500]};
            font-size: 14px;
          }
          .detail-value {
            font-weight: 600;
            color: ${BRAND.colors.gray[900]};
          }
          .footer {
            background: ${BRAND.colors.gray[50]};
            padding: 25px 30px;
            text-align: center;
            border-top: 1px solid ${BRAND.colors.gray[200]};
          }
          .footer p {
            margin: 5px 0;
            font-size: 12px;
            color: ${BRAND.colors.gray[500]};
          }
          .footer a {
            color: ${BRAND.colors.primary};
            text-decoration: none;
          }
          .footer .brand-name {
            font-weight: 600;
            color: ${BRAND.colors.primary};
          }
          a {
            color: ${BRAND.colors.primary};
          }
          .link-text {
            word-break: break-all;
            color: ${BRAND.colors.primary};
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          ${showLogo ? `
          <div class="logo-section">
            <img src="${BRAND.logoUrl()}" alt="${BRAND.name}" />
          </div>
          ` : ''}

          <div class="header">
            ${headerIcon ? `<div class="header-icon">${headerIcon}</div>` : ''}
            <h2>${title}</h2>
            ${subtitle ? `<p>${subtitle}</p>` : ''}
          </div>

          <div class="content">
            ${content}
          </div>

          <div class="footer">
            <p>პატივისცემით,<br><span class="brand-name">${BRAND.name} გუნდი</span></p>
            <p style="margin-top: 15px;">
              <a href="${BRAND.websiteUrl()}">${BRAND.name}</a> |
              <a href="mailto:${BRAND.supportEmail}">${BRAND.supportEmail}</a>
            </p>
            <p>&copy; ${new Date().getFullYear()} ${BRAND.name}. ყველა უფლება დაცულია.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  templateType?: string;
  userId?: string;
  metadata?: any;
  attachments?: EmailAttachment[];
}

export class EmailService {
  /**
   * Send a generic email and log it
   */
  static async sendEmail(options: SendEmailOptions): Promise<boolean> {
    const { to, subject, html, templateType, userId, metadata, attachments } = options;
    const resendClient = getResend();

    if (!resendClient) {
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
          attachments: attachments?.map(a => ({ filename: a.filename, size: a.content.length })),
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
      // Prepare email payload
      const emailPayload: any = {
        from: getFromEmail(),
        to: options.to,
        subject: options.subject,
        html: options.html,
      };

      // Add attachments if provided
      if (attachments && attachments.length > 0) {
        emailPayload.attachments = attachments.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType || 'application/pdf',
        }));
      }

      const { data, error } = await resendClient.emails.send(emailPayload);

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
    const verificationUrl = `${getFrontendUrl()}/auth/verify-email?token=${verificationToken}`;

    const content = `
      <p>გამარჯობა <strong>${name}</strong>,</p>

      <p>მადლობა რომ დარეგისტრირდით ${BRAND.name}-ზე! გთხოვთ დაადასტუროთ თქვენი ელ-ფოსტა ანგარიშის გასააქტიურებლად.</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" class="button">ელ-ფოსტის დადასტურება</a>
      </div>

      <div class="info-box">
        <p style="margin: 0;"><strong>ან დააკოპირეთ ეს ბმული ბრაუზერში:</strong></p>
        <p class="link-text" style="margin: 10px 0 0 0;">${verificationUrl}</p>
      </div>

      <div class="warning-box">
        <p style="margin: 0;">⏰ ეს ბმული მოქმედებს <strong>24 საათის</strong> განმავლობაში.</p>
      </div>

      <p style="color: ${BRAND.colors.gray[500]}; font-size: 14px;">თუ თქვენ არ დარეგისტრირებულხართ ${BRAND.name}-ზე, უბრალოდ უგულებელყოთ ეს შეტყობინება.</p>
    `;

    const html = createEmailTemplate({
      title: 'ელ-ფოსტის დადასტურება',
      subtitle: 'გთხოვთ დაადასტუროთ თქვენი ანგარიში',
      headerIcon: '✉️',
      headerGradient: 'primary',
      content,
    });

    const text = `
გამარჯობა ${name},

მადლობა რომ დარეგისტრირდით ${BRAND.name}-ზე!

გთხოვთ დაადასტუროთ თქვენი ელ-ფოსტა ამ ბმულზე გადასვლით:
${verificationUrl}

ეს ბმული მოქმედებს 24 საათის განმავლობაში.

თუ თქვენ არ დარეგისტრირებულხართ, უგულებელყოთ ეს შეტყობინება.

${BRAND.name} გუნდი
    `;

    return this.sendEmail({
      to: email,
      subject: `ელ-ფოსტის დადასტურება - ${BRAND.name}`,
      html,
      text,
      templateType: 'email_verification',
      metadata: { verificationToken: verificationToken.substring(0, 10) + '...' },
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
    const resetUrl = `${getFrontendUrl()}/auth/reset-password?token=${resetToken}`;

    const content = `
      <p>გამარჯობა <strong>${name}</strong>,</p>

      <p>მივიღეთ მოთხოვნა თქვენი ${BRAND.name} ანგარიშის პაროლის აღდგენის შესახებ.</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" class="button">პაროლის აღდგენა</a>
      </div>

      <div class="info-box">
        <p style="margin: 0;"><strong>ან დააკოპირეთ ეს ბმული ბრაუზერში:</strong></p>
        <p class="link-text" style="margin: 10px 0 0 0;">${resetUrl}</p>
      </div>

      <div class="warning-box">
        <p style="margin: 0 0 10px 0;"><strong>🔒 უსაფრთხოების შეტყობინება:</strong></p>
        <ul style="margin: 0; padding-left: 20px;">
          <li>ეს ბმული მოქმედებს მხოლოდ <strong>1 საათის</strong> განმავლობაში</li>
          <li>ბმული შეიძლება გამოიყენოთ მხოლოდ ერთხელ</li>
          <li>თუ თქვენ არ მოითხოვეთ პაროლის აღდგენა, უგულებელყოთ ეს შეტყობინება</li>
        </ul>
      </div>
    `;

    const html = createEmailTemplate({
      title: 'პაროლის აღდგენა',
      subtitle: 'თქვენი პაროლის შეცვლის მოთხოვნა',
      headerIcon: '🔐',
      headerGradient: 'accent',
      content,
    });

    const text = `
გამარჯობა ${name},

მივიღეთ მოთხოვნა თქვენი ${BRAND.name} ანგარიშის პაროლის აღდგენის შესახებ.

პაროლის აღსადგენად გადადით ამ ბმულზე:
${resetUrl}

ეს ბმული მოქმედებს მხოლოდ 1 საათის განმავლობაში.

თუ თქვენ არ მოითხოვეთ პაროლის აღდგენა, უგულებელყოთ ეს შეტყობინება.

${BRAND.name} გუნდი
    `;

    return this.sendEmail({
      to: email,
      subject: `პაროლის აღდგენა - ${BRAND.name}`,
      html,
      text,
      templateType: 'password_reset',
      metadata: { resetToken: resetToken.substring(0, 10) + '...' },
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
    const loginTime = new Date().toLocaleString('ka-GE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const content = `
      <p>გამარჯობა <strong>${name}</strong>,</p>

      <p>აღმოვაჩინეთ ახალი მოწყობილობიდან შესვლა თქვენს ${BRAND.name} ანგარიშზე:</p>

      <div class="details-card">
        <div class="detail-row">
          <span class="detail-label">მოწყობილობა:</span>
          <span class="detail-value">${deviceInfo.deviceName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">ტიპი:</span>
          <span class="detail-value">${deviceInfo.deviceType}</span>
        </div>
        ${deviceInfo.browser ? `
        <div class="detail-row">
          <span class="detail-label">ბრაუზერი:</span>
          <span class="detail-value">${deviceInfo.browser}</span>
        </div>
        ` : ''}
        <div class="detail-row">
          <span class="detail-label">IP მისამართი:</span>
          <span class="detail-value">${deviceInfo.ipAddress}</span>
        </div>
        ${deviceInfo.location ? `
        <div class="detail-row">
          <span class="detail-label">მდებარეობა:</span>
          <span class="detail-value">${deviceInfo.location}</span>
        </div>
        ` : ''}
        <div class="detail-row">
          <span class="detail-label">დრო:</span>
          <span class="detail-value">${loginTime}</span>
        </div>
      </div>

      <div class="warning-box">
        <p style="margin: 0;"><strong>⚠️ ეს თქვენ იყავით?</strong></p>
        <p style="margin: 10px 0 0 0;">თუ ეს თქვენ იყავით, შეგიძლიათ უგულებელყოთ ეს შეტყობინება. თუ ამ აქტივობას ვერ ცნობთ, გთხოვთ დაუყოვნებლივ შეცვალოთ პაროლი ანგარიშის დასაცავად.</p>
      </div>

      <div style="text-align: center; margin: 25px 0;">
        <a href="${getFrontendUrl()}/dashboard/settings" class="button">ანგარიშის პარამეტრები</a>
      </div>
    `;

    const html = createEmailTemplate({
      title: 'ახალი მოწყობილობიდან შესვლა',
      subtitle: 'აღმოვაჩინეთ ახალი შესვლა თქვენს ანგარიშზე',
      headerIcon: '📱',
      headerGradient: 'warning',
      content,
    });

    const text = `
გამარჯობა ${name},

აღმოვაჩინეთ ახალი მოწყობილობიდან შესვლა თქვენს ${BRAND.name} ანგარიშზე:

მოწყობილობა: ${deviceInfo.deviceName}
ტიპი: ${deviceInfo.deviceType}
${deviceInfo.browser ? `ბრაუზერი: ${deviceInfo.browser}` : ''}
IP მისამართი: ${deviceInfo.ipAddress}
${deviceInfo.location ? `მდებარეობა: ${deviceInfo.location}` : ''}
დრო: ${loginTime}

თუ ეს თქვენ იყავით, შეგიძლიათ უგულებელყოთ ეს შეტყობინება. თუ ამ აქტივობას ვერ ცნობთ, გთხოვთ დაუყოვნებლივ შეცვალოთ პაროლი.

${BRAND.name} გუნდი
    `;

    return this.sendEmail({
      to: email,
      subject: `ახალი მოწყობილობიდან შესვლა - ${BRAND.name}`,
      html,
      text,
      templateType: 'new_device_login',
      metadata: { deviceName: deviceInfo.deviceName, ipAddress: deviceInfo.ipAddress },
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
    const messageUrl = `${getFrontendUrl()}/admin/messages/${messageId}`;

    const content = `
      <p>გამარჯობა <strong>${adminName}</strong>,</p>

      <p>მიიღეთ ახალი შეტყობინება <strong>${studentName}</strong>-სგან:</p>

      <div class="info-box">
        <p style="margin: 0 0 10px 0;"><strong>თემა:</strong> ${subject}</p>
        <p style="margin: 0; color: ${BRAND.colors.gray[700]};">${messagePreview}...</p>
      </div>

      <div style="text-align: center; margin: 25px 0;">
        <a href="${messageUrl}" class="button">შეტყობინების ნახვა და პასუხი</a>
      </div>
    `;

    const html = createEmailTemplate({
      title: 'ახალი შეტყობინება',
      subtitle: `${studentName}-სგან`,
      headerIcon: '💬',
      headerGradient: 'primary',
      content,
    });

    return this.sendEmail({
      to: adminEmail,
      subject: `ახალი შეტყობინება: ${subject} - ${BRAND.name}`,
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
    const messageUrl = `${getFrontendUrl()}/dashboard/messages/${messageId}`;

    const content = `
      <p>გამარჯობა <strong>${studentName}</strong>,</p>

      <p><strong>${adminName}</strong> უპასუხა თქვენს შეტყობინებას:</p>

      <div class="success-box">
        <p style="margin: 0 0 10px 0;"><strong>Re: ${messageSubject}</strong></p>
        <p style="margin: 0; color: ${BRAND.colors.gray[700]};">${replyPreview}...</p>
      </div>

      <div style="text-align: center; margin: 25px 0;">
        <a href="${messageUrl}" class="button">სრული პასუხის ნახვა</a>
      </div>

      <p style="color: ${BRAND.colors.gray[500]}; font-size: 14px;">ეს შეტყობინება გამოგეგზავნათ, რადგან თქვენ გაქვთ მიმოწერა ${BRAND.name}-ზე.</p>
    `;

    const html = createEmailTemplate({
      title: 'მიიღეთ პასუხი',
      subtitle: 'თქვენს შეტყობინებაზე',
      headerIcon: '✉️',
      headerGradient: 'success',
      content,
    });

    return this.sendEmail({
      to: studentEmail,
      subject: `Re: ${messageSubject} - ${BRAND.name}`,
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
    const courseUrl = `${getFrontendUrl()}/courses`;

    const content = `
      <p>გამარჯობა <strong>${name}</strong>,</p>

      <div class="success-box">
        <p style="margin: 0;"><strong>✅ თქვენი შეფასება გამოქვეყნდა!</strong></p>
        <p style="margin: 10px 0 0 0;">თქვენი შეფასება კურსზე <strong>„${courseName}"</strong> დამტკიცდა და ახლა ხილულია სხვა სტუდენტებისთვის.</p>
      </div>

      <p>მადლობა თქვენი გამოხმაურებისთვის! თქვენი აზრი ეხმარება სხვა სტუდენტებს სწავლის პროცესში სწორი გადაწყვეტილების მიღებაში.</p>

      <div style="text-align: center; margin: 25px 0;">
        <a href="${courseUrl}" class="button">კურსების ნახვა</a>
      </div>
    `;

    const html = createEmailTemplate({
      title: 'შეფასება გამოქვეყნდა!',
      subtitle: 'მადლობა თქვენი გამოხმაურებისთვის',
      headerIcon: '⭐',
      headerGradient: 'success',
      content,
    });

    return this.sendEmail({
      to: email,
      subject: `შეფასება გამოქვეყნდა - ${BRAND.name}`,
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
    const content = `
      <p>გამარჯობა <strong>${name}</strong>,</p>

      <p>განვიხილეთ თქვენი შეფასება კურსზე <strong>„${courseName}"</strong> და სამწუხაროდ, ამჟამად მისი გამოქვეყნება ვერ მოხერხდა.</p>

      <div class="warning-box">
        <p style="margin: 0 0 10px 0;"><strong>მიზეზი:</strong></p>
        <p style="margin: 0;">${rejectionReason}</p>
      </div>

      <p>შეგიძლიათ დაწეროთ ახალი შეფასება, რომელიც შეესაბამება ჩვენს სათემო წესებს. მადლობა გაგებისთვის და ჩვენი სასწავლო საზოგადოებაში მონაწილეობისთვის.</p>

      <div class="info-box">
        <p style="margin: 0;">თუ მიგაჩნიათ რომ ეს შეცდომაა, გთხოვთ დაგვიკავშირდეთ: <a href="mailto:${BRAND.supportEmail}">${BRAND.supportEmail}</a></p>
      </div>
    `;

    const html = createEmailTemplate({
      title: 'შეფასების განახლება',
      subtitle: 'თქვენი შეფასების სტატუსი',
      headerIcon: '📝',
      headerGradient: 'warning',
      content,
    });

    return this.sendEmail({
      to: email,
      subject: `შეფასების განახლება - ${BRAND.name}`,
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
    const chapterUrl = `${getFrontendUrl()}/dashboard/courses/${courseSlug}/learn?chapter=${chapterId}`;

    const content = `
      <p>გამარჯობა <strong>${name}</strong>,</p>

      <p><strong>${replierName}</strong> უპასუხა თქვენს კომენტარს თავში <strong>„${chapterTitle}"</strong> (${courseTitle}):</p>

      <div class="info-box">
        <p style="margin: 0; font-style: italic; color: ${BRAND.colors.gray[700]};">"${commentPreview}..."</p>
      </div>

      <div style="text-align: center; margin: 25px 0;">
        <a href="${chapterUrl}" class="button">დისკუსიის ნახვა</a>
      </div>

      <p style="color: ${BRAND.colors.gray[500]}; font-size: 14px;">შეტყობინებების პარამეტრების შეცვლა შეგიძლიათ თქვენი ანგარიშის პარამეტრებში.</p>
    `;

    const html = createEmailTemplate({
      title: 'ახალი პასუხი კომენტარზე',
      subtitle: `კურსში: ${courseTitle}`,
      headerIcon: '💬',
      headerGradient: 'primary',
      content,
    });

    return this.sendEmail({
      to: email,
      subject: `ახალი პასუხი: ${courseTitle} - ${BRAND.name}`,
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

  // ==========================================
  // COURSE SUBMISSION EMAILS
  // ==========================================

  /**
   * Send confirmation email to user who submitted a course
   */
  static async sendCourseSubmissionConfirmation(
    email: string,
    firstName: string,
    courseTitle: string
  ): Promise<boolean> {
    const content = `
      <p>გამარჯობა <strong>${firstName}</strong>,</p>

      <div class="success-box">
        <p style="margin: 0;"><strong>✅ თქვენი კურსის განაცხადი წარმატებით გაიგზავნა!</strong></p>
        <p style="margin: 10px 0 0 0;">კურსი: <strong>„${courseTitle}"</strong></p>
      </div>

      <div class="info-box">
        <p style="margin: 0 0 10px 0;"><strong>📋 შემდეგი ნაბიჯები:</strong></p>
        <ul style="margin: 0; padding-left: 20px;">
          <li>ჩვენი გუნდი განიხილავს თქვენს განაცხადს 2-3 სამუშაო დღის განმავლობაში</li>
          <li>დამატებითი ინფორმაციის საჭიროების შემთხვევაში დაგიკავშირდებით</li>
          <li>განაცხადის დამტკიცების შემდეგ მიიღებთ შეტყობინებას</li>
        </ul>
      </div>

      <p>თუ გაქვთ კითხვები, გთხოვთ დაგვიკავშირდეთ: <a href="mailto:${BRAND.supportEmail}">${BRAND.supportEmail}</a></p>
    `;

    const html = createEmailTemplate({
      title: 'განაცხადი მიღებულია!',
      subtitle: 'მადლობა თქვენი მოთხოვნისთვის',
      headerIcon: '📝',
      headerGradient: 'success',
      content,
    });

    return this.sendEmail({
      to: email,
      subject: `განაცხადი მიღებულია: ${courseTitle} - ${BRAND.name}`,
      html,
      templateType: 'course_submission_confirmation',
      metadata: { courseTitle },
    });
  }

  /**
   * Send notification email to admin about new course submission
   */
  static async sendCourseSubmissionNotificationToAdmin(
    adminEmail: string,
    submissionId: string,
    authorName: string,
    authorEmail: string,
    authorPhone: string,
    courseTitle: string,
    courseDescription: string,
    driveLink: string | null,
    files: { fileName: string; fileSize: number; mimeType: string; filePath: string }[]
  ): Promise<boolean> {
    const formatFileSize = (bytes: number) => {
      if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
      }
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const filesHtml = files.length > 0
      ? files.map(f => `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid ${BRAND.colors.gray[200]};">
              <strong>${f.fileName}</strong>
              <br><span style="color: ${BRAND.colors.gray[500]}; font-size: 12px;">${formatFileSize(f.fileSize)}</span>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid ${BRAND.colors.gray[200]}; text-align: right; white-space: nowrap;">
              <a href="${f.filePath}"
                 target="_blank"
                 style="background: ${BRAND.colors.primary}; color: white; padding: 8px 14px; border-radius: 6px; text-decoration: none; font-size: 13px; display: inline-block; margin-right: 8px;">
                ნახვა
              </a>
              <a href="${f.filePath}"
                 download
                 style="background: ${BRAND.colors.accent}; color: white; padding: 8px 14px; border-radius: 6px; text-decoration: none; font-size: 13px; display: inline-block;">
                გადმოწერა
              </a>
            </td>
          </tr>
        `).join('')
      : `<tr><td colspan="2" style="padding: 12px; text-align: center; color: ${BRAND.colors.gray[500]};">არ არის ატვირთული</td></tr>`;

    const content = `
      <div class="details-card">
        <div class="detail-row">
          <span class="detail-label">განაცხადის ID:</span>
          <span class="detail-value" style="font-family: monospace;">${submissionId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">ავტორი:</span>
          <span class="detail-value">${authorName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">ელ-ფოსტა:</span>
          <span class="detail-value"><a href="mailto:${authorEmail}">${authorEmail}</a></span>
        </div>
        <div class="detail-row">
          <span class="detail-label">ტელეფონი:</span>
          <span class="detail-value"><a href="tel:${authorPhone}">${authorPhone}</a></span>
        </div>
        <div class="detail-row">
          <span class="detail-label">კურსი:</span>
          <span class="detail-value"><strong>${courseTitle}</strong></span>
        </div>
      </div>

      <div class="info-box">
        <p style="margin: 0 0 10px 0;"><strong>კურსის აღწერა:</strong></p>
        <p style="margin: 0; color: ${BRAND.colors.gray[700]};">${courseDescription.substring(0, 500)}${courseDescription.length > 500 ? '...' : ''}</p>
      </div>

      ${driveLink ? `
      <div class="accent-box">
        <p style="margin: 0;"><strong>📁 Drive ლინკი:</strong></p>
        <p style="margin: 10px 0 0 0;"><a href="${driveLink}" target="_blank">${driveLink}</a></p>
      </div>
      ` : ''}

      <div class="details-card">
        <p style="margin: 0 0 15px 0;"><strong>📎 ატვირთული ფაილები (${files.length}):</strong></p>
        <table style="width: 100%; border-collapse: collapse;">${filesHtml}</table>
      </div>

      <div class="warning-box">
        <p style="margin: 0;"><strong>⚡ მოქმედება საჭიროა:</strong> გთხოვთ განიხილოთ განაცხადი და დაუკავშირდეთ ავტორს.</p>
      </div>
    `;

    const html = createEmailTemplate({
      title: 'ახალი კურსის განაცხადი',
      subtitle: `${authorName}-სგან`,
      headerIcon: '📚',
      headerGradient: 'warning',
      content,
    });

    return this.sendEmail({
      to: adminEmail,
      subject: `ახალი კურსის განაცხადი: ${courseTitle} - ${BRAND.name}`,
      html,
      templateType: 'course_submission_admin_notification',
      metadata: { submissionId, authorName, courseTitle },
    });
  }

  // ==========================================
  // COURSE BOOKING EMAILS
  // ==========================================

  /**
   * Send course booking notification to admin
   */
  static async sendCourseBookingNotification(
    adminEmail: string,
    bookingData: {
      courseId: string;
      courseTitle: string;
      firstName: string;
      lastName: string;
      phone: string;
      email: string;
      preferredDays: string[];
      preferredTimeFrom: string;
      preferredTimeTo: string;
      comment: string;
    }
  ): Promise<boolean> {
    const dayLabels: Record<string, string> = {
      monday: 'ორშაბათი',
      tuesday: 'სამშაბათი',
      wednesday: 'ოთხშაბათი',
      thursday: 'ხუთშაბათი',
      friday: 'პარასკევი',
      saturday: 'შაბათი',
      sunday: 'კვირა',
    };

    const formattedDays = bookingData.preferredDays
      .map(day => dayLabels[day] || day)
      .join(', ');

    const submissionDate = new Date().toLocaleString('ka-GE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const content = `
      <div class="details-card">
        <p style="margin: 0 0 15px 0; font-weight: bold; color: ${BRAND.colors.gray[500]}; text-transform: uppercase; font-size: 12px;">👤 მომხმარებლის ინფორმაცია</p>
        <div class="detail-row">
          <span class="detail-label">სახელი, გვარი:</span>
          <span class="detail-value">${bookingData.firstName} ${bookingData.lastName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">ტელეფონი:</span>
          <span class="detail-value"><a href="tel:${bookingData.phone}">${bookingData.phone}</a></span>
        </div>
        <div class="detail-row">
          <span class="detail-label">ელ-ფოსტა:</span>
          <span class="detail-value"><a href="mailto:${bookingData.email}">${bookingData.email}</a></span>
        </div>
      </div>

      <div class="info-box">
        <p style="margin: 0 0 10px 0;"><strong>🕐 სასურველი დრო:</strong></p>
        <p style="margin: 0;"><strong>დღეები:</strong> ${formattedDays}</p>
        <p style="margin: 5px 0 0 0;"><strong>საათები:</strong> ${bookingData.preferredTimeFrom} - ${bookingData.preferredTimeTo}</p>
      </div>

      ${bookingData.comment ? `
      <div class="accent-box">
        <p style="margin: 0 0 10px 0;"><strong>💬 კომენტარი:</strong></p>
        <p style="margin: 0; font-style: italic;">${bookingData.comment}</p>
      </div>
      ` : ''}

      <div class="warning-box">
        <p style="margin: 0;"><strong>⚡ მოქმედება საჭიროა:</strong> გთხოვთ დაუკავშირდეთ მომხმარებელს რაც შეიძლება სწრაფად.</p>
      </div>

      <p style="color: ${BRAND.colors.gray[500]}; font-size: 12px; text-align: center; margin-top: 20px;">გაგზავნის თარიღი: ${submissionDate}</p>
    `;

    const html = createEmailTemplate({
      title: 'ახალი ინდივიდუალური ჯავშნა',
      subtitle: bookingData.courseTitle,
      headerIcon: '📅',
      headerGradient: 'primary',
      content,
    });

    const text = `
ახალი ინდივიდუალური ჯავშნა - ${BRAND.name}

კურსი: ${bookingData.courseTitle}

მომხმარებლის ინფორმაცია:
სახელი: ${bookingData.firstName} ${bookingData.lastName}
ტელეფონი: ${bookingData.phone}
ელ-ფოსტა: ${bookingData.email}

სასურველი დრო:
დღეები: ${formattedDays}
საათები: ${bookingData.preferredTimeFrom} - ${bookingData.preferredTimeTo}

${bookingData.comment ? `კომენტარი: ${bookingData.comment}` : ''}

გაგზავნის თარიღი: ${submissionDate}
    `;

    return this.sendEmail({
      to: adminEmail,
      subject: `📅 ახალი ჯავშნა: ${bookingData.courseTitle} - ${BRAND.name}`,
      html,
      text,
      templateType: 'course_booking',
      metadata: {
        courseId: bookingData.courseId,
        courseTitle: bookingData.courseTitle,
        customerEmail: bookingData.email,
        customerPhone: bookingData.phone,
      },
    });
  }

  /**
   * Send booking confirmation to customer
   */
  static async sendCourseBookingConfirmation(
    customerEmail: string,
    bookingData: {
      firstName: string;
      lastName: string;
      courseTitle: string;
      preferredDays: string[];
      preferredTimeFrom: string;
      preferredTimeTo: string;
    }
  ): Promise<boolean> {
    const dayLabels: Record<string, string> = {
      monday: 'ორშაბათი',
      tuesday: 'სამშაბათი',
      wednesday: 'ოთხშაბათი',
      thursday: 'ხუთშაბათი',
      friday: 'პარასკევი',
      saturday: 'შაბათი',
      sunday: 'კვირა',
    };

    const formattedDays = bookingData.preferredDays
      .map(day => dayLabels[day] || day)
      .join(', ');

    const content = `
      <p>გამარჯობა <strong>${bookingData.firstName}</strong>,</p>

      <p>თქვენი განაცხადი ინდივიდუალური კურსის შესახებ წარმატებით მიღებულია. ჩვენი გუნდი მალე დაგიკავშირდებათ.</p>

      <div class="accent-box">
        <p style="margin: 0;"><strong>📚 კურსი:</strong></p>
        <p style="margin: 10px 0 0 0; font-size: 18px;"><strong>${bookingData.courseTitle}</strong></p>
      </div>

      <div class="info-box">
        <p style="margin: 0 0 10px 0;"><strong>🕐 თქვენი სასურველი დრო:</strong></p>
        <p style="margin: 0;"><strong>დღეები:</strong> ${formattedDays}</p>
        <p style="margin: 5px 0 0 0;"><strong>საათები:</strong> ${bookingData.preferredTimeFrom} - ${bookingData.preferredTimeTo}</p>
      </div>

      <div class="details-card">
        <p style="margin: 0 0 10px 0;"><strong>📋 შემდეგი ნაბიჯები:</strong></p>
        <ul style="margin: 0; padding-left: 20px; color: ${BRAND.colors.gray[700]};">
          <li>ჩვენი კონსულტანტი დაგიკავშირდებათ 24 საათის განმავლობაში</li>
          <li>შევათანხმებთ ზუსტ განრიგს და დეტალებს</li>
          <li>მიიღებთ ინფორმაციას გადახდის შესახებ</li>
        </ul>
      </div>

      <p style="color: ${BRAND.colors.gray[500]}; font-size: 14px;">გაქვთ კითხვები? დაგვიკავშირდით: <a href="mailto:${BRAND.supportEmail}">${BRAND.supportEmail}</a></p>
    `;

    const html = createEmailTemplate({
      title: 'განაცხადი მიღებულია!',
      subtitle: 'მადლობა დაინტერესებისთვის',
      headerIcon: '✅',
      headerGradient: 'accent',
      content,
    });

    const text = `
გამარჯობა ${bookingData.firstName},

თქვენი განაცხადი ინდივიდუალური კურსის შესახებ წარმატებით მიღებულია!

კურსი: ${bookingData.courseTitle}

თქვენი სასურველი დრო:
- დღეები: ${formattedDays}
- საათები: ${bookingData.preferredTimeFrom} - ${bookingData.preferredTimeTo}

შემდეგი ნაბიჯები:
1. ჩვენი კონსულტანტი დაგიკავშირდებათ 24 საათის განმავლობაში
2. შევათანხმებთ ზუსტ განრიგს და დეტალებს
3. მიიღებთ ინფორმაციას გადახდის შესახებ

გაქვთ კითხვები? დაგვიკავშირდით: ${BRAND.supportEmail}

${BRAND.name} გუნდი
    `;

    return this.sendEmail({
      to: customerEmail,
      subject: `✅ განაცხადი მიღებულია - ${bookingData.courseTitle} - ${BRAND.name}`,
      html,
      text,
      templateType: 'course_booking_confirmation',
      metadata: {
        courseTitle: bookingData.courseTitle,
        customerName: `${bookingData.firstName} ${bookingData.lastName}`,
      },
    });
  }

  /**
   * Send admin email to student
   */
  static async sendAdminEmailToStudent(
    email: string,
    name: string,
    subject: string,
    emailContent: string,
    userId: string
  ): Promise<boolean> {
    const templateContent = `
      <p>გამარჯობა <strong>${name}</strong>,</p>

      <div class="info-box">
        ${emailContent.replace(/\n/g, '<br>')}
      </div>

      <p style="color: ${BRAND.colors.gray[500]}; font-size: 14px;">ეს შეტყობინება გამოგზავნილია ${BRAND.name} ადმინისტრაციის მიერ.</p>
    `;

    const html = createEmailTemplate({
      title: subject,
      subtitle: `${BRAND.name} ადმინისტრაცია`,
      headerIcon: '📧',
      headerGradient: 'primary',
      content: templateContent,
    });

    return this.sendEmail({
      to: email,
      subject: `${subject} - ${BRAND.name}`,
      html,
      templateType: 'admin_email',
      userId,
      metadata: { subject },
    });
  }

  // ==========================================
  // COURSE COMPLETION & CERTIFICATE EMAILS
  // ==========================================

  /**
   * Send course completion email when student finishes a course
   */
  static async sendCourseCompletionEmail(
    email: string,
    studentName: string,
    courseTitle: string,
    courseSlug: string,
    userId: string
  ): Promise<boolean> {
    const certificateUrl = `${getFrontendUrl()}/dashboard/courses/${courseSlug}/learn`;
    const certificatesPageUrl = `${getFrontendUrl()}/dashboard/certificates`;

    const content = `
      <p>გამარჯობა <strong>${studentName}</strong>,</p>

      <p>ჩვენ გვინდა გილოცოთ კურსის წარმატებით დასრულება!</p>

      <div class="accent-box">
        <p style="margin: 0; font-size: 20px; font-weight: bold; color: ${BRAND.colors.primary};">„${courseTitle}"</p>
      </div>

      <div class="info-box">
        <p style="margin: 0 0 15px 0;"><strong>📜 როგორ აიღოთ სერტიფიკატი:</strong></p>
        <ol style="margin: 0; padding-left: 20px; color: ${BRAND.colors.gray[700]};">
          <li style="margin-bottom: 8px;">შედით თქვენს პროფილში</li>
          <li style="margin-bottom: 8px;">გახსენით კურსი და დააჭირეთ „სერტიფიკატის გენერაცია" ღილაკს</li>
          <li style="margin-bottom: 8px;">შეიყვანეთ თქვენი სახელი და გვარი (როგორც გსურთ რომ გამოჩნდეს სერტიფიკატზე)</li>
          <li>ჩამოტვირთეთ სერტიფიკატი PDF ფორმატში</li>
        </ol>
      </div>

      <div style="text-align: center; margin: 25px 0;">
        <a href="${certificateUrl}" class="button">სერტიფიკატის აღება</a>
        <a href="${certificatesPageUrl}" class="button button-secondary">ჩემი სერტიფიკატები</a>
      </div>

      <p style="color: ${BRAND.colors.gray[500]}; font-size: 14px;">სერტიფიკატი დაადასტურებს თქვენს კვალიფიკაციას და შეგიძლიათ გაუზიაროთ დამსაქმებლებს ან სოციალურ ქსელებში.</p>
    `;

    const html = createEmailTemplate({
      title: 'გილოცავთ!',
      subtitle: 'კურსი წარმატებით დაასრულეთ',
      headerIcon: '🎉',
      headerGradient: 'success',
      content,
    });

    const text = `
გილოცავთ, ${studentName}!

კურსი წარმატებით დაასრულეთ: "${courseTitle}"

როგორ აიღოთ სერტიფიკატი:
1. შედით თქვენს პროფილში
2. გახსენით კურსი და დააჭირეთ „სერტიფიკატის გენერაცია" ღილაკს
3. შეიყვანეთ თქვენი სახელი და გვარი
4. ჩამოტვირთეთ სერტიფიკატი PDF ფორმატში

სერტიფიკატის აღება: ${certificateUrl}
ჩემი სერტიფიკატები: ${certificatesPageUrl}

მადლობა რომ სწავლობთ ჩვენთან!
${BRAND.name} გუნდი
    `;

    return this.sendEmail({
      to: email,
      subject: `🎉 გილოცავთ! კურსი "${courseTitle}" დასრულებულია - ${BRAND.name}`,
      html,
      text,
      templateType: 'course_completion',
      userId,
      metadata: { courseTitle, courseSlug },
    });
  }

  /**
   * Send certificate ready email when certificate is generated
   */
  static async sendCertificateReadyEmail(
    email: string,
    studentName: string,
    courseTitle: string,
    certificateNumber: string,
    certificateId: string,
    score: number,
    userId: string
  ): Promise<boolean> {
    const certificateUrl = `${getFrontendUrl()}/dashboard/certificates/${certificateId}`;
    const certificatesPageUrl = `${getFrontendUrl()}/dashboard/certificates`;

    // Generate PDF certificate
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await generateCertificatePDF({
        studentName,
        courseTitle,
        certificateNumber,
        issuedAt: new Date(),
        score,
      });
      console.log('✅ Certificate PDF generated successfully');
    } catch (pdfError) {
      console.error('Failed to generate certificate PDF:', pdfError);
    }

    const content = `
      <p>გამარჯობა <strong>${studentName}</strong>,</p>

      <p>თქვენი სერტიფიკატი წარმატებით შეიქმნა და მზადაა ჩამოსატვირთად!</p>

      <div class="details-card" style="text-align: center; border: 2px solid ${BRAND.colors.primary};">
        <p style="margin: 0; font-size: 12px; color: ${BRAND.colors.gray[500]}; text-transform: uppercase; letter-spacing: 2px;">სერტიფიკატი</p>
        <p style="margin: 15px 0; font-size: 22px; font-weight: bold; color: ${BRAND.colors.primary};">${studentName}</p>
        <p style="margin: 10px 0; color: ${BRAND.colors.gray[700]};">„${courseTitle}"</p>
        <p style="margin: 15px 0;">
          <span style="display: inline-block; background: ${BRAND.colors.accent}; color: white; padding: 8px 20px; border-radius: 20px; font-weight: bold;">${Math.round(score)}%</span>
        </p>
        <p style="margin: 15px 0 0 0; font-size: 12px; color: ${BRAND.colors.gray[500]}; font-family: monospace;">ID: ${certificateNumber}</p>
      </div>

      <div style="text-align: center; margin: 25px 0;">
        <a href="${certificateUrl}" class="button">სერტიფიკატის ნახვა</a>
        <a href="${certificatesPageUrl}" class="button button-secondary">ჩემი სერტიფიკატები</a>
      </div>

      <div class="info-box" style="text-align: center;">
        <p style="margin: 0;">
          <span style="display: inline-block; margin: 0 15px;">📥 PDF ჩამოტვირთვა</span>
          <span style="display: inline-block; margin: 0 15px;">🔗 გაზიარება</span>
          <span style="display: inline-block; margin: 0 15px;">✓ ვერიფიცირებული</span>
        </p>
      </div>

      <p style="color: ${BRAND.colors.gray[500]}; font-size: 14px; text-align: center;">
        სერტიფიკატი შეგიძლიათ გაუზიაროთ LinkedIn-ზე, CV-ში ან დამსაქმებლებს.
      </p>
    `;

    const html = createEmailTemplate({
      title: 'სერტიფიკატი მზადაა!',
      subtitle: 'წარმატებული დასრულება',
      headerIcon: '📜',
      headerGradient: 'primary',
      content,
    });

    const text = `
გამარჯობა ${studentName},

თქვენი სერტიფიკატი მზადაა!

კურსი: "${courseTitle}"
ქულა: ${Math.round(score)}%
სერტიფიკატის ID: ${certificateNumber}

სერტიფიკატის ნახვა და ჩამოტვირთვა: ${certificateUrl}
ჩემი სერტიფიკატები: ${certificatesPageUrl}

სერტიფიკატი შეგიძლიათ გაუზიაროთ LinkedIn-ზე, CV-ში ან დამსაქმებლებს.

გისურვებთ წარმატებებს!
${BRAND.name} გუნდი
    `;

    // Prepare attachments
    const attachments = pdfBuffer ? [
      {
        filename: `certificate-${certificateNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }
    ] : undefined;

    return this.sendEmail({
      to: email,
      subject: `📜 სერტიფიკატი მზადაა - "${courseTitle}" - ${BRAND.name}`,
      html,
      text,
      templateType: 'certificate_ready',
      userId,
      metadata: { courseTitle, certificateNumber, certificateId, score },
      attachments,
    });
  }

  // ==========================================
  // REFUND EMAILS
  // ==========================================

  /**
   * Send email when student submits refund request (PENDING status)
   */
  static async sendRefundRequestReceivedEmail(
    email: string,
    name: string,
    courseTitle: string,
    requestedAmount: number,
    userId: string
  ): Promise<boolean> {
    const dashboardUrl = `${getFrontendUrl()}/dashboard/refunds`;

    const content = `
      <p>გამარჯობა <strong>${name}</strong>,</p>

      <div class="warning-box">
        <p style="margin: 0;"><strong>თქვენი თანხის დაბრუნების მოთხოვნა მიღებულია და განხილვის პროცესშია.</strong></p>
      </div>

      <div class="details-card">
        <div class="detail-row">
          <span class="detail-label">კურსი:</span>
          <span class="detail-value">${courseTitle}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">მოთხოვნილი თანხა:</span>
          <span class="detail-value">${requestedAmount.toFixed(2)} ₾</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">სტატუსი:</span>
          <span class="detail-value" style="color: ${BRAND.colors.warning};">განხილვის პროცესში</span>
        </div>
      </div>

      <p>ჩვენი გუნდი განიხილავს თქვენს მოთხოვნას და მალე მიიღებთ შეტყობინებას.</p>

      <div style="text-align: center; margin: 25px 0;">
        <a href="${dashboardUrl}" class="button">მოთხოვნის ნახვა</a>
      </div>
    `;

    const html = createEmailTemplate({
      title: 'მოთხოვნა მიღებულია',
      subtitle: 'თანხის დაბრუნების მოთხოვნა',
      headerIcon: '📝',
      headerGradient: 'warning',
      content,
    });

    return this.sendEmail({
      to: email,
      subject: `მოთხოვნა მიღებულია - ${courseTitle} - ${BRAND.name}`,
      html,
      templateType: 'refund_request_received',
      userId,
      metadata: { courseTitle, requestedAmount },
    });
  }

  /**
   * Send email when admin approves refund request (PROCESSING status)
   */
  static async sendRefundApprovedEmail(
    email: string,
    name: string,
    courseTitle: string,
    amount: number,
    userId: string
  ): Promise<boolean> {
    const dashboardUrl = `${getFrontendUrl()}/dashboard/refunds`;

    const content = `
      <p>გამარჯობა <strong>${name}</strong>,</p>

      <div class="success-box">
        <p style="margin: 0;"><strong>✅ თქვენი თანხის დაბრუნების მოთხოვნა დადასტურდა!</strong></p>
        <p style="margin: 10px 0 0 0;">თანხის დაბრუნების პროცესი დაიწყო და მალე მიიღებთ თანხას თქვენს ანგარიშზე.</p>
      </div>

      <div class="details-card">
        <div class="detail-row">
          <span class="detail-label">კურსი:</span>
          <span class="detail-value">${courseTitle}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">დასაბრუნებელი თანხა:</span>
          <span class="detail-value" style="color: ${BRAND.colors.success};">${amount.toFixed(2)} ₾</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">სტატუსი:</span>
          <span class="detail-value" style="color: ${BRAND.colors.primary};">მუშავდება</span>
        </div>
      </div>

      <div class="info-box">
        <p style="margin: 0;"><strong>ℹ️ რას ნიშნავს "მუშავდება"?</strong></p>
        <p style="margin: 10px 0 0 0;">თანხის დაბრუნების მოთხოვნა გაიგზავნა ბანკში. თანხა თქვენს ანგარიშზე დაბრუნდება რამდენიმე სამუშაო დღის განმავლობაში.</p>
      </div>

      <div style="text-align: center; margin: 25px 0;">
        <a href="${dashboardUrl}" class="button">სტატუსის ნახვა</a>
      </div>
    `;

    const html = createEmailTemplate({
      title: 'მოთხოვნა დადასტურდა',
      subtitle: 'თანხის დაბრუნება მუშავდება',
      headerIcon: '✅',
      headerGradient: 'primary',
      content,
    });

    return this.sendEmail({
      to: email,
      subject: `მოთხოვნა დადასტურდა - ${courseTitle} - ${BRAND.name}`,
      html,
      templateType: 'refund_approved',
      userId,
      metadata: { courseTitle, amount },
    });
  }

  /**
   * Send email when refund is completed (COMPLETED status)
   */
  static async sendRefundCompletedEmail(
    email: string,
    name: string,
    courseTitle: string,
    amount: number,
    userId: string
  ): Promise<boolean> {
    const content = `
      <p>გამარჯობა <strong>${name}</strong>,</p>

      <div class="success-box" style="text-align: center;">
        <p style="margin: 0;">თქვენი თანხის დაბრუნება წარმატებით დასრულდა!</p>
        <p style="margin: 15px 0; font-size: 32px; font-weight: bold; color: ${BRAND.colors.success};">${amount.toFixed(2)} ₾</p>
      </div>

      <div class="details-card">
        <div class="detail-row">
          <span class="detail-label">კურსი:</span>
          <span class="detail-value">${courseTitle}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">დაბრუნებული თანხა:</span>
          <span class="detail-value" style="color: ${BRAND.colors.success};">${amount.toFixed(2)} ₾</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">სტატუსი:</span>
          <span class="detail-value" style="color: ${BRAND.colors.success};">დასრულებული ✓</span>
        </div>
      </div>

      <div class="info-box">
        <p style="margin: 0;"><strong>📝 შენიშვნა:</strong></p>
        <p style="margin: 10px 0 0 0;">თანხა უკვე გაიგზავნა თქვენს ანგარიშზე. ბანკის მიხედვით, თანხის ასახვას შეიძლება დასჭირდეს 1-5 სამუშაო დღე.</p>
      </div>

      <p style="color: ${BRAND.colors.gray[500]}; font-size: 14px;">თუ გაქვთ კითხვები, მოგვწერეთ: <a href="mailto:${BRAND.supportEmail}">${BRAND.supportEmail}</a></p>
    `;

    const html = createEmailTemplate({
      title: 'თანხა დაბრუნებულია!',
      subtitle: 'წარმატებით დასრულდა',
      headerIcon: '💰',
      headerGradient: 'success',
      content,
    });

    return this.sendEmail({
      to: email,
      subject: `💰 თანხა დაბრუნებულია - ${courseTitle} - ${BRAND.name}`,
      html,
      templateType: 'refund_completed',
      userId,
      metadata: { courseTitle, amount },
    });
  }

  /**
   * @deprecated Use sendRefundCompletedEmail instead
   * Send refund notification to student
   */
  static async sendRefundNotification(
    email: string,
    name: string,
    courseTitle: string,
    amount: number,
    userId: string
  ): Promise<boolean> {
    // Redirect to new method
    return this.sendRefundCompletedEmail(email, name, courseTitle, amount, userId);
  }

  // ==========================================
  // VERSION UPGRADE EMAILS
  // ==========================================

  /**
   * Send notification when a new course version is available for upgrade
   */
  static async sendVersionUpgradeAvailableEmail(
    email: string,
    studentName: string,
    courseTitle: string,
    courseSlug: string,
    oldVersion: number,
    newVersion: number,
    upgradePrice: number,
    discountEndDate: Date | null,
    changelogSummary: string,
    userId: string
  ): Promise<boolean> {
    const courseUrl = `${getFrontendUrl()}/dashboard/courses/${courseSlug}/learn`;

    const discountSection = discountEndDate
      ? `
      <div class="warning-box">
        <p style="margin: 0;"><strong>⏰ შეზღუდული შეთავაზება!</strong></p>
        <p style="margin: 10px 0 0 0;">
          ფასდაკლებით განახლება ხელმისაწვდომია <strong>${discountEndDate.toLocaleDateString('ka-GE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}</strong>-მდე.
        </p>
      </div>
      `
      : '';

    const content = `
      <p>გამარჯობა <strong>${studentName}</strong>,</p>

      <p>კარგი ამბავია! კურსის <strong>„${courseTitle}"</strong> ახალი ვერსია უკვე ხელმისაწვდომია!</p>

      <div class="accent-box">
        <p style="margin: 0;">
          <span style="color: ${BRAND.colors.gray[500]};">თქვენი ვერსია:</span>
          <span style="font-weight: bold;">v${oldVersion}</span>
          <span style="margin: 0 10px;">→</span>
          <span style="color: ${BRAND.colors.gray[500]};">ახალი ვერსია:</span>
          <span style="font-weight: bold; color: ${BRAND.colors.accent};">v${newVersion}</span>
        </p>
        <p style="margin: 15px 0 0 0; font-size: 24px; font-weight: bold; color: ${BRAND.colors.primary};">
          განახლების ფასი: ${upgradePrice.toFixed(2)} ₾
        </p>
      </div>

      ${discountSection}

      <div class="info-box">
        <p style="margin: 0 0 10px 0;"><strong>📝 რა შეიცვალა:</strong></p>
        <p style="margin: 0; color: ${BRAND.colors.gray[700]};">${changelogSummary}</p>
      </div>

      <div style="text-align: center; margin: 25px 0;">
        <a href="${courseUrl}" class="button">განახლების ნახვა</a>
      </div>

      <p style="color: ${BRAND.colors.gray[500]}; font-size: 14px;">
        თქვენ გაქვთ წვდომა ძველ ვერსიაზე (v${oldVersion}) და შეგიძლიათ გააგრძელოთ სწავლა.
        განახლების შემთხვევაში, თქვენი პროგრესი ავტომატურად გადავა ახალ ვერსიაზე.
      </p>
    `;

    const html = createEmailTemplate({
      title: 'ახალი ვერსია ხელმისაწვდომია!',
      subtitle: courseTitle,
      headerIcon: '🚀',
      headerGradient: 'accent',
      content,
    });

    const text = `
გამარჯობა ${studentName},

კურსის "${courseTitle}" ახალი ვერსია (v${newVersion}) უკვე ხელმისაწვდომია!

თქვენი ვერსია: v${oldVersion}
ახალი ვერსია: v${newVersion}
განახლების ფასი: ${upgradePrice.toFixed(2)} ₾

${discountEndDate ? `ფასდაკლება მოქმედებს ${discountEndDate.toLocaleDateString('ka-GE')}-მდე.` : ''}

რა შეიცვალა:
${changelogSummary}

განახლების ნახვა: ${courseUrl}

${BRAND.name} გუნდი
    `;

    return this.sendEmail({
      to: email,
      subject: `🚀 ახალი ვერსია: "${courseTitle}" v${newVersion} - ${BRAND.name}`,
      html,
      text,
      templateType: 'version_upgrade_available',
      userId,
      metadata: { courseTitle, courseSlug, oldVersion, newVersion, upgradePrice },
    });
  }

  /**
   * Send notification when version upgrade is completed successfully
   */
  static async sendVersionUpgradeCompleteEmail(
    email: string,
    studentName: string,
    courseTitle: string,
    courseSlug: string,
    newVersion: number,
    transferredChaptersCount: number,
    userId: string
  ): Promise<boolean> {
    const courseUrl = `${getFrontendUrl()}/dashboard/courses/${courseSlug}/learn`;

    const content = `
      <p>გამარჯობა <strong>${studentName}</strong>,</p>

      <div class="success-box" style="text-align: center;">
        <p style="margin: 0; font-size: 18px;"><strong>✅ კურსის განახლება წარმატებით დასრულდა!</strong></p>
        <p style="margin: 15px 0 0 0; font-size: 24px; font-weight: bold; color: ${BRAND.colors.primary};">
          „${courseTitle}" v${newVersion}
        </p>
      </div>

      <div class="details-card">
        <div class="detail-row">
          <span class="detail-label">კურსი:</span>
          <span class="detail-value">${courseTitle}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">ახალი ვერსია:</span>
          <span class="detail-value">v${newVersion}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">გადატანილი პროგრესი:</span>
          <span class="detail-value" style="color: ${BRAND.colors.success};">${transferredChaptersCount} თავი ✓</span>
        </div>
      </div>

      <div class="info-box">
        <p style="margin: 0;"><strong>ℹ️ რა მოხდა?</strong></p>
        <ul style="margin: 10px 0 0 0; padding-left: 20px; color: ${BRAND.colors.gray[700]};">
          <li>თქვენ მიიღეთ წვდომა ახალ ვერსიაზე</li>
          <li>თქვენი პროგრესი ძველი ვერსიიდან გადავიდა ახალზე</li>
          <li>ძველ ვერსიაზე წვდომა კვლავ შენარჩუნებულია</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 25px 0;">
        <a href="${courseUrl}" class="button">სწავლის გაგრძელება</a>
      </div>
    `;

    const html = createEmailTemplate({
      title: 'განახლება წარმატებულია!',
      subtitle: 'სიამოვნებით გისურვებთ სწავლას',
      headerIcon: '🎉',
      headerGradient: 'success',
      content,
    });

    const text = `
გამარჯობა ${studentName},

კურსის განახლება წარმატებით დასრულდა!

კურსი: "${courseTitle}"
ახალი ვერსია: v${newVersion}
გადატანილი პროგრესი: ${transferredChaptersCount} თავი

რა მოხდა:
- თქვენ მიიღეთ წვდომა ახალ ვერსიაზე
- თქვენი პროგრესი ძველი ვერსიიდან გადავიდა ახალზე
- ძველ ვერსიაზე წვდომა კვლავ შენარჩუნებულია

სწავლის გაგრძელება: ${courseUrl}

${BRAND.name} გუნდი
    `;

    return this.sendEmail({
      to: email,
      subject: `🎉 განახლება წარმატებულია: "${courseTitle}" v${newVersion} - ${BRAND.name}`,
      html,
      text,
      templateType: 'version_upgrade_complete',
      userId,
      metadata: { courseTitle, courseSlug, newVersion, transferredChaptersCount },
    });
  }

  // ==========================================
  // CONTACT FORM EMAILS
  // ==========================================

  /**
   * Send contact form notification to admin
   */
  static async sendContactFormNotification(
    adminEmail: string,
    contactData: {
      name: string;
      email: string;
      subject: string;
      message: string;
    }
  ): Promise<boolean> {
    const subjectLabels: Record<string, string> = {
      general: 'ზოგადი კითხვა',
      support: 'ტექნიკური მხარდაჭერა',
      billing: 'გადახდის საკითხი',
      partnership: 'თანამშრომლობა',
      feedback: 'უკუკავშირი',
    };

    const formattedSubject = subjectLabels[contactData.subject] || contactData.subject;

    const submissionDate = new Date().toLocaleString('ka-GE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const content = `
      <div class="details-card">
        <p style="margin: 0 0 15px 0; font-weight: bold; color: ${BRAND.colors.gray[500]}; text-transform: uppercase; font-size: 12px;">👤 გამომგზავნის ინფორმაცია</p>
        <div class="detail-row">
          <span class="detail-label">სახელი:</span>
          <span class="detail-value">${contactData.name}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">ელ-ფოსტა:</span>
          <span class="detail-value"><a href="mailto:${contactData.email}">${contactData.email}</a></span>
        </div>
        <div class="detail-row">
          <span class="detail-label">თემა:</span>
          <span class="detail-value">${formattedSubject}</span>
        </div>
      </div>

      <div class="info-box">
        <p style="margin: 0 0 10px 0;"><strong>💬 შეტყობინება:</strong></p>
        <p style="margin: 0; color: ${BRAND.colors.gray[700]}; white-space: pre-wrap;">${contactData.message}</p>
      </div>

      <div style="text-align: center; margin: 25px 0;">
        <a href="mailto:${contactData.email}?subject=Re: ${formattedSubject}" class="button">პასუხის გაგზავნა</a>
      </div>

      <div class="warning-box">
        <p style="margin: 0;"><strong>⚡ მოქმედება საჭიროა:</strong> გთხოვთ უპასუხოთ მომხმარებელს რაც შეიძლება სწრაფად.</p>
      </div>

      <p style="color: ${BRAND.colors.gray[500]}; font-size: 12px; text-align: center; margin-top: 20px;">გაგზავნის თარიღი: ${submissionDate}</p>
    `;

    const html = createEmailTemplate({
      title: 'ახალი შეტყობინება',
      subtitle: formattedSubject,
      headerIcon: '✉️',
      headerGradient: 'primary',
      content,
    });

    const text = `
ახალი შეტყობინება კონტაქტის ფორმიდან - ${BRAND.name}

გამომგზავნის ინფორმაცია:
სახელი: ${contactData.name}
ელ-ფოსტა: ${contactData.email}
თემა: ${formattedSubject}

შეტყობინება:
${contactData.message}

გაგზავნის თარიღი: ${submissionDate}
    `;

    return this.sendEmail({
      to: adminEmail,
      subject: `✉️ ახალი შეტყობინება: ${formattedSubject} - ${BRAND.name}`,
      html,
      text,
      templateType: 'contact_form',
      metadata: {
        senderName: contactData.name,
        senderEmail: contactData.email,
        subject: contactData.subject,
      },
    });
  }

  /**
   * Send reminder when upgrade discount is about to expire
   */
  static async sendUpgradeDiscountEndingEmail(
    email: string,
    studentName: string,
    courseTitle: string,
    courseSlug: string,
    currentVersion: number,
    newVersion: number,
    discountPrice: number,
    regularPrice: number,
    hoursRemaining: number,
    userId: string
  ): Promise<boolean> {
    const courseUrl = `${getFrontendUrl()}/dashboard/courses/${courseSlug}/learn`;
    const savings = regularPrice - discountPrice;

    const content = `
      <p>გამარჯობა <strong>${studentName}</strong>,</p>

      <div class="warning-box" style="text-align: center;">
        <p style="margin: 0; font-size: 20px;">⏰ <strong>ფასდაკლება იწურება!</strong></p>
        <p style="margin: 10px 0 0 0; font-size: 32px; font-weight: bold; color: ${BRAND.colors.warning};">
          ${hoursRemaining} საათი დარჩა
        </p>
      </div>

      <p>კურსის <strong>„${courseTitle}"</strong> განახლების ფასდაკლება მალე იწურება!</p>

      <div class="details-card" style="text-align: center; border: 2px solid ${BRAND.colors.accent};">
        <p style="margin: 0; color: ${BRAND.colors.gray[500]};">v${currentVersion} → v${newVersion}</p>
        <p style="margin: 10px 0;">
          <span style="text-decoration: line-through; color: ${BRAND.colors.gray[500]}; font-size: 16px;">${regularPrice.toFixed(2)} ₾</span>
        </p>
        <p style="margin: 0; font-size: 32px; font-weight: bold; color: ${BRAND.colors.accent};">${discountPrice.toFixed(2)} ₾</p>
        <p style="margin: 10px 0 0 0; color: ${BRAND.colors.success};">დაზოგეთ ${savings.toFixed(2)} ₾!</p>
      </div>

      <div style="text-align: center; margin: 25px 0;">
        <a href="${courseUrl}" class="button">ახლავე განახლება</a>
      </div>

      <p style="color: ${BRAND.colors.gray[500]}; font-size: 14px; text-align: center;">
        ფასდაკლების ვადის ამოწურვის შემდეგ, განახლების ფასი იქნება ${regularPrice.toFixed(2)} ₾.
      </p>
    `;

    const html = createEmailTemplate({
      title: 'ფასდაკლება მალე იწურება!',
      subtitle: courseTitle,
      headerIcon: '⏰',
      headerGradient: 'warning',
      content,
    });

    const text = `
გამარჯობა ${studentName},

კურსის "${courseTitle}" განახლების ფასდაკლება მალე იწურება!

დარჩა: ${hoursRemaining} საათი

ვერსია: v${currentVersion} → v${newVersion}
ფასდაკლებით: ${discountPrice.toFixed(2)} ₾ (ნაცვლად ${regularPrice.toFixed(2)} ₾)
დაზოგეთ: ${savings.toFixed(2)} ₾

ახლავე განახლება: ${courseUrl}

${BRAND.name} გუნდი
    `;

    return this.sendEmail({
      to: email,
      subject: `⏰ ${hoursRemaining}სთ დარჩა! "${courseTitle}" ფასდაკლება იწურება - ${BRAND.name}`,
      html,
      text,
      templateType: 'upgrade_discount_ending',
      userId,
      metadata: { courseTitle, courseSlug, currentVersion, newVersion, discountPrice, regularPrice, hoursRemaining },
    });
  }

  /**
   * Send course granted email when admin manually activates course for student (T3.1)
   */
  static async sendCourseGrantedEmail(
    email: string,
    studentName: string,
    courseTitle: string,
    courseSlug: string,
    adminNote?: string,
    userId?: string
  ): Promise<boolean> {
    const courseUrl = `${getFrontendUrl()}/courses/${courseSlug}`;
    const dashboardUrl = `${getFrontendUrl()}/dashboard`;

    const content = `
      <p>გამარჯობა <strong>${studentName}</strong>,</p>

      <div class="success-box">
        <p style="margin: 0; font-size: 18px; font-weight: 600;">🎉 გილოცავთ!</p>
        <p style="margin: 10px 0 0 0;">თქვენ მოგენიჭათ წვდომა კურსზე:</p>
      </div>

      <div class="details-card" style="text-align: center;">
        <h3 style="margin: 0 0 15px 0; color: ${BRAND.colors.primary};">${courseTitle}</h3>
        <p style="margin: 0; color: ${BRAND.colors.gray[500]};">ახლავე შეგიძლიათ დაიწყოთ სწავლა!</p>
      </div>

      ${adminNote ? `
      <div class="info-box">
        <p style="margin: 0; font-weight: 600;">📝 შენიშვნა ადმინისტრაციისგან:</p>
        <p style="margin: 10px 0 0 0;">${adminNote}</p>
      </div>
      ` : ''}

      <div style="text-align: center; margin: 25px 0;">
        <a href="${courseUrl}" class="button">კურსის დაწყება</a>
        <a href="${dashboardUrl}" class="button button-secondary">დაფა</a>
      </div>

      <p style="color: ${BRAND.colors.gray[500]}; font-size: 14px; text-align: center;">
        თუ გაქვთ შეკითხვები, დაგვიკავშირდით: ${BRAND.supportEmail}
      </p>
    `;

    const html = createEmailTemplate({
      title: 'კურსი გააქტიურდა!',
      subtitle: courseTitle,
      headerIcon: '🎓',
      headerGradient: 'success',
      content,
    });

    const text = `
გამარჯობა ${studentName},

გილოცავთ! თქვენ მოგენიჭათ წვდომა კურსზე: "${courseTitle}"

${adminNote ? `შენიშვნა ადმინისტრაციისგან: ${adminNote}\n` : ''}
ახლავე შეგიძლიათ დაიწყოთ სწავლა: ${courseUrl}

თუ გაქვთ შეკითხვები, დაგვიკავშირდით: ${BRAND.supportEmail}

${BRAND.name} გუნდი
    `;

    return this.sendEmail({
      to: email,
      subject: `🎓 კურსი "${courseTitle}" გააქტიურდა! - ${BRAND.name}`,
      html,
      text,
      templateType: 'course_granted',
      userId,
      metadata: { courseTitle, courseSlug, adminNote },
    });
  }
}

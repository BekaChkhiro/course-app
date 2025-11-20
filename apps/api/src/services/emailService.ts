import { Resend } from 'resend';

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
}

export class EmailService {
  /**
   * Send a generic email
   */
  static async sendEmail(options: SendEmailOptions): Promise<boolean> {
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
        throw new Error('Failed to send email');
      }

      console.log('✅ Email sent successfully:', data?.id);
      return true;
    } catch (error) {
      console.error('Resend email error:', error);
      throw new Error('Failed to send email');
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
}

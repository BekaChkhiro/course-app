import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { TokenService } from '../services/tokenService';
import { DeviceSessionService, DeviceLimitError } from '../services/deviceSessionService';
import { EmailService } from '../services/emailService';
import { parseDeviceInfo, getClientIp } from '../utils/deviceFingerprint';

const BCRYPT_ROUNDS = 10;
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

export class AuthController {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  static async register(req: AuthRequest, res: Response) {
    try {
      const { name, surname, email, phone, password } = req.body;

      // Check if user already exists
      const existingUser = await db.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists',
        });
      }

      // Check if phone is already taken
      if (phone) {
        const existingPhone = await db.user.findUnique({
          where: { phone },
        });

        if (existingPhone) {
          return res.status(409).json({
            success: false,
            message: 'User with this phone number already exists',
          });
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

      // Generate verification token
      const verificationToken = TokenService.generateVerificationToken();

      // Create user
      const user = await db.user.create({
        data: {
          name,
          surname,
          email,
          phone,
          password: hashedPassword,
          verificationToken,
          emailVerified: false,
        },
        select: {
          id: true,
          name: true,
          surname: true,
          email: true,
          phone: true,
          role: true,
          emailVerified: true,
          createdAt: true,
        },
      });

      // Send verification email
      try {
        await EmailService.sendVerificationEmail(
          email,
          name,
          verificationToken
        );
      } catch (error) {
        console.error('Failed to send verification email:', error);
        // Don't fail registration if email fails
      }

      return res.status(201).json({
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
        data: { user },
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      });
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  static async login(req: AuthRequest, res: Response) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await db.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated',
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      // Parse device information
      const deviceInfo = parseDeviceInfo(req);
      const ipAddress = getClientIp(req);

      // Create device session
      const { session, refreshToken } = await DeviceSessionService.createSession({
        userId: user.id,
        deviceName: deviceInfo.deviceName,
        deviceType: deviceInfo.deviceType,
        deviceFingerprint: deviceInfo.fingerprint,
        browser: deviceInfo.browser,
        ipAddress,
        userAgent: deviceInfo.userAgent,
      });

      // Generate access token
      const accessToken = TokenService.generateAccessToken(user.id, user.email);

      // Set refresh token in HTTP-only cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: COOKIE_MAX_AGE,
      });

      // Send new device login notification (optional)
      // Uncomment if you want to notify users of new device logins
      // try {
      //   await EmailService.sendNewDeviceLoginEmail(user.email, user.name, {
      //     deviceName: deviceInfo.deviceName,
      //     deviceType: deviceInfo.deviceType,
      //     browser: deviceInfo.browser,
      //     ipAddress,
      //   });
      // } catch (error) {
      //   console.error('Failed to send new device email:', error);
      // }

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          accessToken,
          user: {
            id: user.id,
            name: user.name,
            surname: user.surname,
            email: user.email,
            phone: user.phone,
            role: user.role,
            emailVerified: user.emailVerified,
            avatar: user.avatar,
          },
          sessionId: session.id,
        },
      });
    } catch (error) {
      // Handle device limit error
      if (error instanceof DeviceLimitError) {
        return res.status(403).json({
          success: false,
          message: 'მოწყობილობების ლიმიტი ამოიწურა. თქვენ უკვე გაქვთ 3 აქტიური მოწყობილობა. ახალი მოწყობილობიდან შესასვლელად, ჯერ გამოდით ერთ-ერთი არსებული მოწყობილობიდან.',
          code: error.code,
          data: {
            activeDevices: error.activeDevices,
            maxDevices: error.maxDevices,
          },
        });
      }

      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: 'Login failed',
      });
    }
  }

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  static async refresh(req: AuthRequest, res: Response) {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token not found',
        });
      }

      // Verify and rotate refresh token
      const result = await DeviceSessionService.verifyRefreshToken(refreshToken);

      if (!result) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token',
        });
      }

      // Get user
      const user = await db.user.findUnique({
        where: { id: result.userId },
        select: {
          id: true,
          email: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User not found or inactive',
        });
      }

      // Rotate refresh token (prevents replay attacks)
      const rotated = await DeviceSessionService.rotateRefreshToken(
        refreshToken,
        user.id
      );

      if (!rotated) {
        return res.status(401).json({
          success: false,
          message: 'Failed to rotate refresh token',
        });
      }

      // Generate new access token
      const accessToken = TokenService.generateAccessToken(user.id, user.email);

      // Set new refresh token in cookie
      res.cookie('refreshToken', rotated.newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: COOKIE_MAX_AGE,
      });

      return res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken,
        },
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to refresh token',
      });
    }
  }

  /**
   * Logout user
   * POST /api/auth/logout
   */
  static async logout(req: AuthRequest, res: Response) {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (refreshToken) {
        // Deactivate the session
        await DeviceSessionService.deactivateSession(refreshToken);
      }

      // Clear cookie
      res.clearCookie('refreshToken');

      return res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({
        success: false,
        message: 'Logout failed',
      });
    }
  }

  /**
   * Verify email
   * POST /api/auth/verify-email
   */
  static async verifyEmail(req: AuthRequest, res: Response) {
    try {
      const { token } = req.body;

      // Find user with this verification token
      const user = await db.user.findFirst({
        where: {
          verificationToken: token,
        },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired verification token',
        });
      }

      // Update user
      await db.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          verificationToken: null,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      console.error('Email verification error:', error);
      return res.status(500).json({
        success: false,
        message: 'Email verification failed',
      });
    }
  }

  /**
   * Resend verification email
   * POST /api/auth/resend-verification
   */
  static async resendVerification(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      // Get user
      const user = await db.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Check if already verified
      if (user.emailVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email is already verified',
        });
      }

      // Generate new verification token
      const verificationToken = TokenService.generateVerificationToken();

      // Update user with new token
      await db.user.update({
        where: { id: userId },
        data: {
          verificationToken,
        },
      });

      // Send verification email
      try {
        await EmailService.sendVerificationEmail(
          user.email,
          user.name,
          verificationToken
        );
      } catch (error) {
        console.error('Failed to send verification email:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to send verification email',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Verification email sent successfully',
      });
    } catch (error) {
      console.error('Resend verification error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to resend verification email',
      });
    }
  }

  /**
   * Resend verification email by email address (for registration flow)
   * POST /api/auth/resend-verification-email
   */
  static async resendVerificationByEmail(req: AuthRequest, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
        });
      }

      // Find user by email
      const user = await db.user.findUnique({
        where: { email },
      });

      // Always return success to prevent email enumeration
      if (!user) {
        return res.status(200).json({
          success: true,
          message: 'If an account exists with this email, a verification link has been sent.',
        });
      }

      // Check if already verified
      if (user.emailVerified) {
        return res.status(200).json({
          success: true,
          message: 'If an account exists with this email, a verification link has been sent.',
        });
      }

      // Generate new verification token
      const verificationToken = TokenService.generateVerificationToken();

      // Update user with new token
      await db.user.update({
        where: { id: user.id },
        data: {
          verificationToken,
        },
      });

      // Send verification email
      try {
        await EmailService.sendVerificationEmail(
          user.email,
          user.name,
          verificationToken
        );
      } catch (error) {
        console.error('Failed to send verification email:', error);
        // Don't reveal that email failed
      }

      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a verification link has been sent.',
      });
    } catch (error) {
      console.error('Resend verification by email error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to process request',
      });
    }
  }

  /**
   * Request password reset
   * POST /api/auth/forgot-password
   */
  static async forgotPassword(req: AuthRequest, res: Response) {
    try {
      const { email } = req.body;

      // Find user
      const user = await db.user.findUnique({
        where: { email },
      });

      // Always return success to prevent email enumeration
      if (!user) {
        return res.status(200).json({
          success: true,
          message: 'If an account exists with this email, a password reset link has been sent.',
        });
      }

      // Generate reset token
      const resetToken = TokenService.generatePasswordResetToken();
      const resetExpiry = TokenService.getPasswordResetExpiry();

      // Update user
      await db.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: resetToken,
          resetPasswordExpires: resetExpiry,
        },
      });

      // Send reset email
      try {
        await EmailService.sendPasswordResetEmail(
          user.email,
          user.name,
          resetToken
        );
      } catch (error) {
        console.error('Failed to send password reset email:', error);
        // Don't reveal that email failed
      }

      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to process password reset request',
      });
    }
  }

  /**
   * Reset password
   * POST /api/auth/reset-password
   */
  static async resetPassword(req: AuthRequest, res: Response) {
    try {
      const { token, password } = req.body;

      // Find user with this reset token
      const user = await db.user.findFirst({
        where: {
          resetPasswordToken: token,
          resetPasswordExpires: {
            gt: new Date(),
          },
        },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token',
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

      // Update user and clear reset token
      await db.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordExpires: null,
        },
      });

      // Deactivate all sessions (force re-login on all devices)
      await DeviceSessionService.deactivateAllUserSessions(user.id);

      return res.status(200).json({
        success: true,
        message: 'Password reset successful. Please login with your new password.',
      });
    } catch (error) {
      console.error('Password reset error:', error);
      return res.status(500).json({
        success: false,
        message: 'Password reset failed',
      });
    }
  }

  /**
   * Get user's active devices
   * GET /api/auth/devices
   */
  static async getDevices(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const refreshToken = req.cookies.refreshToken;

      const sessions = await DeviceSessionService.getUserSessions(userId);

      // Find current session by refresh token
      let currentSessionId: string | null = null;
      if (refreshToken) {
        const currentSession = await DeviceSessionService.verifyRefreshToken(refreshToken);
        if (currentSession) {
          currentSessionId = currentSession.id;
        }
      }

      // Parse OS from user agent for each device
      const UAParser = require('ua-parser-js');

      // Format response
      const devices = sessions.map((session) => {
        // Parse user agent to get OS info
        const parser = new UAParser(session.userAgent || '');
        const result = parser.getResult();
        const os = result.os.name || null;
        const osVersion = result.os.version || null;

        return {
          id: session.id,
          deviceName: session.deviceName,
          deviceType: session.deviceType,
          browser: session.browser,
          os,
          osVersion,
          ipAddress: session.ipAddress,
          lastActiveAt: session.lastActiveAt,
          createdAt: session.createdAt,
          isCurrentDevice: session.id === currentSessionId,
        };
      });

      return res.status(200).json({
        success: true,
        data: { devices },
      });
    } catch (error) {
      console.error('Get devices error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch devices',
      });
    }
  }

  /**
   * Remove a device session
   * DELETE /api/auth/devices/:id
   */
  static async removeDevice(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const sessionId = req.params.id;

      await DeviceSessionService.removeSession(sessionId, userId);

      return res.status(200).json({
        success: true,
        message: 'Device removed successfully',
      });
    } catch (error) {
      console.error('Remove device error:', error);
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }
  }

  /**
   * Update device name
   * PATCH /api/auth/devices/:id
   */
  static async updateDeviceName(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const sessionId = req.params.id;
      const { deviceName } = req.body;

      const session = await DeviceSessionService.updateDeviceName(
        sessionId,
        userId,
        deviceName
      );

      return res.status(200).json({
        success: true,
        message: 'Device name updated successfully',
        data: {
          device: {
            id: session.id,
            deviceName: session.deviceName,
          },
        },
      });
    } catch (error) {
      console.error('Update device name error:', error);
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }
  }

  /**
   * Get current user profile
   * GET /api/auth/me
   */
  static async getProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          surname: true,
          email: true,
          phone: true,
          role: true,
          avatar: true,
          bio: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch profile',
      });
    }
  }

  /**
   * Update user profile
   * PUT /api/auth/profile
   */
  static async updateProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { name, surname, phone, bio, avatar } = req.body;

      // Check if phone is already taken by another user
      if (phone) {
        const existingPhone = await db.user.findFirst({
          where: {
            phone,
            NOT: { id: userId },
          },
        });

        if (existingPhone) {
          return res.status(409).json({
            success: false,
            message: 'ეს ტელეფონის ნომერი უკვე გამოყენებულია',
          });
        }
      }

      // Build update data - only include provided fields
      const updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (surname !== undefined) updateData.surname = surname;
      if (phone !== undefined) updateData.phone = phone || null;
      if (bio !== undefined) updateData.bio = bio || null;
      if (avatar !== undefined) updateData.avatar = avatar || null;

      const updatedUser = await db.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          surname: true,
          email: true,
          phone: true,
          role: true,
          avatar: true,
          bio: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'პროფილი წარმატებით განახლდა',
        data: { user: updatedUser },
      });
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({
        success: false,
        message: 'პროფილის განახლება ვერ მოხერხდა',
      });
    }
  }

  /**
   * Change password
   * POST /api/auth/change-password
   */
  static async changePassword(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const user = await db.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'მომხმარებელი ვერ მოიძებნა',
        });
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'მიმდინარე პაროლი არასწორია',
        });
      }

      // Check if new password is same as current
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          message: 'ახალი პაროლი არ უნდა ემთხვეოდეს მიმდინარეს',
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

      // Update password
      await db.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      return res.status(200).json({
        success: true,
        message: 'პაროლი წარმატებით შეიცვალა',
      });
    } catch (error) {
      console.error('Change password error:', error);
      return res.status(500).json({
        success: false,
        message: 'პაროლის შეცვლა ვერ მოხერხდა',
      });
    }
  }
}

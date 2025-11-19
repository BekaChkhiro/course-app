import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Helper to get environment variables safely
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  return secret;
};

const getJwtRefreshSecret = () => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
  }
  return secret;
};

// Token expiration times
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '30d'; // 30 days

export interface TokenPayload {
  userId: string;
  email?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class TokenService {
  /**
   * Generate access token
   */
  static generateAccessToken(userId: string, email?: string): string {
    const payload: TokenPayload = { userId };
    if (email) {
      payload.email = email;
    }

    return jwt.sign(payload, getJwtSecret(), {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(userId: string, email?: string): string {
    const payload: TokenPayload = { userId };
    if (email) {
      payload.email = email;
    }

    // Add random nonce to ensure token uniqueness even when generated in same second
    const nonce = crypto.randomBytes(16).toString('hex');

    return jwt.sign({ ...payload, nonce }, getJwtRefreshSecret(), {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });
  }

  /**
   * Generate both access and refresh tokens
   */
  static generateTokenPair(userId: string, email?: string): TokenPair {
    return {
      accessToken: this.generateAccessToken(userId, email),
      refreshToken: this.generateRefreshToken(userId, email),
    };
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, getJwtSecret()) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, getJwtRefreshSecret()) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Generate email verification token (random secure token)
   */
  static generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate password reset token (random secure token)
   */
  static generatePasswordResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Calculate token expiry date
   */
  static getRefreshTokenExpiry(): Date {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // 30 days
    return expiryDate;
  }

  /**
   * Calculate password reset expiry date (1 hour)
   */
  static getPasswordResetExpiry(): Date {
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 1); // 1 hour
    return expiryDate;
  }

  /**
   * Decode token without verification (for debugging)
   */
  static decodeToken(token: string): any {
    return jwt.decode(token);
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    try {
      const decoded: any = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        return true;
      }
      return decoded.exp * 1000 < Date.now();
    } catch (error) {
      return true;
    }
  }
}

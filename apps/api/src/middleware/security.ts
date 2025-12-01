import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { cacheService } from '../services/cache.service';

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https: blob:; " +
    "media-src 'self' https: blob:; " +
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com; " +
    "connect-src 'self' https://api.stripe.com wss:; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';"
  );

  // HTTP Strict Transport Security
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // X-Frame-Options (clickjacking protection)
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // X-Content-Type-Options
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // X-XSS-Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  res.setHeader(
    'Permissions-Policy',
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(self), usb=()'
  );

  // Remove X-Powered-By
  res.removeHeader('X-Powered-By');

  next();
};

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      // Remove null bytes
      let sanitized = obj.replace(/\0/g, '');
      // Escape HTML entities for common XSS vectors
      sanitized = sanitized
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return sanitized;
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key of Object.keys(obj)) {
        // Prevent prototype pollution
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          continue;
        }
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);

  next();
};

// SQL injection prevention (additional layer)
export const sqlInjectionPrevention = (req: Request, res: Response, next: NextFunction) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|UNION|DECLARE)\b)/i,
    /(--|\*\/|\/\*)/,
    /(\bOR\b\s+\d+\s*=\s*\d+)/i,
    /(\bAND\b\s+\d+\s*=\s*\d+)/i,
    /(;\s*DROP\b)/i,
    /(;\s*DELETE\b)/i,
  ];

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return sqlPatterns.some(pattern => pattern.test(value));
    }
    if (Array.isArray(value)) {
      return value.some(checkValue);
    }
    if (value && typeof value === 'object') {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  // Only check params and query for GET requests, not body for rich content
  if (checkValue(req.params) || (req.method === 'GET' && checkValue(req.query))) {
    return res.status(400).json({
      success: false,
      message: 'Invalid characters in request',
      code: 'INVALID_INPUT',
    });
  }

  next();
};

// Request size limiting
export const requestSizeLimit = {
  json: '10mb',
  urlencoded: '10mb',
};

// Global rate limiter
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes per IP
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || 'unknown',
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
});

// API rate limiter (stricter)
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: {
    success: false,
    message: 'Too many API requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || 'unknown',
});

// Strict rate limiter for sensitive endpoints
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  message: {
    success: false,
    message: 'Too many attempts. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Dynamic rate limiter using Redis
export const dynamicRateLimiter = (
  limit: number,
  windowSec: number,
  keyPrefix: string = 'api'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
    const key = `${keyPrefix}:${ip}`;

    try {
      const result = await cacheService.checkRateLimit(key, limit, windowSec);

      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', Date.now() + result.resetIn * 1000);

      if (!result.allowed) {
        return res.status(429).json({
          success: false,
          message: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: result.resetIn,
        });
      }

      next();
    } catch (error) {
      // If Redis fails, allow the request but log the error
      console.error('Rate limiter error:', error);
      next();
    }
  };
};

// File upload security
export const fileUploadSecurity = {
  allowedMimeTypes: {
    images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    videos: ['video/mp4', 'video/webm', 'video/quicktime'],
    documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    all: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  maxFileSizes: {
    image: 10 * 1024 * 1024, // 10MB
    video: 500 * 1024 * 1024, // 500MB
    document: 50 * 1024 * 1024, // 50MB
  },
};

// Validate file upload
export const validateFileUpload = (
  allowedTypes: string[],
  maxSize: number
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const file = req.file;

    if (!file) {
      return next();
    }

    // Check MIME type
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
        code: 'INVALID_FILE_TYPE',
      });
    }

    // Check file size
    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`,
        code: 'FILE_TOO_LARGE',
      });
    }

    // Check for malicious file extensions hidden in the name
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.php', '.js', '.vbs', '.ps1'];
    const fileName = file.originalname.toLowerCase();
    if (dangerousExtensions.some(ext => fileName.includes(ext))) {
      return res.status(400).json({
        success: false,
        message: 'File contains potentially dangerous content',
        code: 'DANGEROUS_FILE',
      });
    }

    next();
  };
};

// Password validation requirements
export const passwordRequirements = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < passwordRequirements.minLength) {
    errors.push(`Password must be at least ${passwordRequirements.minLength} characters`);
  }

  if (password.length > passwordRequirements.maxLength) {
    errors.push(`Password must be no more than ${passwordRequirements.maxLength} characters`);
  }

  if (passwordRequirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (passwordRequirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (passwordRequirements.requireNumber && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (passwordRequirements.requireSpecial) {
    const specialRegex = new RegExp(`[${passwordRequirements.specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`);
    if (!specialRegex.test(password)) {
      errors.push('Password must contain at least one special character');
    }
  }

  // Check for common weak passwords
  const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein', 'welcome'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common');
  }

  return { valid: errors.length === 0, errors };
};

// Session security configuration
export const sessionSecurity = {
  maxDevices: 3,
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  refreshTokenExpiry: 7 * 24 * 60 * 60 * 1000, // 7 days
  requireReauthForSensitive: true,
};

// Suspicious activity detection
export const detectSuspiciousActivity = async (
  req: Request,
  userId?: string
): Promise<{ suspicious: boolean; reason?: string }> => {
  const ip = req.ip || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';

  // Check for multiple failed login attempts from same IP
  const failedAttemptsKey = `failed_login:${ip}`;
  const failedAttempts = await cacheService.get<number>(failedAttemptsKey);

  if (failedAttempts && failedAttempts > 5) {
    return { suspicious: true, reason: 'Multiple failed login attempts' };
  }

  // Check for rapid requests from same user
  if (userId) {
    const rapidRequestKey = `rapid_requests:${userId}`;
    const result = await cacheService.checkRateLimit(rapidRequestKey, 50, 10);
    if (!result.allowed) {
      return { suspicious: true, reason: 'Unusually rapid requests' };
    }
  }

  // Check for suspicious User-Agent
  const suspiciousAgents = ['curl', 'wget', 'python', 'scrapy', 'bot'];
  if (suspiciousAgents.some(agent => userAgent.toLowerCase().includes(agent))) {
    // Not necessarily suspicious, but log it
    console.log(`Potential automated request from ${ip}: ${userAgent}`);
  }

  return { suspicious: false };
};

// Log failed login attempt
export const logFailedLogin = async (ip: string): Promise<void> => {
  const key = `failed_login:${ip}`;
  const current = await cacheService.get<number>(key) || 0;
  await cacheService.set(key, current + 1, 60 * 60); // 1 hour window
};

// Clear failed login attempts on successful login
export const clearFailedLogins = async (ip: string): Promise<void> => {
  await cacheService.del(`failed_login:${ip}`);
};

// CORS configuration for production
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // 24 hours
};

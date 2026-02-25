/**
 * Integration Tests: Email Validation - T1.1
 *
 * Tests that email addresses with dots are preserved correctly
 * (normalizeEmail({ gmail_remove_dots: false }))
 */

import {
  validateRegistration,
  validateLogin,
  validateForgotPassword,
  validateChangeEmail,
  handleValidationErrors,
} from '../../middleware/validation';
import { mockRequest, mockResponse, mockNext } from '../setup';

describe('Email Validation - Dots Preservation (T1.1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateRegistration', () => {
    it('should preserve dots in email addresses during registration', async () => {
      const req = mockRequest({
        body: {
          name: 'John',
          surname: 'Doe',
          email: 'john.doe@gmail.com',
          password: 'Test123!@#',
          confirmPassword: 'Test123!@#',
        },
      });
      const res = mockResponse();

      // Run all validation middleware
      for (const middleware of validateRegistration) {
        await middleware(req as any, res as any, mockNext);
      }

      // Email should be preserved with dots
      expect((req.body as any).email).toBe('john.doe@gmail.com');
    });

    it('should preserve multiple dots in email addresses', async () => {
      const req = mockRequest({
        body: {
          name: 'Jane',
          surname: 'Smith',
          email: 'jane.marie.smith@gmail.com',
          password: 'Test123!@#',
          confirmPassword: 'Test123!@#',
        },
      });
      const res = mockResponse();

      for (const middleware of validateRegistration) {
        await middleware(req as any, res as any, mockNext);
      }

      expect((req.body as any).email).toBe('jane.marie.smith@gmail.com');
    });

    it('should handle emails without dots correctly', async () => {
      const req = mockRequest({
        body: {
          name: 'Bob',
          surname: 'Johnson',
          email: 'bobjohnson@gmail.com',
          password: 'Test123!@#',
          confirmPassword: 'Test123!@#',
        },
      });
      const res = mockResponse();

      for (const middleware of validateRegistration) {
        await middleware(req as any, res as any, mockNext);
      }

      expect((req.body as any).email).toBe('bobjohnson@gmail.com');
    });

    it('should preserve dots in non-Gmail addresses', async () => {
      const req = mockRequest({
        body: {
          name: 'Test',
          surname: 'User',
          email: 'test.user@outlook.com',
          password: 'Test123!@#',
          confirmPassword: 'Test123!@#',
        },
      });
      const res = mockResponse();

      for (const middleware of validateRegistration) {
        await middleware(req as any, res as any, mockNext);
      }

      expect((req.body as any).email).toBe('test.user@outlook.com');
    });

    it('should lowercase the email address', async () => {
      const req = mockRequest({
        body: {
          name: 'Test',
          surname: 'User',
          email: 'Test.User@Gmail.COM',
          password: 'Test123!@#',
          confirmPassword: 'Test123!@#',
        },
      });
      const res = mockResponse();

      for (const middleware of validateRegistration) {
        await middleware(req as any, res as any, mockNext);
      }

      // Email should be lowercased but dots preserved
      expect((req.body as any).email).toBe('test.user@gmail.com');
    });
  });

  describe('validateLogin', () => {
    it('should preserve dots in email during login', async () => {
      const req = mockRequest({
        body: {
          email: 'john.doe@gmail.com',
          password: 'password123',
        },
      });
      const res = mockResponse();

      for (const middleware of validateLogin) {
        await middleware(req as any, res as any, mockNext);
      }

      expect((req.body as any).email).toBe('john.doe@gmail.com');
    });

    it('should handle login with multiple dots', async () => {
      const req = mockRequest({
        body: {
          email: 'first.middle.last@gmail.com',
          password: 'password123',
        },
      });
      const res = mockResponse();

      for (const middleware of validateLogin) {
        await middleware(req as any, res as any, mockNext);
      }

      expect((req.body as any).email).toBe('first.middle.last@gmail.com');
    });
  });

  describe('validateForgotPassword', () => {
    it('should preserve dots in email for password reset', async () => {
      const req = mockRequest({
        body: {
          email: 'john.doe@gmail.com',
        },
      });
      const res = mockResponse();

      for (const middleware of validateForgotPassword) {
        await middleware(req as any, res as any, mockNext);
      }

      expect((req.body as any).email).toBe('john.doe@gmail.com');
    });
  });

  describe('validateChangeEmail', () => {
    it('should preserve dots in new email address', async () => {
      const req = mockRequest({
        body: {
          newEmail: 'new.email@gmail.com',
        },
      });
      const res = mockResponse();

      for (const middleware of validateChangeEmail) {
        await middleware(req as any, res as any, mockNext);
      }

      expect((req.body as any).newEmail).toBe('new.email@gmail.com');
    });
  });

  describe('handleValidationErrors', () => {
    it('should pass through when no errors', async () => {
      const req = mockRequest({
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      });
      const res = mockResponse();
      const next = jest.fn();

      // Run login validation first
      for (const middleware of validateLogin) {
        await middleware(req as any, res as any, next);
      }

      // Then handle errors
      handleValidationErrors(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 400 for invalid email format', async () => {
      const req = mockRequest({
        body: {
          email: 'invalid-email',
          password: 'password123',
        },
      });
      const res = mockResponse();
      const next = jest.fn();

      // Run login validation
      for (const middleware of validateLogin) {
        await middleware(req as any, res as any, next);
      }

      // Handle errors
      handleValidationErrors(req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Validation failed',
        })
      );
    });
  });
});

describe('Phone Validation - Georgian Format', () => {
  describe('validateRegistration - phone field', () => {
    it('should accept valid Georgian phone numbers', async () => {
      // Georgian phone format: 5XXXXXXXX (9 digits starting with 5)
      // Or with prefix: +995 5XXXXXXXX / 995 5XXXXXXXX
      const validPhones = [
        '599123456', // 9 digits starting with 5 (standard format)
        '+995599123456', // With +995 prefix
        '995599123456', // With 995 prefix (no +)
      ];

      for (const phone of validPhones) {
        const req = mockRequest({
          body: {
            name: 'Test',
            surname: 'User',
            email: 'test@example.com',
            phone,
            password: 'Test123!@#',
            confirmPassword: 'Test123!@#',
          },
        });
        const res = mockResponse();
        const next = jest.fn();

        for (const middleware of validateRegistration) {
          await middleware(req as any, res as any, next);
        }

        handleValidationErrors(req as any, res as any, next);

        // Should not return error for valid phone
        expect(res.status).not.toHaveBeenCalledWith(400);
      }
    });

    it('should allow empty phone (optional field)', async () => {
      const req = mockRequest({
        body: {
          name: 'Test',
          surname: 'User',
          email: 'test@example.com',
          phone: '',
          password: 'Test123!@#',
          confirmPassword: 'Test123!@#',
        },
      });
      const res = mockResponse();
      const next = jest.fn();

      for (const middleware of validateRegistration) {
        await middleware(req as any, res as any, next);
      }

      handleValidationErrors(req as any, res as any, next);

      // Should pass without phone
      expect(next).toHaveBeenCalled();
    });
  });
});

describe('Password Validation', () => {
  describe('validateRegistration - password requirements', () => {
    it('should reject weak passwords', async () => {
      const weakPasswords = [
        'short', // too short
        'alllowercase1!', // no uppercase - actually has lowercase, number, special but no uppercase
        'ALLUPPERCASE1!', // no lowercase
        'NoNumbers!!', // no numbers
        'NoSpecial123', // no special characters
      ];

      for (const password of weakPasswords) {
        const req = mockRequest({
          body: {
            name: 'Test',
            surname: 'User',
            email: 'test@example.com',
            password,
            confirmPassword: password,
          },
        });
        const res = mockResponse();
        const next = jest.fn();

        for (const middleware of validateRegistration) {
          await middleware(req as any, res as any, next);
        }

        handleValidationErrors(req as any, res as any, next);

        // Should return error for weak password
        expect(res.status).toHaveBeenCalledWith(400);
      }
    });

    it('should accept strong passwords', async () => {
      const req = mockRequest({
        body: {
          name: 'Test',
          surname: 'User',
          email: 'test@example.com',
          password: 'StrongPass123!',
          confirmPassword: 'StrongPass123!',
        },
      });
      const res = mockResponse();
      const next = jest.fn();

      for (const middleware of validateRegistration) {
        await middleware(req as any, res as any, next);
      }

      handleValidationErrors(req as any, res as any, next);

      // Should pass with strong password
      expect(next).toHaveBeenCalled();
    });

    it('should reject mismatched passwords', async () => {
      const req = mockRequest({
        body: {
          name: 'Test',
          surname: 'User',
          email: 'test@example.com',
          password: 'StrongPass123!',
          confirmPassword: 'DifferentPass123!',
        },
      });
      const res = mockResponse();
      const next = jest.fn();

      for (const middleware of validateRegistration) {
        await middleware(req as any, res as any, next);
      }

      handleValidationErrors(req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});

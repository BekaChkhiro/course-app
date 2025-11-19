# Authentication System Implementation Guide

## Overview

A complete authentication system has been implemented for your e-learning platform with the following features:

### ✅ Implemented Features

1. **User Registration**
   - Fields: name, surname, email, phone, password
   - Email verification using SendGrid
   - Password strength validation (min 8 chars, uppercase, lowercase, number, special char)
   - Georgian phone number format validation

2. **Login System**
   - JWT access token (15 minutes expiry)
   - JWT refresh token (30 days expiry)
   - Device fingerprinting based on user agent, screen resolution, timezone
   - Maximum 3 active devices per user
   - Device session storage with: device name, fingerprint, IP, last active time
   - Auto-logout for devices inactive 30+ days

3. **Security Features**
   - Bcrypt password hashing (10 rounds)
   - Refresh token rotation (prevents replay attacks)
   - Rate limiting:
     - Login: 5 attempts per 15 minutes
     - Registration: 3 attempts per hour
     - Password reset: 3 attempts per hour
     - Email verification: 5 attempts per hour
   - Secure HTTP-only cookies for refresh tokens
   - CORS configuration for production

4. **Device Management**
   - View all active devices
   - Rename devices with custom names
   - Remove devices (force logout)
   - Device type icons (mobile/tablet/desktop)
   - Last active time tracking

5. **Password Reset**
   - Email-based password reset link
   - Secure token (valid for 1 hour)
   - Invalidates all sessions after password change

6. **API Endpoints**
   - `POST /api/auth/register` - Register new user
   - `POST /api/auth/login` - Login user
   - `POST /api/auth/logout` - Logout current device
   - `POST /api/auth/refresh` - Refresh access token
   - `POST /api/auth/verify-email` - Verify email with token
   - `POST /api/auth/forgot-password` - Request password reset
   - `POST /api/auth/reset-password` - Reset password with token
   - `GET /api/auth/me` - Get current user profile
   - `GET /api/auth/devices` - Get all active devices
   - `PATCH /api/auth/devices/:id` - Update device name
   - `DELETE /api/auth/devices/:id` - Remove device

## Setup Instructions

### 1. Database Setup

The database schema has been updated with the following changes:

**User model additions:**
- `surname` - User's surname (required)
- `phone` - Georgian phone number (optional, unique)
- `emailVerified` - Boolean flag for email verification
- `verificationToken` - Token for email verification
- `resetPasswordToken` - Token for password reset
- `resetPasswordExpires` - Expiry time for reset token

**DeviceSession model:**
- `deviceFingerprint` - Unique fingerprint for each device
- Added unique constraint on `[userId, deviceFingerprint]`

The database has already been migrated. If you need to reset:

```bash
cd packages/database
npx prisma db push
```

### 2. Environment Configuration

#### Backend (`apps/api/.env`)

Make sure you have these environment variables set:

```env
# JWT Secrets (IMPORTANT: Change these in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this

# SendGrid Email Service
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@courseplatform.com
FRONTEND_URL=http://localhost:3000

# CORS
CORS_ORIGIN=http://localhost:3000
```

**Getting SendGrid API Key:**
1. Sign up at https://sendgrid.com/
2. Go to Settings → API Keys
3. Create a new API key with "Full Access" or "Mail Send" permissions
4. Copy the key and add to `.env`

**Note:** In development, emails will be logged to console if SendGrid is not configured.

#### Frontend (`apps/web/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Install Dependencies

All required dependencies have been installed:

**Backend:**
- `cookie-parser` - Cookie parsing for refresh tokens
- `ua-parser-js` - User agent parsing for device detection
- `@sendgrid/mail` - Email service
- `@types/cookie-parser` - TypeScript types
- `@types/ua-parser-js` - TypeScript types

**Frontend:** (already included in package.json)
- `zustand` - State management
- `axios` - HTTP client
- React Query (TanStack Query) - Data fetching

### 4. Start the Application

```bash
# Start all services (Postgres, Redis, etc.)
npm run docker:up

# In the root directory
npm run dev

# Or start individually:
npm run dev:api    # Backend on http://localhost:4000
npm run dev:web    # Frontend on http://localhost:3000
```

## Usage Guide

### Registration Flow

1. User visits `/auth/register`
2. Fills in: name, surname, email, optional phone, password
3. Password must meet requirements:
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number
   - At least one special character (@$!%*?&)
4. Phone number (if provided) must be in Georgian format:
   - Examples: `+995599123456`, `599123456`, `0599123456`
5. On success:
   - Account created
   - Verification email sent
   - User redirected to success page

### Email Verification

1. User clicks verification link in email
2. System verifies token
3. Account marked as verified
4. User redirected to login

### Login Flow

1. User enters email and password
2. System creates device session with:
   - Device fingerprint (browser + screen + timezone)
   - Device name (auto-generated from browser/OS)
   - Device type detection (mobile/tablet/desktop)
   - IP address
3. Access token saved in localStorage
4. Refresh token saved in HTTP-only cookie
5. Maximum 3 devices allowed - oldest is removed if limit exceeded

### Device Management

1. User visits `/devices` (requires authentication)
2. Views all active devices with:
   - Device name (editable)
   - Device type icon
   - Browser information
   - IP address
   - Last active time
   - Created date
3. Can rename devices by clicking edit icon
4. Can remove devices (forces logout on that device)

### Password Reset Flow

1. User visits `/auth/forgot-password`
2. Enters email
3. Receives reset link (valid 1 hour)
4. Clicks link → redirected to `/auth/reset-password?token=...`
5. Enters new password
6. All device sessions invalidated (must re-login)

### Automatic Token Refresh

The frontend automatically:
- Refreshes access token when it expires (15 min)
- Rotates refresh token on each refresh (security)
- Redirects to login if refresh fails

## Security Best Practices

### For Production Deployment:

1. **JWT Secrets:**
   ```bash
   # Generate strong secrets
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Environment Variables:**
   - Never commit `.env` files
   - Use strong, unique secrets
   - Enable HTTPS in production
   - Set `NODE_ENV=production`

3. **CORS:**
   - Update `CORS_ORIGIN` to your production frontend URL
   - Never use `*` in production

4. **Rate Limiting:**
   - Adjust rate limits based on your needs
   - Consider using Redis for distributed rate limiting

5. **Database:**
   - Use connection pooling in production
   - Regular backups
   - Enable SSL connections

6. **Monitoring:**
   - Log failed login attempts
   - Monitor device session creation
   - Alert on unusual activity

## API Testing with cURL

### Register
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John",
    "surname": "Doe",
    "email": "john@example.com",
    "phone": "+995599123456",
    "password": "Password123!",
    "confirmPassword": "Password123!"
  }'
```

### Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "john@example.com",
    "password": "Password123!",
    "screenResolution": "1920x1080",
    "timezone": "Asia/Tbilisi",
    "colorDepth": "24"
  }'
```

### Get Devices
```bash
curl -X GET http://localhost:4000/api/auth/devices \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -b cookies.txt
```

## File Structure

```
apps/api/src/
├── controllers/
│   └── authController.ts        # Auth endpoint handlers
├── middleware/
│   ├── auth.ts                  # JWT verification middleware
│   ├── rateLimiter.ts          # Rate limiting configs
│   └── validation.ts           # Request validation
├── routes/
│   └── authRoutes.ts           # Auth API routes
├── services/
│   ├── deviceSessionService.ts # Device management
│   ├── emailService.ts         # SendGrid integration
│   └── tokenService.ts         # JWT token management
└── utils/
    └── deviceFingerprint.ts    # Device fingerprinting

apps/web/src/
├── app/
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── verify-email/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   └── devices/page.tsx        # Device management UI
├── components/ui/
│   ├── Button.tsx
│   └── Input.tsx
├── lib/api/
│   └── authApi.ts              # API client with auto-refresh
└── store/
    └── authStore.ts            # Zustand auth store
```

## Troubleshooting

### Email Not Sending
- Check SendGrid API key is correct
- Verify sender email is verified in SendGrid
- Check console logs in development mode

### Device Sessions Not Working
- Ensure cookies are enabled
- Check CORS settings allow credentials
- Verify Redis is running: `npm run docker:up`

### Token Refresh Failing
- Check refresh token cookie is being sent
- Verify JWT_REFRESH_SECRET matches
- Check token hasn't expired (30 days)

### Rate Limiting Too Strict
- Adjust values in `apps/api/src/middleware/rateLimiter.ts`
- Clear rate limit: restart API server

## Next Steps

1. **Customize Email Templates:**
   - Edit templates in `apps/api/src/services/emailService.ts`
   - Add your branding and styling

2. **Add Social Login:**
   - Implement OAuth with Google, Facebook, etc.
   - Use Passport.js or NextAuth.js

3. **Two-Factor Authentication:**
   - Add 2FA with TOTP (Google Authenticator)
   - SMS verification option

4. **Session Management Improvements:**
   - Add "Remember this device" option
   - Geo-location based security alerts
   - Suspicious activity detection

5. **Testing:**
   - Write unit tests for auth services
   - Integration tests for API endpoints
   - E2E tests for auth flows

## Support

For questions or issues:
1. Check the troubleshooting section
2. Review API error responses
3. Check browser console for frontend errors
4. Review server logs for backend errors

---

**Implementation Complete!** 🎉

All authentication features are now fully functional and ready to use.

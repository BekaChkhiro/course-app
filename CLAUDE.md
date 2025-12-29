# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack e-learning platform built as a monorepo using Turborepo. The platform supports course management with versioning, chapter-based content delivery (video, text, PDF, quizzes), payment integration, device session management, and role-based access control.

## Tech Stack

- **Monorepo**: Turborepo for workspace management
- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **State Management**: Zustand with persist middleware
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form with Zod validation
- **Rich Text**: TipTap editor
- **Tables**: TanStack Table with drag-and-drop (@dnd-kit)
- **Authentication**: JWT with refresh tokens
- **Payment**: BOG (Bank of Georgia) payment integration
- **Storage**: Cloudflare R2 for files and video
- **Video Processing**: FFmpeg for HLS streaming conversion
- **Email**: Resend for transactional emails

## Common Commands

### Development
```bash
# Start all apps (requires Docker services running first)
npm run docker:up        # Start PostgreSQL, Redis, pgAdmin, Redis Commander
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema changes to database
npm run db:seed          # Seed database with initial data
npm run dev              # Start both web and API in development mode

# Start individual apps
npm run dev:web          # Start only Next.js frontend (port 3000)
npm run dev:api          # Start only Express backend (port 4000)
```

### Database Operations
```bash
npm run db:generate      # Generate Prisma client (run after schema changes)
npm run db:push          # Push schema to database (development)
npm run db:migrate       # Create and run migrations (production-ready)
npm run db:studio        # Open Prisma Studio GUI (port 5555)
npm run db:seed          # Seed the database with test data
```

### Build and Quality
```bash
npm run build            # Build all workspaces
npm run build:web        # Build only frontend
npm run build:api        # Build only backend
npm run lint             # Lint all workspaces
npm run format           # Format code with Prettier
npm run format:check     # Check formatting without modifying
npm run type-check       # TypeScript type checking across all workspaces
```

### Testing (API)
```bash
cd apps/api
npm run test             # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
```

### Docker Services
```bash
npm run docker:up        # Start Docker containers
npm run docker:down      # Stop Docker containers
npm run docker:logs      # View Docker logs
```

After starting Docker, services are available at:
- PostgreSQL: localhost:5432 (postgres/postgres)
- Redis: localhost:6379
- pgAdmin: http://localhost:5050 (admin@admin.com/admin)
- Redis Commander: http://localhost:8081

### Workspace-Specific Commands
```bash
# Run commands in specific workspace
turbo run dev --filter=web
turbo run build --filter=api
turbo run lint --filter=@types/database

# Navigate to workspace
cd apps/web
cd apps/api
cd packages/database
```

## Project Structure

```
course-app/
├── apps/
│   ├── web/                 # Next.js 14 frontend with App Router
│   │   ├── src/
│   │   │   ├── app/         # App Router pages (auth, admin, dashboard)
│   │   │   ├── components/  # React components (ui, admin)
│   │   │   ├── lib/api/     # API client functions (authApi, adminApi)
│   │   │   ├── store/       # Zustand stores (authStore)
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   ├── types/       # Frontend-specific types
│   │   │   └── utils/       # Frontend utilities
│   │   └── package.json
│   │
│   └── api/                 # Express.js backend
│       ├── src/
│       │   ├── routes/      # Express route definitions
│       │   ├── controllers/ # Route controllers
│       │   ├── services/    # Business logic
│       │   ├── middleware/  # Auth, validation, error handling
│       │   ├── config/      # Database, Redis, environment config
│       │   ├── types/       # Backend-specific types
│       │   └── utils/       # Backend utilities
│       ├── uploads/         # File upload storage
│       └── package.json
│
├── packages/
│   ├── database/           # Prisma schema and client
│   │   ├── prisma/
│   │   │   ├── schema.prisma  # Database schema definition
│   │   │   └── seed.ts        # Database seeding script
│   │   └── src/index.ts       # Exports Prisma client
│   │
│   ├── types/              # Shared TypeScript types
│   │   └── src/index.ts    # Type definitions used by both apps
│   │
│   └── utils/              # Shared utility functions
│       └── src/index.ts    # Common utilities
│
├── docker-compose.yml      # PostgreSQL, Redis, pgAdmin, Redis Commander
├── turbo.json             # Turborepo pipeline configuration
└── package.json           # Root workspace configuration
```

## Architecture Patterns

### Monorepo Workspace Dependencies

Workspaces reference each other using workspace protocol:
```json
{
  "dependencies": {
    "@types/types": "*",
    "@types/utils": "*",
    "@types/database": "*"
  }
}
```

The naming convention uses `@types/*` for all workspace packages. To use a workspace package, import directly from the package name.

### Frontend Architecture (Next.js)

- **App Router Structure**: Uses Next.js 14 App Router with route groups
  - `/auth/*` - Authentication pages (login, register, verify-email)
  - `/admin/*` - Admin dashboard with nested routes for courses, categories, chapters, versions
  - `/dashboard` - Student dashboard
  - `/devices` - Device session management

- **API Client Pattern**: API functions are organized by domain in `lib/api/`
  - `authApi.ts` - Authentication endpoints
  - `adminApi.ts` - Admin CRUD operations
  - Each exports typed functions that return `{ success, data, message }` responses

- **State Management**:
  - Zustand stores with persist middleware for global state (e.g., `authStore.ts`)
  - TanStack Query for server state, caching, and data fetching
  - Local component state with React hooks for UI state

- **Form Handling**: React Hook Form + Zod for validation
  - Define Zod schemas for validation
  - Use `useForm` with resolver for type-safe forms

### Backend Architecture (Express)

- **Route Organization**: Routes are split by domain in `routes/` directory
  - Each route file exports an Express Router
  - All routes are prefixed with `/api/*` in `index.ts`

- **Controller Pattern**: Controllers handle request/response logic
  - Keep business logic in `services/` directory
  - Controllers call services and format responses

- **Middleware Chain**:
  - `verifyToken` - JWT verification and user loading
  - `requireAuth` - Alias for verifyToken
  - `requireEmailVerified` - Ensures email is verified
  - `requireAdmin` - Ensures user has ADMIN role

- **Standard Response Format**:
  ```typescript
  {
    success: boolean,
    data?: any,
    message?: string,
    code?: string  // For specific error codes
  }
  ```

- **Authentication Flow**:
  - JWT access tokens stored in localStorage (frontend)
  - Refresh tokens stored in httpOnly cookies
  - Token verification happens in auth middleware
  - User object attached to `req.user` after verification

### Database Architecture (Prisma)

- **Schema Location**: `packages/database/prisma/schema.prisma`
- **Centralized Client**: All apps import from `@types/database`
- **Key Models**:
  - `User` - Authentication and profile (STUDENT/ADMIN roles)
  - `Category` - Hierarchical course categories (self-referencing)
  - `Course` - Main course entity (DRAFT/PUBLISHED/ARCHIVED)
  - `CourseVersion` - Version control for course content
  - `Chapter` - Course chapters (belong to versions)
  - `ChapterContent` - Polymorphic content (VIDEO/TEXT/PDF/QUIZ)
  - `Quiz`, `QuizQuestion`, `QuizAnswer` - Quiz system
  - `Purchase` - Course purchases with promo code support
  - `Progress` - User progress tracking per chapter
  - `DeviceSession` - Multi-device session management (max 3)
  - `Comment`, `Review` - User engagement

- **Version Control Pattern**: Courses use `CourseVersion` for content versioning
  - Course has one-to-many relationship with versions
  - Each version can be marked as current
  - Chapters belong to specific versions
  - Allows publishing new content without affecting enrolled students
  - `UserVersionAccess` tracks which versions each user can access
  - Version upgrades can have promotional pricing with time-limited discounts

- **Analytics System**: Comprehensive analytics tracking
  - `DailyAnalytics` - Aggregated daily metrics (revenue, users, engagement)
  - `CourseRevenueAnalytics` - Per-course revenue breakdown
  - `ChapterAnalytics` - Learning path and drop-off analysis
  - `ActivityLog` - Real-time user activity tracking

- **Gamification**: Student engagement features
  - `StudyStreak` - Daily learning streak tracking
  - `Badge`, `UserBadge` - Achievement badges system
  - `UserXP`, `XPHistory` - Experience points and levels
  - `Note`, `Bookmark` - Personal learning tools

### Critical Development Patterns

1. **Course Versioning System**: When modifying course content:
   - Create new CourseVersion instead of modifying published content
   - Link chapters to versions, not directly to courses
   - Use `isCurrentVersion` flag to track active version
   - Students continue with their enrolled version

2. **Workspace Changes**: After modifying `packages/database/prisma/schema.prisma`:
   ```bash
   npm run db:generate  # Must run this to update Prisma client
   npm run db:push      # Apply changes to database
   ```

3. **Authentication Headers**: API calls require:
   ```typescript
   headers: {
     'Authorization': `Bearer ${token}`,
     'Content-Type': 'application/json'
   }
   ```

4. **File Uploads**: Files are stored in Cloudflare R2
   - Upload endpoint: `/api/upload`
   - Videos are processed with FFmpeg into HLS format (480p, 720p, 1080p)
   - `Video` model tracks processing status and HLS playlist URLs
   - Encryption keys managed per-video for DRM

5. **Device Session Management**: Users limited to 3 concurrent devices
   - Check device count before allowing login
   - Track device info with ua-parser-js
   - Allow users to revoke device access

6. **Payment Flow (BOG)**: Bank of Georgia integration
   - `Purchase` model stores `bogOrderId` and `externalOrderId`
   - Supports refunds via `RefundRequest` model with status tracking
   - Promo codes with scopes: ALL, COURSE, or CATEGORY

## Environment Variables

Each workspace requires its own `.env` file:

### Root `.env`
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/course_platform?schema=public"
```

### `apps/api/.env`
```
NODE_ENV=development
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/course_platform?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
CORS_ORIGIN=http://localhost:3000
```

### `apps/web/.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### `packages/database/.env`
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/course_platform?schema=public"
```

## Deployment Notes

- Run `npm run db:migrate` (not db:push) for production migrations
- Backend uses Bull queues for video processing jobs (requires Redis)

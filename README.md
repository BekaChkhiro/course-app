# E-Learning Platform

A comprehensive e-learning platform built with a modern monorepo architecture using Turborepo.

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript and App Router
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Monorepo**: Turborepo
- **Styling**: Tailwind CSS
- **Payment**: Stripe integration ready

## Features

- 🎓 Course management with versioning support
- 📚 Chapter-based content delivery (video, text, PDF, quizzes)
- 🎯 Interactive quiz system with scoring
- 💳 Payment integration with promo code support
- 📱 Device session management (max 3 devices per user)
- 📊 Progress tracking
- 💬 Comments and reviews
- 👥 Role-based access control (Student/Admin)
- 🔐 Secure authentication with JWT
- 📹 Video streaming support

## Project Structure

```
course-app/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Express.js backend
├── packages/
│   ├── database/     # Prisma schema and client
│   ├── types/        # Shared TypeScript types
│   └── utils/        # Shared utility functions
├── docker-compose.yml
├── turbo.json
└── package.json
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker and Docker Compose

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd course-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Copy .env.example files to .env in each workspace
cp .env.example .env
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
cp packages/database/.env.example packages/database/.env
```

4. Start Docker services:
```bash
npm run docker:up
```

5. Generate Prisma client and run migrations:
```bash
npm run db:generate
npm run db:push
npm run db:seed
```

6. Start development servers:
```bash
npm run dev
```

The applications will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Prisma Studio: http://localhost:5555 (run `npm run db:studio`)
- pgAdmin: http://localhost:5050 (credentials: admin@admin.com / admin)
- Redis Commander: http://localhost:8081

## Available Scripts

### Root Level

- `npm run dev` - Start all apps in development mode
- `npm run dev:web` - Start only the web app
- `npm run dev:api` - Start only the API
- `npm run build` - Build all apps
- `npm run lint` - Lint all workspaces
- `npm run format` - Format code with Prettier
- `npm run type-check` - Type check all workspaces
- `npm run test` - Run tests in all workspaces

### Database Scripts

- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed the database

### Docker Scripts

- `npm run docker:up` - Start Docker containers
- `npm run docker:down` - Stop Docker containers
- `npm run docker:logs` - View Docker logs

## Database Schema

The platform includes the following entities:

- **Users** - User accounts with role-based access
- **Categories** - Course categories
- **Courses** - Course information
- **CourseVersions** - Version control for courses
- **Chapters** - Course chapters
- **ChapterContent** - Chapter content (video, text, PDF, quiz)
- **Quizzes** - Quiz definitions
- **QuizQuestions** - Quiz questions
- **QuizAnswers** - Answer options
- **QuizSubmissions** - User quiz attempts
- **Purchases** - Course purchases
- **Progress** - User progress tracking
- **Comments** - User comments on chapters
- **Reviews** - Course reviews
- **PromoCodes** - Promotional discount codes
- **DeviceSessions** - User device management

## Development

### Adding a New Package

1. Create a new directory in `packages/`
2. Add a `package.json` with the name `@types/<package-name>`
3. Add the package to the root `package.json` workspaces
4. Run `npm install` from the root

### Workspace Dependencies

To use a workspace package in another workspace:

```json
{
  "dependencies": {
    "@types/types": "workspace:*",
    "@types/utils": "workspace:*",
    "@types/database": "workspace:*"
  }
}
```

## API Documentation

The API follows RESTful conventions:

- `GET /api/health` - Health check
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/courses` - Get all courses
- `GET /api/courses/:id` - Get course by ID
- More endpoints to be documented...

## Environment Variables

See `.env.example` files in each workspace for required environment variables.

## Testing

```bash
# Run all tests
npm run test

# Run tests in a specific workspace
npm run test --filter=web
```

## Deployment

### Frontend (Vercel)

```bash
cd apps/web
vercel
```

### Backend (Railway/Render/AWS)

```bash
cd apps/api
npm run build
npm start
```

### Database

Ensure your production database URL is set in the environment variables.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support, email support@example.com or open an issue in the repository.

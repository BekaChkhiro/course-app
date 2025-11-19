# Contributing to E-Learning Platform

Thank you for your interest in contributing to our e-learning platform! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone <your-fork-url>`
3. Add upstream remote: `git remote add upstream <original-repo-url>`
4. Create a new branch: `git checkout -b feature/your-feature-name`

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start Docker services:
   ```bash
   npm run docker:up
   ```

3. Setup database:
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

4. Start development:
   ```bash
   npm run dev
   ```

## Project Structure

- `apps/web` - Next.js frontend application
- `apps/api` - Express.js backend API
- `packages/database` - Prisma schema and database client
- `packages/types` - Shared TypeScript types
- `packages/utils` - Shared utility functions

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Define proper types (avoid `any`)
- Use interfaces for object shapes
- Use type aliases for unions and complex types

### Code Style

- Follow the ESLint and Prettier configurations
- Run `npm run format` before committing
- Run `npm run lint` to check for issues
- Use meaningful variable and function names
- Add comments for complex logic

### Git Commit Messages

Follow the Conventional Commits specification:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add quiz submission endpoint
fix: resolve video playback issue on mobile
docs: update API documentation
```

## Making Changes

1. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature
   ```

2. Make your changes
3. Test your changes thoroughly
4. Commit your changes:
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

5. Push to your fork:
   ```bash
   git push origin feature/your-feature
   ```

6. Create a Pull Request

## Pull Request Process

1. Update the README.md with details of changes if applicable
2. Ensure all tests pass: `npm run test`
3. Ensure linting passes: `npm run lint`
4. Ensure type checking passes: `npm run type-check`
5. Request review from maintainers
6. Address any feedback
7. Once approved, a maintainer will merge your PR

## Testing

- Write tests for new features
- Update tests when modifying existing features
- Run tests before submitting PR: `npm run test`
- Aim for good test coverage

## Database Changes

When making schema changes:

1. Update `packages/database/prisma/schema.prisma`
2. Generate migration: `npm run db:migrate`
3. Update seed file if needed: `packages/database/prisma/seed.ts`
4. Test migrations thoroughly

## API Changes

When adding/modifying API endpoints:

1. Update the endpoint handler
2. Add/update validation schemas
3. Update API documentation
4. Add/update tests
5. Update frontend types if needed

## Questions?

If you have questions, please:
- Check existing issues and discussions
- Create a new issue with the `question` label
- Reach out to maintainers

## Code Review

All submissions require review. We use GitHub pull requests for this purpose.

Thank you for contributing!

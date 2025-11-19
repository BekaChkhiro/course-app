# Quick Start Guide

Get your e-learning platform up and running in minutes!

## Prerequisites Check

Ensure you have the following installed:
- Node.js >= 18.0.0 (`node --version`)
- npm >= 9.0.0 (`npm --version`)
- Docker & Docker Compose (`docker --version && docker-compose --version`)

## Step-by-Step Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables

Copy the example environment files:
```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
cp packages/database/.env.example packages/database/.env
```

**Important**: Update the following in your `.env` files:
- `JWT_SECRET` - Generate a secure random string
- `JWT_REFRESH_SECRET` - Generate another secure random string
- `NEXTAUTH_SECRET` - Generate a secure random string
- `STRIPE_SECRET_KEY` - Add your Stripe key (for payments)

### 3. Start Docker Services
```bash
npm run docker:up
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- pgAdmin on port 5050 (optional GUI)
- Redis Commander on port 8081 (optional GUI)

### 4. Set Up Database
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed with sample data
npm run db:seed
```

### 5. Start Development Servers
```bash
npm run dev
```

This starts:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000

## Default Login Credentials

After seeding, you can login with:

**Admin Account:**
- Email: `admin@example.com`
- Password: `admin123`

**Student Account:**
- Email: `student@example.com`
- Password: `student123`

## Useful Commands

```bash
# Start only frontend
npm run dev:web

# Start only backend
npm run dev:api

# Open Prisma Studio (Database GUI)
npm run db:studio

# View Docker logs
npm run docker:logs

# Stop Docker services
npm run docker:down

# Run linting
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

## Using Make (Optional)

If you have `make` installed, you can use:

```bash
# Complete setup
make setup

# Start development
make dev

# Other commands
make help
```

## Access Database Tools

### pgAdmin (PostgreSQL GUI)
1. Navigate to http://localhost:5050
2. Login with: `admin@admin.com` / `admin`
3. Add server:
   - Host: `postgres`
   - Port: `5432`
   - Username: `postgres`
   - Password: `postgres`

### Redis Commander
Navigate to http://localhost:8081

### Prisma Studio
```bash
npm run db:studio
```
Navigate to http://localhost:5555

## Project Structure

```
course-app/
├── apps/
│   ├── web/           # Next.js frontend (port 3000)
│   └── api/           # Express API (port 4000)
├── packages/
│   ├── database/      # Prisma schema & client
│   ├── types/         # Shared TypeScript types
│   └── utils/         # Shared utilities
└── docker-compose.yml # Docker services
```

## Next Steps

1. **Explore the API**: Visit http://localhost:4000/api
2. **Check Frontend**: Visit http://localhost:3000
3. **Read the docs**: Check `README.md` for detailed documentation
4. **Start coding**: Begin building your features!

## Troubleshooting

### Database connection issues
```bash
# Restart Docker services
npm run docker:down
npm run docker:up

# Regenerate Prisma client
npm run db:generate
```

### Port already in use
Change ports in:
- `apps/web/package.json` (Next.js)
- `apps/api/.env` (Express)
- `docker-compose.yml` (PostgreSQL, Redis)

### Module not found errors
```bash
# Clean install
npm run clean
npm install
```

## Getting Help

- Check `README.md` for full documentation
- Check `CONTRIBUTING.md` for development guidelines
- Open an issue on GitHub
- Check existing issues and discussions

Happy coding! 🚀

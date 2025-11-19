# 🚂 Railway Deployment Guide

## Prerequisites

1. ✅ GitHub account
2. ✅ Railway account (https://railway.app)
3. ✅ Git initialized in project

## Step 1: Prepare Project for Deployment

### 1.1 Create `.gitignore` (if not exists)

```bash
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Next.js
.next/
out/
build
dist/

# Production
.vercel
.turbo

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env
.env*.local
.env.development
.env.test
.env.production

# Prisma
prisma/migrations/
*.db
*.db-journal

# IDE
.vscode/
.idea/
```

### 1.2 Initialize Git and Push to GitHub

```bash
# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Complete auth system"

# Create GitHub repository at: https://github.com/new
# Then push:
git remote add origin https://github.com/YOUR_USERNAME/course-app.git
git branch -M main
git push -u origin main
```

## Step 2: Railway Project Setup

### 2.1 Create Railway Project

1. Go to https://railway.app
2. Click "Start a New Project"
3. Choose "Deploy from GitHub repo"
4. Select your `course-app` repository
5. Railway will detect the monorepo

### 2.2 Add PostgreSQL Database

1. In Railway dashboard, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will provision a PostgreSQL instance
4. Copy the `DATABASE_URL` from the PostgreSQL service

### 2.3 Add Redis (Optional but recommended)

1. Click "New" → "Database" → "Redis"
2. Copy the `REDIS_URL` from Redis service

## Step 3: Deploy API (Backend)

### 3.1 Create API Service

1. In Railway project, click "New" → "GitHub Repo"
2. Select your repository again
3. Name it: `course-app-api`
4. Configure build settings:
   - **Root Directory**: `apps/api`
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `npm run start`

### 3.2 Add API Environment Variables

In the API service settings, add these variables:

```env
# Node
NODE_ENV=production
PORT=4000

# Database (from PostgreSQL service)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# JWT Secrets (use strong random strings)
JWT_SECRET=your-production-jwt-secret-here-64-chars-minimum
JWT_REFRESH_SECRET=your-production-refresh-secret-here-64-chars-minimum
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Redis (from Redis service)
REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PORT=${{Redis.REDIS_PORT}}
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}

# CORS (will be your Railway frontend URL)
CORS_ORIGIN=https://your-frontend-url.railway.app

# File Upload
MAX_FILE_SIZE=52428800
UPLOAD_DIR=./uploads

# Email (add your SendGrid key)
SENDGRID_API_KEY=your-sendgrid-key-here
FROM_EMAIL=noreply@yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Session
SESSION_SECRET=your-session-secret-here
SESSION_MAX_AGE=86400000

# Device Management
MAX_DEVICES_PER_USER=3

# Frontend URL (will be Railway URL)
FRONTEND_URL=https://your-frontend-url.railway.app
```

### 3.3 Update API package.json

Add production start script to `apps/api/package.json`:

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "prisma:generate": "prisma generate",
    "prisma:push": "prisma db push"
  }
}
```

### 3.4 Add tsconfig.json for API

Create `apps/api/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 3.5 Build and Deploy API

```bash
# Commit the changes
git add .
git commit -m "Add Railway production config for API"
git push

# Railway will automatically redeploy
```

### 3.6 Run Prisma Migrations

In Railway API service:
1. Go to "Settings" → "Variables"
2. Click "Raw Editor"
3. Ensure `DATABASE_URL` is set
4. Go to "Deployments" → Latest deployment → "View Logs"
5. Railway will run migrations automatically with the build

OR manually via Railway CLI:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# Run migrations
railway run --service api npx prisma migrate deploy
```

## Step 4: Deploy Frontend (Next.js)

### 4.1 Create Frontend Service

1. Click "New" → "GitHub Repo"
2. Select your repository
3. Name it: `course-app-web`
4. Configure:
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`

### 4.2 Add Frontend Environment Variables

```env
# API URL (from API service)
NEXT_PUBLIC_API_URL=https://your-api-url.railway.app

# App URL (Railway will provide this)
NEXT_PUBLIC_APP_URL=https://your-frontend-url.railway.app
NEXTAUTH_URL=https://your-frontend-url.railway.app
NEXTAUTH_SECRET=your-nextauth-secret-here

# File Upload
NEXT_PUBLIC_MAX_FILE_SIZE=10485760
NEXT_PUBLIC_ALLOWED_FILE_TYPES=video/mp4,video/webm,application/pdf
```

### 4.3 Update Web package.json

Ensure production scripts in `apps/web/package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

### 4.4 Deploy Frontend

```bash
git add .
git commit -m "Add Railway production config for frontend"
git push

# Railway auto-deploys
```

## Step 5: Generate Production Secrets

Generate strong secrets for production:

```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# JWT Refresh Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Session Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# NextAuth Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Update these in Railway environment variables.

## Step 6: Update CORS Configuration

After frontend deploys, update API's CORS_ORIGIN:

1. Get frontend Railway URL (e.g., `https://course-app-web.railway.app`)
2. Update API environment variable:
   ```
   CORS_ORIGIN=https://course-app-web.railway.app
   ```
3. Railway will auto-redeploy API

## Step 7: Configure Custom Domain (Optional)

### For Frontend:
1. Go to Frontend service → "Settings" → "Networking"
2. Click "Generate Domain" or add custom domain
3. Add DNS records if using custom domain

### For API:
1. Go to API service → "Settings" → "Networking"
2. Click "Generate Domain"
3. Update `NEXT_PUBLIC_API_URL` in frontend with new API domain

## Step 8: Test Deployment

1. Visit your Railway frontend URL
2. Test registration
3. Test login
4. Test device management
5. Test password reset

## Step 9: Enable SendGrid for Production Emails

1. Sign up at https://sendgrid.com
2. Verify your sender email
3. Create API key
4. Add to Railway API environment variables:
   ```
   SENDGRID_API_KEY=SG.xxx
   FROM_EMAIL=noreply@yourdomain.com
   ```
5. Redeploy API

## Monitoring & Logs

- **View Logs**: Railway Dashboard → Service → "Deployments" → "View Logs"
- **Monitor Resources**: Railway Dashboard shows CPU/Memory usage
- **Database**: Use Railway's PostgreSQL plugin to view tables

## Cost Estimation

**Railway Free Trial**: $5 credit/month
- PostgreSQL: ~$5-10/month (512MB RAM)
- Redis: ~$5/month (optional)
- API: ~$5/month (512MB RAM)
- Frontend: ~$5/month (512MB RAM)

**Total**: ~$15-20/month after trial

**Free Tier Alternative**: Railway gives $5/month credit, enough for small projects if optimized.

## Troubleshooting

### Build Fails
- Check build logs in Railway
- Ensure all dependencies in package.json
- Verify Prisma schema is correct

### Database Connection Issues
- Verify DATABASE_URL is set correctly
- Check Prisma migrations ran successfully
- Ensure PostgreSQL service is running

### CORS Errors
- Update CORS_ORIGIN in API with exact frontend URL
- Include protocol (https://)
- No trailing slash

### Environment Variables Not Working
- Railway needs redeploy after env var changes
- Use `${{ServiceName.VARIABLE}}` to reference other services
- Check variable names match exactly

## Useful Railway CLI Commands

```bash
# View logs
railway logs --service api

# Run commands in production
railway run --service api npx prisma studio

# Environment variables
railway variables

# Status
railway status
```

## Security Checklist

- ✅ Strong JWT secrets (64+ chars)
- ✅ HTTPS enabled (Railway default)
- ✅ Environment variables set correctly
- ✅ CORS configured properly
- ✅ Rate limiting enabled
- ✅ Database backups enabled (Railway automatic)
- ✅ SendGrid API key secured

## Backup Strategy

Railway automatically backs up PostgreSQL. To create manual backup:

```bash
# Export database
railway run --service postgres pg_dump > backup.sql

# Restore
railway run --service postgres psql < backup.sql
```

---

## Summary: Railway Services Structure

```
course-app (Railway Project)
├── PostgreSQL (Database)
├── Redis (Cache)
├── course-app-api (Express Backend)
│   ├── Connected to PostgreSQL
│   ├── Connected to Redis
│   └── Environment variables configured
└── course-app-web (Next.js Frontend)
    ├── Connected to API
    └── Environment variables configured
```

---

**გილოცავ! თქვენი აპლიკაცია production-ზეა! 🚀**

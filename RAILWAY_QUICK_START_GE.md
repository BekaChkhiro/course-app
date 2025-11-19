# 🚂 Railway Deployment - სწრაფი სტარტი

## ნაბიჯი 1: GitHub-ზე ატვირთვა

```bash
# შევამოწმოთ არის თუ არა git initialized
git status

# თუ არ არის, გავაკეთოთ init
git init

# დავამატოთ ყველა ფაილი
git add .

# commit
git commit -m "Ready for Railway deployment"

# GitHub-ზე შევქმნათ ახალი repository
# იხილე: https://github.com/new
# Repository name: course-app
# Private/Public: აირჩიე
# Don't initialize with README

# დავაკავშიროთ GitHub repository
git remote add origin https://github.com/YOUR_USERNAME/course-app.git
git branch -M main
git push -u origin main
```

## ნაბიჯი 2: Railway Account

1. გადადი https://railway.app
2. "Login" → "Login with GitHub"
3. Authorize Railway
4. Free trial გაქვს $5 credit/month

## ნაბიჯი 3: PostgreSQL Database შექმნა

1. Railway Dashboard-ზე: "New Project"
2. "Provision PostgreSQL"
3. Database შეიქმნება
4. დააკლიკე Database service-ზე
5. "Variables" → Copy "DATABASE_URL"

**შეინახე DATABASE_URL სადმე - დაგჭირდება!**

## ნაბიჯი 4: Redis შექმნა (Optional)

1. იმავე project-ში: "New" → "Database" → "Redis"
2. Redis შეიქმნება
3. Copy REDIS_HOST, REDIS_PORT, REDIS_PASSWORD

## ნაბიჯი 5: Production Secrets გენერაცია

გადი terminal-ში და შექმენი secrets:

```bash
# JWT Secret
echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")"

# JWT Refresh Secret
echo "JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")"

# Session Secret
echo "SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
```

**შეინახე ეს secrets - დაგჭირდება!**

## ნაბიჯი 6: API (Backend) Deployment

### 6.1 API Service შექმნა

1. Railway Dashboard: "New" → "GitHub Repo"
2. აირჩიე შენი `course-app` repository
3. Railway მოძებნის monorepo-ს
4. Click "Add variables" → "Empty Service"

### 6.2 Service Settings

1. Settings → "Service Name": `course-app-api`
2. Settings → "Root Directory": `apps/api`
3. Settings → "Build Command": `npm install && npm run build`
4. Settings → "Start Command": `npm start`
5. Settings → "Watch Paths": `apps/api/**`

### 6.3 Environment Variables დამატება

"Variables" tab-ზე დაამატე:

```env
NODE_ENV=production
PORT=4000

# Database (Railway PostgreSQL-დან)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# JWT Secrets (შენი გენერირებული)
JWT_SECRET=paste-your-generated-jwt-secret-here
JWT_REFRESH_SECRET=paste-your-generated-refresh-secret-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Redis (თუ დაამატე)
REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PORT=${{Redis.REDIS_PORT}}
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
REDIS_DB=0

# CORS (შეცვლი შემდეგ frontend URL-ით)
CORS_ORIGIN=https://your-frontend-url.railway.app

# Session
SESSION_SECRET=paste-your-session-secret-here
SESSION_MAX_AGE=86400000

# File Upload
MAX_FILE_SIZE=52428800
UPLOAD_DIR=./uploads
ALLOWED_VIDEO_TYPES=video/mp4,video/webm,video/ogg
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp

# Email (მოგვიანებით SendGrid-დან)
SENDGRID_API_KEY=
FROM_EMAIL=noreply@courseplatform.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Device Management
MAX_DEVICES_PER_USER=3

# Frontend URL (შეცვლი შემდეგ)
FRONTEND_URL=https://your-frontend-url.railway.app

# Logging
LOG_LEVEL=info
```

### 6.4 Deploy API

1. "Deployments" tab → Railway automatically deploys
2. დაელოდე build-ს (2-5 წუთი)
3. "View Logs" - შეამოწმე არის თუ არა errors
4. როცა success იქნება, დაინახავ URL: `https://course-app-api-production-xxxx.up.railway.app`

**შეინახე API URL!**

### 6.5 Prisma Migration

1. "Deployments" → Latest deployment → "View Logs"
2. უნდა დაინახო: "Prisma schema loaded" და migration success
3. თუ არ არის, Railway CLI-თი:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to API service
railway link

# Run migration
railway run npx prisma migrate deploy --schema=../../packages/database/prisma/schema.prisma
```

## ნაბიჯი 7: Frontend (Next.js) Deployment

### 7.1 Frontend Service შექმნა

1. Railway Dashboard: "New" → "GitHub Repo"
2. აირჩიე იგივე `course-app` repository
3. "Add variables" → "Empty Service"

### 7.2 Service Settings

1. Settings → "Service Name": `course-app-web`
2. Settings → "Root Directory": `apps/web`
3. Settings → "Build Command": `npm install && npm run build`
4. Settings → "Start Command": `npm start`
5. Settings → "Watch Paths": `apps/web/**`

### 7.3 Environment Variables

"Variables" tab-ზე:

```env
# API URL (შენი API Railway URL)
NEXT_PUBLIC_API_URL=https://course-app-api-production-xxxx.up.railway.app

# Frontend URL (Railway მოგცემს)
NEXT_PUBLIC_APP_URL=${{RAILWAY_PUBLIC_DOMAIN}}
NEXTAUTH_URL=${{RAILWAY_PUBLIC_DOMAIN}}

# NextAuth Secret
NEXTAUTH_SECRET=paste-your-nextauth-secret-here

# File Upload
NEXT_PUBLIC_MAX_FILE_SIZE=10485760
NEXT_PUBLIC_ALLOWED_FILE_TYPES=video/mp4,video/webm,application/pdf

# Analytics (optional)
NEXT_PUBLIC_GA_MEASUREMENT_ID=
```

### 7.4 Deploy Frontend

1. Railway automatically deploys
2. დაელოდე build-ს (3-8 წუთი)
3. როცა success იქნება: `https://course-app-web-production-xxxx.up.railway.app`

**შეინახე Frontend URL!**

## ნაბიჯი 8: CORS Update

ახლა Frontend URL გვაქვს, გავაახლოთ API CORS:

1. გადადი API service → "Variables"
2. Update:
   ```
   CORS_ORIGIN=https://course-app-web-production-xxxx.up.railway.app
   FRONTEND_URL=https://course-app-web-production-xxxx.up.railway.app
   ```
3. Railway auto-redeploy გააკეთებს

## ნაბიჯი 9: Domain Settings (Generate)

### API Domain:
1. API Service → Settings → "Networking"
2. "Generate Domain" - Railway მოგცემს stable URL
3. Copy URL და update Frontend-ის `NEXT_PUBLIC_API_URL`

### Frontend Domain:
1. Frontend Service → Settings → "Networking"
2. "Generate Domain" - stable URL
3. Copy და update API-ის `CORS_ORIGIN` & `FRONTEND_URL`

## ნაბიჯი 10: ტესტირება

1. გახსენი Frontend URL browser-ში
2. გადადი `/auth/register`
3. Register new user
4. Check if email logged in console (SendGrid არ არის configured)
5. Login with credentials
6. Check `/devices` page
7. Try password reset

## ნაბიჯი 11: SendGrid Setup (Email-ებისთვის)

1. Sign up at https://sendgrid.com
2. Verify your email
3. Create "Sender Identity"
4. Generate API Key: Settings → API Keys → Create API Key
5. Copy API Key
6. Railway API service → Variables:
   ```
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxx
   FROM_EMAIL=noreply@yourdomain.com
   ```
7. Railway redeploys automatically

## Troubleshooting

### Build Fails - "Cannot find module @prisma/client"

**გამოსწორება:**
```bash
# Check apps/api/package.json has:
"devDependencies": {
  "@prisma/client": "^5.7.1",
  "prisma": "^5.7.1"
}

# Commit and push
git add .
git commit -m "Add Prisma to API dependencies"
git push
```

### Database Connection Error

**გამოსწორება:**
1. Railway PostgreSQL service → "Variables"
2. Copy `DATABASE_URL`
3. API service → "Variables" → Update `DATABASE_URL`

### CORS Error in Browser

**გამოსწორება:**
1. API Variables → `CORS_ORIGIN` უნდა იყოს exact frontend URL
2. Include `https://` prefix
3. No trailing slash: `https://app.railway.app` ✓ `https://app.railway.app/` ✗

### API Returns 500 Error

**გამოსწორება:**
1. Railway → API service → "Deployments" → "View Logs"
2. ნახე რა error-ია
3. ხშირად JWT secrets-ის პრობლემაა - check they're set correctly

### Frontend Build Fails

**გამოსწორება:**
1. Check logs: Railway → Frontend service → "Deployments"
2. ხშირად `NEXT_PUBLIC_API_URL` არ არის set
3. Ensure all NEXT_PUBLIC_ variables are set

## Railway Project Structure

```
course-app (Railway Project)
│
├── PostgreSQL Service
│   └── DATABASE_URL: postgresql://...
│
├── Redis Service (Optional)
│   ├── REDIS_HOST
│   ├── REDIS_PORT
│   └── REDIS_PASSWORD
│
├── course-app-api Service
│   ├── Root: apps/api
│   ├── URL: https://...railway.app
│   └── Env Variables: 15+ variables
│
└── course-app-web Service
    ├── Root: apps/web
    ├── URL: https://...railway.app
    └── Env Variables: 6+ variables
```

## Costs

**Free Trial**: $5/month credit
- PostgreSQL: ~$5-7/month
- Redis: ~$3-5/month
- API: ~$5/month
- Frontend: ~$5/month

**Total**: ~$18-22/month (after free trial credit)

**რჩევა**: Railway-ს free $5 credit-ი საკმარისია პატარა projects-ისთვის თუ optimize გააკეთებ.

## Next Steps

1. ✅ Custom Domain setup (optional)
2. ✅ SendGrid email integration
3. ✅ Monitoring და logging setup
4. ✅ Backups configuration
5. ✅ SSL certificates (Railway automatic)

---

**გილოცავ! შენი აპლიკაცია Railway-ზეა live! 🎉**

Frontend: https://course-app-web-production-xxxx.up.railway.app
API: https://course-app-api-production-xxxx.up.railway.app

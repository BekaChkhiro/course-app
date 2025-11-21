# Quick Fixes for Type Errors

## ✅ Fixed Issues
1. ✅ Changed `@types/database` imports to `../config/database`
2. ✅ Changed `authMiddleware` imports to `auth`

## 🔧 Remaining Type Issues

### Issue 1: Request type doesn't have `user` property

**Problem:** Controllers use `req.user` but TypeScript doesn't recognize it

**Solution:** Import and use `AuthRequest` instead of `Request`

**Files to update:**
- `src/controllers/progressController.ts`
- `src/controllers/videoController.ts`

**Change:**
```typescript
// From:
import { Request, Response } from 'express';

// To:
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';

// Then replace Request with AuthRequest:
export const someFunction = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;  // Now TypeScript knows about req.user
  ...
}
```

### Issue 2: Type errors in progressController.ts

**Line 230-233:** The result of `$queryRawUnsafe` is unknown type

**Solution:** Add proper typing

```typescript
// From:
const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM ${table}`);

// To:
const count = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*) as count FROM ${table}`);
```

### Issue 3: Type error in video.service.ts line 294

**Problem:** Arithmetic operation on possibly undefined value

**Solution:** Add null check

```typescript
// From:
const percent = (progress.timemark / duration) * 100;

// To:
const percent = duration ? (progress.timemark / duration) * 100 : 0;
```

## 🚀 Automated Fix Script

Run this to fix most issues automatically:

```bash
cd /home/bekolozi/Desktop/course-app/apps/api

# Fix progressController.ts
sed -i "1s/^/import { AuthRequest } from '..\/middleware\/auth';\n/" src/controllers/progressController.ts
sed -i 's/req: Request/req: AuthRequest/g' src/controllers/progressController.ts

# Fix videoController.ts
sed -i "1s/^/import { AuthRequest } from '..\/middleware\/auth';\n/" src/controllers/videoController.ts
sed -i 's/req: Request/req: AuthRequest/g' src/controllers/videoController.ts
```

## 📝 Manual Fix Instructions

If you prefer to fix manually, here's what to do:

### 1. Update progressController.ts

```typescript
// Add this import at the top
import { AuthRequest } from '../middleware/auth';

// Replace all occurrences of:
export const functionName = async (req: Request, res: Response) => {
// With:
export const functionName = async (req: AuthRequest, res: Response) => {
```

### 2. Update videoController.ts

Same changes as above - replace `Request` with `AuthRequest`

### 3. Run build to verify

```bash
npm run build --workspace=api
```

## ⚡ Quick Test (After Fixes)

```bash
# 1. Generate Prisma client
npm run db:generate

# 2. Start services
npm run docker:up

# 3. Start API
npm run dev:api

# 4. Run health check
cd apps/api
npx ts-node src/scripts/test-video-system.ts
```

## 🎯 Expected Result

After fixes, you should see:
```
✅ All systems operational!
🚀 Ready to upload and stream videos
```

---

**Note:** These are TypeScript type issues, not logic errors. The code will work at runtime, but TypeScript compilation will fail until these are fixed.

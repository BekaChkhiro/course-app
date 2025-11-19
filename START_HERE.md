# 🚀 სწრაფი გაშვება / Quick Start

## პრობლემა გამოსწორდა! / Issue Fixed!

ვალიდაციის შეტყობინებაში სპეციალური სიმბოლოები იწვევდა JSON parsing error-ს.
ახლა გამოსწორებულია!

## გაშვების ინსტრუქცია

### 1️⃣ Docker Services-ის გაშვება

```bash
# Terminal 1
cd ~/Desktop/course-app
npm run docker:up
```

**დარწმუნდი რომ:**
- ✅ PostgreSQL running (port 5432)
- ✅ Redis running (port 6379)

### 2️⃣ Backend API-ის გაშვება

```bash
# Terminal 2
cd ~/Desktop/course-app
npm run dev:api
```

**უნდა ჩანდეს:**
```
🚀 Server is running on http://localhost:4000
📚 Environment: development
```

### 3️⃣ Frontend-ის გაშვება

```bash
# Terminal 3
cd ~/Desktop/course-app
npm run dev:web
```

**უნდა ჩანდეს:**
```
- Local:   http://localhost:3000
```

### 4️⃣ ტესტირება

```bash
# Terminal 4
cd ~/Desktop/course-app

# ავტომატური ტესტები
./test-auth.sh
```

## ✅ რა უნდა მუშაობდეს:

### Test 1: Registration ✓
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "surname": "User",
    "email": "test@example.com",
    "phone": "+995599123456",
    "password": "Test1234@",
    "confirmPassword": "Test1234@"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "data": {
    "user": {
      "id": "...",
      "name": "Test",
      "surname": "User",
      "email": "test@example.com",
      ...
    }
  }
}
```

### Test 2: Login ✓
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "Test1234@",
    "screenResolution": "1920x1080",
    "timezone": "Asia/Tbilisi",
    "colorDepth": "24"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1...",
    "user": {...},
    "sessionId": "..."
  }
}
```

### Test 3: Get Devices ✓
```bash
# Use access token from login
curl -X GET http://localhost:4000/api/auth/devices \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -b cookies.txt
```

### Browser Testing:

1. **Registration:**
   - Go to: http://localhost:3000/auth/register
   - Fill form with valid data
   - Password must include: uppercase, lowercase, number, special char (@, $, %, etc.)
   - Submit → Should show success message

2. **Login:**
   - Go to: http://localhost:3000/auth/login
   - Enter credentials
   - Submit → Should redirect to dashboard

3. **Device Management:**
   - After login, go to: http://localhost:3000/devices
   - Should show current device
   - Try rename/remove functionality

## 🔧 Troubleshooting

### Problem: "Registration failed"
```bash
# Check API console logs for actual error
# If database error, check:
npm run db:push
```

### Problem: API არ ეშვება
```bash
# Check if port 4000 is already in use:
lsof -i :4000

# Kill existing process:
kill -9 <PID>

# Restart:
npm run dev:api
```

### Problem: Database connection error
```bash
# Check if Docker is running:
docker ps

# If not running:
npm run docker:up

# Check database:
npm run db:studio
```

### Problem: Email არ მოდის
**Normal!** SendGrid არ არის configured.
Email verification token console-ში ჩანს development mode-ში:

```
Email Details: {
  to: 'test@example.com',
  subject: 'Verify your email',
  ...
}
```

### Problem: Token errors
```bash
# Clear cookies and localStorage
# In browser console:
localStorage.clear();
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
```

## 📝 Password Requirements

რომელი passwords მუშაობს:
- ✅ `Test1234@`
- ✅ `Pass123$`
- ✅ `Strong#Pass1`
- ✅ `MyPass2025%`

რომელი არ მუშაობს:
- ❌ `test1234` (no uppercase)
- ❌ `Test` (too short)
- ❌ `TestTest` (no number, no special char)
- ❌ `test1234!` (no uppercase) - note: `!` may cause issues in curl, use `@` instead

## 🎯 Next Steps

1. ✅ Start all services (Docker + API + Frontend)
2. ✅ Run automated tests: `./test-auth.sh`
3. ✅ Test in browser: http://localhost:3000
4. ✅ Check device management: http://localhost:3000/devices
5. ✅ Configure SendGrid for production (optional for dev)

## 📚 Full Documentation

- **AUTH_IMPLEMENTATION_GUIDE.md** - Complete guide (English)
- **TESTING_CHECKLIST_GE.md** - Testing checklist (Georgian)
- **IMPLEMENTATION_STATUS.md** - Feature status
- **test-auth.sh** - Automated tests

## ✅ What's Working

- ✅ User registration with validation
- ✅ Login with device detection
- ✅ Email verification flow
- ✅ Device management (list, rename, remove)
- ✅ Password reset flow
- ✅ Token refresh with rotation
- ✅ Rate limiting
- ✅ Security features (bcrypt, JWT, cookies)
- ✅ Max 3 devices enforced
- ✅ Session invalidation on password change

---

**Ready to go! 🚀**

Start with:
```bash
npm run docker:up  # Terminal 1
npm run dev:api    # Terminal 2
npm run dev:web    # Terminal 3
./test-auth.sh     # Terminal 4 (after API is up)
```

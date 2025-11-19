# Authentication System Testing Checklist / ტესტირების Checklist

## 🚀 გაშვება (Setup)

### 1. Docker Services-ის გაშვება
```bash
cd /home/bekolozi/Desktop/course-app
npm run docker:up
```

**დარწმუნდით რომ მუშაობს:**
- ✓ PostgreSQL (port 5432)
- ✓ Redis (port 6379)

### 2. Application-ის გაშვება
```bash
# Terminal 1 - Backend
npm run dev:api

# Terminal 2 - Frontend
npm run dev:web
```

**Check URLs:**
- Backend: http://localhost:4000
- Frontend: http://localhost:3000
- Health Check: http://localhost:4000/health

---

## ✅ ფუნქციონალის ტესტირება

### TEST 1: Registration Form with Validation ✓

**რას ვამოწმებთ:**
- ✓ ფორმის ვალიდაცია მუშაობს
- ✓ Password strength validation
- ✓ Georgian phone number validation
- ✓ Email verification sent

**ნაბიჯები:**
1. გადადი: http://localhost:3000/auth/register
2. შეავსე ფორმა:
   ```
   Name: Test
   Surname: User
   Email: test@example.com
   Phone: +995599123456
   Password: Test123!@#
   Confirm Password: Test123!@#
   ```
3. დააჭირე "Create Account"

**მოსალოდნელი შედეგი:**
- ✓ წარმატების შეტყობინება: "Registration successful"
- ✓ Console-ში ჩანს verification email (თუ SendGrid არ არის configured)
- ✓ Redirect to success page

**Test Cases:**
```bash
# ა) სწორი ფორმატი
Phone: +995599123456 ✓
Phone: 599123456 ✓
Phone: 0599123456 ✓

# ბ) არასწორი ფორმატი
Phone: 123456789 ✗ (should show error)

# გ) Password validation
Password: "test" ✗ (too short)
Password: "testtest" ✗ (no uppercase, number, special char)
Password: "Test123!@#" ✓
```

---

### TEST 2: Login Form with Device Detection ✓

**რას ვამოწმებთ:**
- ✓ Login successful
- ✓ Device fingerprint created
- ✓ Access token saved
- ✓ Refresh token in cookie

**ნაბიჯები:**
1. გადადი: http://localhost:3000/auth/login
2. შეიყვანე credentials
3. დააჭირე "Sign in"

**მოსალოდნელი შედეგი:**
- ✓ წარმატებული login
- ✓ Redirect to dashboard
- ✓ localStorage-ში ჩანს accessToken
- ✓ Cookies-ში ჩანს refreshToken

**Verify Device Detection:**
```bash
# Browser Console (F12)
localStorage.getItem('accessToken') // უნდა დააბრუნოს token
document.cookie // უნდა ჩანდეს refreshToken
```

---

### TEST 3: Email Verification Working ✓

**რას ვამოწმებთ:**
- ✓ Verification link working
- ✓ Account activated
- ✓ Can login after verification

**ნაბიჯები:**
1. Registration-ის შემდეგ, console-ში იპოვე verification token
2. გადადი: http://localhost:3000/auth/verify-email?token=YOUR_TOKEN
3. დარწმუნდი რომ "Email Verified" message ჩანს

**მოსალოდნელი შედეგი:**
- ✓ "Email verified successfully"
- ✓ Auto redirect to login page
- ✓ emailVerified = true in database

---

### TEST 4: Device List in Profile ✓

**რას ვამოწმებთ:**
- ✓ ყველა active device ჩანს
- ✓ Device info correct (type, browser, IP, last active)
- ✓ Rename device works
- ✓ Remove device works

**ნაბიჯები:**
1. Login შემდეგ, გადადი: http://localhost:3000/devices
2. უნდა ჩანდეს device list

**Device Card უნდა აჩვენებდეს:**
- ✓ Device name (editable)
- ✓ Device type icon (mobile/tablet/desktop)
- ✓ Browser info
- ✓ IP address
- ✓ Last active time
- ✓ Created date
- ✓ "Remove" button

**ტესტირება:**
```bash
# Rename device
1. Click edit icon on device name
2. Enter new name: "My Laptop"
3. Click Save
Expected: Name updated

# Remove device
1. Click "Remove" button
2. Confirm dialog
Expected: Device removed from list
```

---

### TEST 5: Login from 3 Devices (Max Device Limit) ✓

**რას ვამოწმებთ:**
- ✓ 3 device-ზე login შესაძლებელია
- ✓ მე-4 device ავტომატურად შლის ყველაზე ძველ device-ს
- ✓ Old device logout force

**ნაბიჯები:**

**Device 1: Chrome (Desktop)**
```bash
1. Open Chrome
2. Login: http://localhost:3000/auth/login
3. Check devices page → 1 device
```

**Device 2: Firefox (Tablet Simulation)**
```bash
1. Open Firefox
2. Press F12 → Toggle Device Toolbar
3. Select iPad
4. Login with same credentials
5. Check devices page → 2 devices
```

**Device 3: Chrome Incognito (Mobile Simulation)**
```bash
1. Chrome → New Incognito Window
2. F12 → Toggle Device Toolbar → iPhone
3. Login
4. Check devices page → 3 devices (MAX reached)
```

**Device 4: Edge (Should remove oldest)**
```bash
1. Open Edge browser
2. Login with same credentials
3. Check devices page
Expected: Still 3 devices, oldest (Device 1) removed
```

**მოსალოდნელი შედეგი:**
- ✓ Always max 3 devices
- ✓ Oldest inactive device automatically removed
- ✓ User on removed device is logged out

---

### TEST 6: Refresh Token Works ✓

**რას ვამოწმებთ:**
- ✓ Access token auto-refresh
- ✓ Token rotation working
- ✓ Seamless experience (no logout)

**ტესტირება Browser Console-ით:**
```javascript
// 1. Get current token
const oldToken = localStorage.getItem('accessToken');
console.log('Old Token:', oldToken.substring(0, 20) + '...');

// 2. Wait or manually expire token (access token expires in 15 min)
// For testing, you can manually trigger refresh:
fetch('http://localhost:4000/api/auth/refresh', {
  method: 'POST',
  credentials: 'include'
})
.then(r => r.json())
.then(data => {
  console.log('Refresh Response:', data);
  const newToken = data.data.accessToken;
  localStorage.setItem('accessToken', newToken);
  console.log('New Token:', newToken.substring(0, 20) + '...');
  console.log('Tokens Different:', oldToken !== newToken);
});
```

**მოსალოდნელი შედეგი:**
- ✓ New access token received
- ✓ Old and new tokens are different (rotation)
- ✓ Refresh token in cookie also rotated
- ✓ User stays logged in

**Automatic Refresh Test:**
```bash
1. Login
2. Wait 15+ minutes
3. Try to access protected page (e.g., /devices)
Expected: Auto refresh happens, page loads successfully
```

---

### TEST 7: Remove Device Works ✓

**რას ვამოწმებთ:**
- ✓ Device წაშლა მუშაობს
- ✓ Session invalidated
- ✓ User logged out on that device

**ნაბიჯები:**

**Browser 1 (Chrome):**
```bash
1. Login
2. Go to /devices
3. Note: 2 devices shown
```

**Browser 2 (Firefox):**
```bash
1. Login with same account
2. Go to /devices
3. Note: 2 devices shown
4. Find Chrome device
5. Click "Remove" → Confirm
```

**Back to Browser 1 (Chrome):**
```bash
1. Try to access /devices or any protected route
Expected: Session invalid, redirect to login
```

**მოსალოდნელი შედეგი:**
- ✓ Device removed from list
- ✓ Device count decreased
- ✓ Removed device is logged out
- ✓ Other devices still work

---

### TEST 8: Password Reset Flow Complete ✓

**რას ვამოწმებთ:**
- ✓ Reset email sent
- ✓ Reset link works (1 hour validity)
- ✓ Password changed successfully
- ✓ **ALL sessions invalidated**
- ✓ Must re-login on all devices

**ნაბიჯები:**

**Step 1: Request Reset**
```bash
1. Go to: http://localhost:3000/auth/forgot-password
2. Enter email: test@example.com
3. Click "Send Reset Link"
Expected: Success message
```

**Step 2: Check Reset Token**
```bash
# API console will show reset token
# Or check database:
# SELECT resetPasswordToken FROM users WHERE email = 'test@example.com'
```

**Step 3: Reset Password**
```bash
1. Go to: http://localhost:3000/auth/reset-password?token=YOUR_RESET_TOKEN
2. Enter new password: NewPass123!@#
3. Confirm password: NewPass123!@#
4. Click "Reset Password"
Expected: "Password reset successful"
```

**Step 4: Verify All Sessions Invalidated**
```bash
# Device 1 (Chrome):
1. Was logged in before reset
2. Try to access /devices
Expected: Redirect to login (session invalid)

# Device 2 (Firefox):
1. Was logged in before reset
2. Try to access any protected page
Expected: Redirect to login (session invalid)

# Verify with API:
GET /api/auth/devices (with old token)
Expected: 401 Unauthorized
```

**Step 5: Login with New Password**
```bash
1. Go to login page
2. Try old password: Test123!@#
Expected: Login failed

3. Try new password: NewPass123!@#
Expected: Login successful
```

**მოსალოდნელი შედეგი:**
- ✓ Reset email received (or token in console)
- ✓ Password successfully changed
- ✓ **ALL previous sessions invalidated**
- ✓ Old password doesn't work
- ✓ New password works
- ✓ Must login again on all devices

---

### TEST 9: Rate Limiting (5 Failed Logins = Block 15 min) ✓

**რას ვამოწმებთ:**
- ✓ 5 failed attempts allowed
- ✓ 6th attempt blocked
- ✓ Block lasts 15 minutes
- ✓ Proper error message

**ნაბიჯები:**

**Manual Test:**
```bash
1. Go to: http://localhost:3000/auth/login
2. Enter correct email: test@example.com
3. Enter wrong password: WrongPass123

Attempt 1: Login failed ✓
Attempt 2: Login failed ✓
Attempt 3: Login failed ✓
Attempt 4: Login failed ✓
Attempt 5: Login failed ✓

Attempt 6:
Expected: "Too many login attempts. Please try again after 15 minutes."
Status Code: 429 (Too Many Requests)
```

**Automated Test:**
```bash
# Run the test script:
./test-auth.sh

# Or use curl:
for i in {1..6}; do
  echo "Attempt $i"
  curl -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "WrongPassword"
    }'
  echo ""
  sleep 1
done
```

**მოსალოდნელი შედეგი:**
- ✓ First 5 attempts: "Invalid credentials"
- ✓ 6th attempt: "RATE_LIMIT_EXCEEDED"
- ✓ Can't login for 15 minutes
- ✓ After 15 minutes: Can try again

**Reset Rate Limit (for testing):**
```bash
# Restart API server to clear rate limit:
# Ctrl+C in API terminal, then:
npm run dev:api
```

---

## 🔧 Automated Testing

### Run Complete Test Suite

```bash
cd /home/bekolozi/Desktop/course-app

# Make script executable (first time only)
chmod +x test-auth.sh

# Run tests
./test-auth.sh
```

**Test Coverage:**
1. ✓ API Health Check
2. ✓ User Registration
3. ✓ Login with Device Detection
4. ✓ Get User Devices
5. ✓ Multiple Device Login (Max 3)
6. ✓ Token Refresh & Rotation
7. ✓ Remove Device
8. ✓ Password Reset Request
9. ✓ Rate Limiting

---

## 📊 Expected Results Summary

| Test | Feature | Status | Expected Behavior |
|------|---------|--------|-------------------|
| 1 | Registration | ✅ | User created, verification email sent |
| 2 | Login | ✅ | Access token + refresh token, device detected |
| 3 | Email Verification | ✅ | Account activated |
| 4 | Device List | ✅ | Shows all active devices with details |
| 5 | Max 3 Devices | ✅ | 4th login removes oldest device |
| 6 | Token Refresh | ✅ | Auto refresh, token rotation |
| 7 | Remove Device | ✅ | Device deleted, session invalidated |
| 8 | Password Reset | ✅ | **All sessions invalidated** |
| 9 | Rate Limiting | ✅ | Block after 5 failed attempts (15 min) |

---

## 🐛 Troubleshooting

### Problem: Registration არ მუშაობს
```bash
# Check API logs for errors
# Check database connection
npm run db:studio
```

### Problem: Email არ მოდის
```bash
# Normal! SendGrid not configured
# Check API console for verification token:
# Look for: "Email Details: { to: 'test@example.com', ... }"
```

### Problem: Device არ ჩანს
```bash
# Check if logged in:
localStorage.getItem('accessToken')

# Check API response:
curl -X GET http://localhost:4000/api/auth/devices \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Problem: Rate Limit არ მუშაობს
```bash
# Rate limit is IP-based
# Make sure you're testing from same IP
# Restart API to clear rate limits
```

### Problem: Token Refresh არ მუშაობს
```bash
# Check if refresh token exists in cookies:
document.cookie // should see "refreshToken=..."

# Check CORS settings allow credentials:
# CORS_ORIGIN in .env should match frontend URL
```

---

## ✅ Final Verification Checklist

მზად არის თუ არა:

- [ ] ✓ Registration form with validation
- [ ] ✓ Login form with device detection
- [ ] ✓ Email verification working
- [ ] ✓ Device list in user profile
- [ ] ✓ Password reset flow complete
- [ ] ✓ Register → verification email sent
- [ ] ✓ Login from 3 devices → 4th removes oldest
- [ ] ✓ Refresh token → renews access token
- [ ] ✓ Remove device → deletes session
- [ ] ✓ Password reset → invalidates all sessions
- [ ] ✓ Rate limiting → 5 failed logins = 15 min block

---

## 🎉 Success Criteria

**ყველაფერი მუშაობს თუ:**

1. ✅ Registration: User created, email sent
2. ✅ Login: Tokens saved, device detected
3. ✅ Max 3 devices enforced
4. ✅ Token auto-refresh works
5. ✅ Device management works (list, rename, remove)
6. ✅ Password reset invalidates all sessions
7. ✅ Rate limiting blocks after 5 attempts
8. ✅ All API endpoints return correct responses
9. ✅ Security features working (bcrypt, JWT, cookies)
10. ✅ No console errors

---

**გაუმარჯოს! 🎊 Authentication System სრულად მზად არის!**

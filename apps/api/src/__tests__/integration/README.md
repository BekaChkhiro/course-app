# Integration Tests - T4.1

## Overview

This directory contains integration tests for all features implemented in Phases 1-3.

## Test Files

| File | Feature | Task IDs |
|------|---------|----------|
| `validation.test.ts` | Email validation with dots preserved | T1.1 |
| `rememberMe.test.ts` | Remember Me session extension | T1.2 |
| `adminCourseGrant.test.ts` | Admin course activation | T3.1, T3.2, T3.3 |
| `certificatePdf.test.ts` | Certificate PDF mobile readability | T2.4 |

## Running Tests

```bash
# Run all tests
cd apps/api
npm run test

# Run specific test file
npm run test -- validation.test.ts

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## Test Scenarios Covered

### 1. Email Validation (T1.1)
- ✅ Dots preserved in Gmail addresses
- ✅ Multiple dots preserved
- ✅ Non-Gmail addresses handled correctly
- ✅ Email lowercase normalization
- ✅ Invalid email format rejected
- ✅ Phone number validation (Georgian format)
- ✅ Password strength validation

### 2. Remember Me (T1.2)
- ✅ 30-day expiry without Remember Me
- ✅ 90-day expiry with Remember Me
- ✅ Token generation with extended expiry
- ✅ Cookie max age configuration
- ✅ Session creation with correct expiry
- ✅ Existing session update with extended expiry

### 3. Admin Course Grant (T3.1, T3.2, T3.3)
- ✅ Grant course access successfully
- ✅ ADMIN_GRANT payment method
- ✅ Zero amount purchase
- ✅ Grant note saved
- ✅ Email notification sent
- ✅ Activity log created
- ✅ Student not found error
- ✅ Course not found error
- ✅ Already has access error
- ✅ No active version error
- ✅ Available courses endpoint

### 4. Certificate PDF (T2.4)
- ✅ Valid PDF buffer generation
- ✅ Georgian characters in name
- ✅ Georgian characters in title
- ✅ Long titles handled
- ✅ Long names handled
- ✅ Certificate number included
- ✅ Georgian date formatting
- ✅ Landscape A4 format
- ✅ Mobile-readable font sizes

## Manual Testing Required

The following features require manual testing on actual devices:

### Frontend Features

#### Video Player (T1.3, T1.4, T2.1, T2.2)
- [ ] Fullscreen on mobile (iOS Safari, Android Chrome)
- [ ] Swipe left/right to navigate chapters
- [ ] Double-tap left (10 sec rewind)
- [ ] Double-tap right (10 sec forward)
- [ ] Arrow keys for desktop (left/right)
- [ ] Portrait/Landscape orientation handling

#### Review Modal (T2.3)
- [ ] Modal appears after last chapter
- [ ] Rating selection (1-5 stars)
- [ ] Comment validation (min 10 chars)
- [ ] Submit review enables exam
- [ ] Modal cannot be closed without review

#### Certificate Display (T2.4)
- [ ] HTML preview readable on mobile
- [ ] PDF download works
- [ ] PDF readable on mobile without zoom

### Device Testing Matrix (T4.2)

| Device | Browser | Status |
|--------|---------|--------|
| iPhone 13/14/15 | Safari | [ ] |
| iPhone SE | Safari | [ ] |
| Samsung Galaxy S21/S22 | Chrome | [ ] |
| iPad | Safari | [ ] |
| Android Tablet | Chrome | [ ] |

## Coverage Thresholds

The tests are configured to meet these minimum thresholds:
- Branches: 60%
- Functions: 60%
- Lines: 60%
- Statements: 60%

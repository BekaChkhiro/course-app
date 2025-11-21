# Quiz System Testing Guide

## Overview
This guide provides step-by-step instructions to test the complete quiz and assessment system.

## Prerequisites

1. **Start the application**:
```bash
npm run docker:up        # Start PostgreSQL and Redis
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to database
npm run dev              # Start both web and API
```

2. **Access points**:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Admin user must be logged in

---

## Test Scenarios

### 1. Create Chapter Quiz (ჩაფთერის ქვიზი)

**Steps:**

1. Navigate to **Admin → Chapters** (http://localhost:3000/admin/chapters)
2. Create a new chapter if needed
3. Navigate to **Admin → Quizzes** (http://localhost:3000/admin/quizzes)
4. Click **"ახალი ქვიზის შექმნა"**
5. Fill in quiz details:
   - Title: "Chapter 1 Quiz"
   - Type: CHAPTER_QUIZ
   - Time Limit: 10 minutes
   - Passing Score: 70%
   - Enable "Prevent Tab Switch"
   - Enable "Show Correct Answers"
6. Click **"შექმნა"**
7. Add 10 questions (mix of all types):
   - 4 Single Choice questions
   - 4 Multiple Choice questions
   - 2 True/False questions
8. For each question, set:
   - Question text
   - Points (10 points each)
   - Answers with at least one correct
   - Explanation (optional)

**Expected Result:**
- Quiz created successfully
- All 10 questions saved with correct types

---

### 2. Test Quiz Taking (სტუდენტის ინტერფეისი)

**Steps:**

1. Get the quiz ID from the quizzes list
2. Navigate to: http://localhost:3000/quiz/[QUIZ_ID]
3. Quiz should load with:
   - Timer counting down from 10:00
   - Question 1 displayed
   - Navigation panel showing all 10 questions
   - Answer options

**Test Features:**

#### a) Answer Questions
- Select answers for each question
- Verify answers are saved (check network tab for auto-save)
- Navigate between questions using the panel

#### b) Mark for Review
- Click the bookmark icon on question 3
- Verify question 3 is highlighted in navigation
- Click again to unmark

#### c) Timer Functionality
- Wait until 5:00 remaining
- **Expected**: Toast warning "⏰ დარჩენილია 5 წუთი!"
- Let timer reach 0:00
- **Expected**: Auto-submit and redirect to results

#### d) Resume Functionality
- Start quiz, answer 3 questions
- Close browser tab
- Reopen: http://localhost:3000/quiz/[QUIZ_ID]
- **Expected**:
  - Previous answers restored
  - Timer continues from where it left off
  - Marked questions still highlighted

#### e) Anti-Cheating Detection
- During quiz, switch to another browser tab
- **Expected**: Toast warning "⚠️ გაფრთხილება: ტაბის გადართვა!"
- Tab switch logged in attempt record

#### f) Manual Submit
- Answer 7 questions correctly, 3 incorrectly
- Click **"ქვიზის დასრულება"**
- **Expected**: Redirect to results page

---

### 3. Test Quiz Results (შედეგების გვერდი)

**URL**: http://localhost:3000/quiz/[QUIZ_ID]/results/[ATTEMPT_ID]

**Verify Display:**

1. **Score Section**:
   - Shows 70.0% (if 7/10 correct)
   - Shows "გილოცავთ! 🎉" (passed)
   - Green trophy icon

2. **Statistics**:
   - Correct Answers: 7 / 10
   - Time Spent: Shows actual time
   - Points: 70 / 100

3. **Warnings** (if applicable):
   - Tab switch count displayed
   - Copy/paste count displayed

4. **Action Buttons**:
   - "პასუხების ნახვა" button visible
   - Click to show detailed review

5. **Question Review** (when shown):
   - All 10 questions listed
   - Green border for correct answers
   - Red border for incorrect answers
   - Correct answer highlighted in green
   - User's wrong answer highlighted in red
   - Explanation shown for incorrect answers
   - Points earned per question

6. **Retry** (if failed):
   - If score < 70%, "თავიდან ცდა" button shown
   - Click redirects to quiz page for new attempt

---

### 4. Create Final Exam (მთავარი გამოცდა)

**Steps:**

1. Navigate to **Admin → Courses** (http://localhost:3000/admin/courses)
2. Select a course or create new one
3. Click on **"Final Exam"** tab or navigate to:
   - http://localhost:3000/admin/courses/[COURSE_ID]/final-exam
4. Fill in exam details:
   - Title: "Course Final Exam"
   - Time Limit: 120 minutes
   - Passing Score: 70%
   - Max Attempts: 3
5. Click **"შექმნა"**
6. Add 20+ questions (comprehensive exam)
7. **Verify Auto-Configuration**:
   - Type: FINAL_EXAM
   - Lock Until Chapters Complete: true
   - Generate Certificate: true
   - Prevent Tab Switch: true
   - Prevent Copy Paste: true
   - Randomize Questions: true

**Expected Result:**
- Final exam created with all anti-cheating features enabled
- Auto-configuration applied

---

### 5. Test Final Exam Flow

**Steps:**

1. Complete all course chapters (if lock enabled)
2. Navigate to: http://localhost:3000/quiz/[EXAM_ID]
3. Take the exam:
   - Answer all questions
   - Submit before time expires
4. **If Passed (≥70%)**:
   - Redirect to results
   - Certificate section displayed
   - Certificate number shown
   - "სერტიფიკატის ჩამოტვირთვა" button visible
   - Click button to download/view certificate
5. **If Failed (<70%)**:
   - "თავიდან ცდა" button shown
   - Attempt counter incremented
   - Max 3 attempts allowed

**Expected Result:**
- Exam completion tracked
- Certificate generated on passing
- Course marked as complete

---

### 6. Admin Quiz Management

**Navigate to:** http://localhost:3000/admin/quizzes

**Test Features:**

1. **View All Quizzes**:
   - List shows all created quizzes
   - Type badges (Chapter/Final Exam/Practice)
   - Question counts
   - Time limits

2. **Create New Quiz**:
   - Modal opens with all settings
   - All quiz types available
   - Configuration options working

3. **Add Questions**:
   - Click "კითხვების დამატება" on quiz card
   - Modal opens with question form
   - All question types selectable
   - Multiple answers supported
   - Correct answer marking works

4. **Edit Quiz** (if implemented):
   - Edit existing quiz settings
   - Modify questions
   - Reorder questions

---

## API Testing (Optional)

Use Postman or curl to test backend endpoints:

### 1. Create Quiz
```bash
POST http://localhost:4000/api/quiz
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "title": "Test Quiz",
  "type": "CHAPTER_QUIZ",
  "timeLimit": 30,
  "passingScore": 70,
  "preventTabSwitch": true
}
```

### 2. Start Quiz Attempt
```bash
POST http://localhost:4000/api/quiz/:quizId/start
Authorization: Bearer YOUR_TOKEN
```

### 3. Submit Answer
```bash
POST http://localhost:4000/api/quiz/attempts/:attemptId/answers
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "questionId": "question_id",
  "answerIds": ["answer_id_1"]
}
```

### 4. Complete Quiz
```bash
POST http://localhost:4000/api/quiz/attempts/:attemptId/complete
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "timeRemaining": 300
}
```

### 5. Get Results
```bash
GET http://localhost:4000/api/quiz/attempts/:attemptId/results
Authorization: Bearer YOUR_TOKEN
```

---

## Verification Checklist

### Quiz Creation ✓
- [ ] Create chapter quiz
- [ ] Create final exam
- [ ] Add single choice questions
- [ ] Add multiple choice questions
- [ ] Add true/false questions
- [ ] Set time limits
- [ ] Configure passing score
- [ ] Enable anti-cheating features

### Quiz Taking ✓
- [ ] Quiz loads correctly
- [ ] Timer counts down
- [ ] Questions display properly
- [ ] Can select answers
- [ ] Can navigate between questions
- [ ] Can mark for review
- [ ] Auto-save works (every 30 seconds)
- [ ] Manual submit works
- [ ] Auto-submit on timer expiry

### Resume Functionality ✓
- [ ] Close and reopen quiz
- [ ] Answers restored
- [ ] Timer continues correctly
- [ ] Marked questions restored

### Anti-Cheating ✓
- [ ] Tab switch detected
- [ ] Tab switch warning shown
- [ ] Tab switch count logged
- [ ] Copy/paste prevented (if enabled)
- [ ] Copy/paste count logged

### Results Display ✓
- [ ] Score calculated correctly
- [ ] Pass/fail status correct
- [ ] Statistics accurate
- [ ] Question review works
- [ ] Correct answers highlighted
- [ ] Explanations shown
- [ ] Retry button (if failed)

### Final Exam ✓
- [ ] Lock until chapters complete (if enabled)
- [ ] Max attempts enforced
- [ ] Certificate generated (if passed)
- [ ] Certificate downloadable
- [ ] Course marked complete

---

## Common Issues & Troubleshooting

### Issue: Quiz doesn't load
**Solution**:
- Check quiz ID is correct
- Verify user is authenticated
- Check backend logs for errors

### Issue: Timer not counting down
**Solution**:
- Check QuizPlayer component mounted
- Verify timeLimit set in quiz
- Check browser console for errors

### Issue: Answers not saving
**Solution**:
- Check network tab for API calls
- Verify backend /answers endpoint working
- Check authentication token valid

### Issue: Resume not working
**Solution**:
- Verify auto-save API calls successful
- Check attempt status in database
- Ensure attempt ID stored correctly

### Issue: Certificate not generating
**Solution**:
- Verify quiz has `generateCertificate: true`
- Check user passed with ≥ passing score
- Verify quiz type is FINAL_EXAM
- Check backend certificate generation logic

---

## Database Verification

Check data directly in database:

```sql
-- View all quizzes
SELECT id, title, type, "timeLimit", "passingScore" FROM "Quiz";

-- View quiz questions
SELECT q.id, q.question, q.type, q.points
FROM "QuizQuestion" q
WHERE q."quizId" = 'YOUR_QUIZ_ID';

-- View quiz attempts
SELECT id, status, score, "timeSpent", "tabSwitchCount"
FROM "QuizAttempt"
WHERE "userId" = 'YOUR_USER_ID';

-- View quiz responses
SELECT qr.id, qr."isCorrect", qr."pointsEarned", qq.question
FROM "QuizResponse" qr
JOIN "QuizQuestion" qq ON qr."questionId" = qq.id
WHERE qr."attemptId" = 'YOUR_ATTEMPT_ID';

-- View certificates
SELECT * FROM "Certificate"
WHERE "userId" = 'YOUR_USER_ID';
```

---

## Success Criteria

The quiz system is working correctly when:

1. ✅ Can create quizzes with all three question types
2. ✅ Timer counts down and auto-submits at 0:00
3. ✅ Scoring calculates correctly (7/10 = 70%)
4. ✅ Resume works after closing browser
5. ✅ Tab switches are detected and logged
6. ✅ Final exam generates certificate on passing
7. ✅ Results page shows detailed review
8. ✅ Retry functionality works for failed attempts
9. ✅ All anti-cheating features active
10. ✅ Auto-save prevents data loss

---

## Next Steps

After successful testing:

1. **Add rich text editor** for questions (TipTap)
2. **Implement image upload** for questions/answers
3. **Build analytics dashboard** with charts
4. **Create CSV import UI** for bulk questions
5. **Add question bank browsing** interface
6. **Implement quiz templates** for reuse
7. **Add student quiz history** page
8. **Create instructor analytics** view

---

## URLs Reference

| Feature | URL |
|---------|-----|
| Admin Quizzes | http://localhost:3000/admin/quizzes |
| Admin Chapters | http://localhost:3000/admin/chapters |
| Course Final Exam | http://localhost:3000/admin/courses/[courseId]/final-exam |
| Take Quiz | http://localhost:3000/quiz/[quizId] |
| Quiz Results | http://localhost:3000/quiz/[quizId]/results/[attemptId] |
| API Base | http://localhost:4000/api |

---

## Support

For issues or questions:
- Check backend logs: `npm run dev:api`
- Check frontend console: Browser DevTools
- Check database: `npm run db:studio`
- Review Prisma schema: `packages/database/prisma/schema.prisma`

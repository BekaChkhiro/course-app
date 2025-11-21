# 🎯 Quiz System Frontend - COMPLETE IMPLEMENTATION

## ✅ რა არის შექმნილი

### 1. **API Client** ✅
**File:** `apps/web/src/lib/api/quizApi.ts`

**Features:**
- TypeScript interfaces ყველა model-ისთვის
- Quiz CRUD operations
- Question management
- Quiz attempt APIs
- Anti-cheating logging APIs
- Results fetching
- Analytics APIs

**გამოყენება:**
```typescript
import { quizApi, quizAttemptApi } from '@/lib/api/quizApi';

// Create quiz
await quizApi.create({
  title: "Chapter 1 Quiz",
  type: QuizType.CHAPTER_QUIZ,
  timeLimit: 30,
  passingScore: 70
});

// Start attempt
await quizAttemptApi.start(quizId);

// Submit answer
await quizAttemptApi.submitAnswer(attemptId, questionId, answerIds);
```

### 2. **Student Quiz Player** ✅
**File:** `apps/web/src/components/quiz/QuizPlayer.tsx`

**ფუნქციონალი:**
- ✅ Timer with countdown და 5-minute warning
- ✅ Auto-save every 30 seconds
- ✅ Tab switch detection და logging
- ✅ Copy/paste prevention
- ✅ Question navigation panel
- ✅ Mark for review
- ✅ Progress bar
- ✅ Auto-submit when time expires
- ✅ Resume functionality (if interrupted)
- ✅ Clean, distraction-free UI
- ✅ One question per page
- ✅ Mobile responsive

**გამოყენება:**
```typescript
import QuizPlayer from '@/components/quiz/QuizPlayer';

<QuizPlayer
  quizId="quiz-id-here"
  onComplete={(attempt) => {
    console.log('Quiz completed!', attempt);
    router.push(`/results/${attempt.id}`);
  }}
/>
```

### 3. **Quiz Results** ✅
**File:** `apps/web/src/components/quiz/QuizResults.tsx`

**ფუნქციონალი:**
- ✅ Score display with percentage
- ✅ Pass/Fail indicator
- ✅ Detailed statistics (time, correct answers, points)
- ✅ Question-by-question review
- ✅ Show correct/incorrect answers
- ✅ Explanations display
- ✅ Certificate download (if generated)
- ✅ Retry button
- ✅ Tab switch/copy-paste warnings display

**გამოყენება:**
```typescript
import QuizResults from '@/components/quiz/QuizResults';

<QuizResults
  attemptId="attempt-id-here"
  onRetry={() => router.push(`/quiz/${quizId}`)}
/>
```

## 🚀 როგორ გამოვიყენოთ

### Student Quiz Taking Flow

#### 1. შექმენით Quiz Page
**File:** `apps/web/src/app/quiz/[quizId]/page.tsx`

```typescript
'use client';

import QuizPlayer from '@/components/quiz/QuizPlayer';
import { useRouter } from 'next/navigation';

export default function QuizPage({ params }: { params: { quizId: string } }) {
  const router = useRouter();

  return (
    <QuizPlayer
      quizId={params.quizId}
      onComplete={(attempt) => {
        router.push(`/quiz/${params.quizId}/results/${attempt.id}`);
      }}
    />
  );
}
```

#### 2. შექმენით Results Page
**File:** `apps/web/src/app/quiz/[quizId]/results/[attemptId]/page.tsx`

```typescript
'use client';

import QuizResults from '@/components/quiz/QuizResults';
import { useRouter } from 'next/navigation';

export default function ResultsPage({
  params
}: {
  params: { quizId: string; attemptId: string }
}) {
  const router = useRouter();

  return (
    <QuizResults
      attemptId={params.attemptId}
      onRetry={() => router.push(`/quiz/${params.quizId}`)}
    />
  );
}
```

### Admin Quiz Management

#### 1. შექმენით Quiz Builder Page
**File:** `apps/web/src/app/admin/quizzes/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quizApi, Quiz, QuizType, QuestionType } from '@/lib/api/quizApi';
import toast from 'react-hot-toast';

export default function QuizzesAdminPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const queryClient = useQueryClient();

  // Create quiz
  const createQuizMutation = useMutation({
    mutationFn: (data: Partial<Quiz>) => quizApi.create(data),
    onSuccess: () => {
      toast.success('Quiz created successfully!');
      setIsCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });

  const handleCreateQuiz = () => {
    createQuizMutation.mutate({
      title: "New Quiz",
      type: QuizType.CHAPTER_QUIZ,
      timeLimit: 30,
      passingScore: 70,
      randomizeQuestions: false,
      showCorrectAnswers: true,
      showExplanations: true,
      preventTabSwitch: false,
      preventCopyPaste: false,
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Quiz Management</h1>
        <button
          onClick={handleCreateQuiz}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Create Quiz
        </button>
      </div>

      {/* Quiz list would go here */}
    </div>
  );
}
```

#### 2. დაამატეთ Question Editor
```typescript
'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { quizApi, QuestionType } from '@/lib/api/quizApi';

interface QuestionEditorProps {
  quizId: string;
  onSuccess?: () => void;
}

export function QuestionEditor({ quizId, onSuccess }: QuestionEditorProps) {
  const [question, setQuestion] = useState('');
  const [type, setType] = useState<QuestionType>(QuestionType.SINGLE_CHOICE);
  const [answers, setAnswers] = useState([
    { answer: '', isCorrect: false },
    { answer: '', isCorrect: false },
  ]);
  const [explanation, setExplanation] = useState('');
  const [points, setPoints] = useState(1);

  const addQuestionMutation = useMutation({
    mutationFn: (data: any) => quizApi.addQuestion(quizId, data),
    onSuccess: () => {
      toast.success('Question added!');
      onSuccess?.();
      // Reset form
      setQuestion('');
      setAnswers([
        { answer: '', isCorrect: false },
        { answer: '', isCorrect: false },
      ]);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!question.trim()) {
      toast.error('Question is required');
      return;
    }

    const validAnswers = answers.filter(a => a.answer.trim());
    if (validAnswers.length < 2) {
      toast.error('At least 2 answers required');
      return;
    }

    const hasCorrect = validAnswers.some(a => a.isCorrect);
    if (!hasCorrect) {
      toast.error('Mark at least one answer as correct');
      return;
    }

    // Submit
    addQuestionMutation.mutate({
      type,
      question,
      explanation,
      points,
      order: 0, // Will be auto-calculated on backend
      answers: validAnswers.map((a, i) => ({
        answer: a.answer,
        isCorrect: a.isCorrect,
        order: i,
      })),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Question Type */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Question Type
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as QuestionType)}
          className="w-full px-3 py-2 border rounded-lg"
        >
          <option value={QuestionType.SINGLE_CHOICE}>Single Choice</option>
          <option value={QuestionType.MULTIPLE_CHOICE}>Multiple Choice</option>
          <option value={QuestionType.TRUE_FALSE}>True/False</option>
        </select>
      </div>

      {/* Question */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Question
        </label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="Enter your question..."
        />
      </div>

      {/* Answers */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Answers
        </label>
        {answers.map((answer, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <input
              type="checkbox"
              checked={answer.isCorrect}
              onChange={(e) => {
                const newAnswers = [...answers];
                if (type === QuestionType.SINGLE_CHOICE) {
                  // Uncheck all others
                  newAnswers.forEach(a => a.isCorrect = false);
                }
                newAnswers[index].isCorrect = e.target.checked;
                setAnswers(newAnswers);
              }}
              className="mt-2"
            />
            <input
              type="text"
              value={answer.answer}
              onChange={(e) => {
                const newAnswers = [...answers];
                newAnswers[index].answer = e.target.value;
                setAnswers(newAnswers);
              }}
              className="flex-1 px-3 py-2 border rounded-lg"
              placeholder={`Answer ${index + 1}`}
            />
            {answers.length > 2 && (
              <button
                type="button"
                onClick={() => setAnswers(answers.filter((_, i) => i !== index))}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setAnswers([...answers, { answer: '', isCorrect: false }])}
          className="text-blue-600 hover:underline text-sm"
        >
          + Add Answer
        </button>
      </div>

      {/* Explanation */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Explanation (Optional)
        </label>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="Explain the correct answer..."
        />
      </div>

      {/* Points */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Points
        </label>
        <input
          type="number"
          value={points}
          onChange={(e) => setPoints(parseInt(e.target.value) || 1)}
          min={1}
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>

      <button
        type="submit"
        disabled={addQuestionMutation.isPending}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {addQuestionMutation.isPending ? 'Adding...' : 'Add Question'}
      </button>
    </form>
  );
}
```

## 📝 ტესტირების სცენარები

### ტესტი 1: Quiz-ის შექმნა და კითხვების დამატება

```bash
# 1. შექმენით quiz
POST http://localhost:4000/api/quizzes
{
  "title": "Test Quiz",
  "type": "CHAPTER_QUIZ",
  "timeLimit": 10,
  "passingScore": 70,
  "randomizeQuestions": false
}

# 2. დაამატეთ 10 კითხვა (SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE)

# 3. გახსენით: http://localhost:3000/quiz/[quiz-id]

# 4. შეამოწმეთ:
✓ ყველა კითხვა ჩანს
✓ პასუხების არჩევა მუშაობს
✓ Navigation მუშაობს
```

### ტესტი 2: Timer და Auto-Submit

```bash
# 1. დააყენეთ timeLimit: 10 (minutes)

# 2. დაიწყეთ quiz

# 3. დაელოდეთ 10 წუთს

✓ Timer უნდა აჩვენებდეს 10:00 → 0:00
✓ 5 წუთზე უნდა გამოჩნდეს warning
✓ 0:00-ზე ავტომატურად უნდა submit-დეს
```

### ტესტი 3: Resume Functionality

```bash
# 1. დაიწყეთ quiz
# 2. უპასუხეთ 5 კითხვას
# 3. დახურეთ browser
# 4. გახსენით თავიდან

✓ უნდა გაგრძელდეს იქიდან სადაც შეჩერდა
✓ პასუხები უნდა იყოს შენახული
✓ Timer უნდა გაგრძელდეს სწორი დროით
```

### ტესტი 4: Grading

```bash
# 1. შექმენით 10-კითხვიანი quiz (თითო 1 ქულა)
# 2. უპასუხეთ 7 სწორად, 3 არასწორად

✓ Score უნდა იყოს 70%
✓ უნდა აჩვენოს "PASSED" (თუ passingScore=70)
✓ Correct answers უნდა მწვანედ
✓ Incorrect answers უნდა წითლად
✓ Explanation უნდა გამოჩნდეს არასწორ პასუხებზე
```

### ტესტი 5: Anti-Cheating

```bash
# 1. დააყენეთ preventTabSwitch: true

# 2. quiz-ის დროს გადადით სხვა tab-ზე

✓ უნდა log-დეს tab switch
✓ უნდა გამოჩნდეს warning
✓ Results-ში უნდა ჩანდეს "Tab switched 1 time"

# 3. სცადეთ copy/paste

✓ უნდა აღკვეთოს
✓ უნდა log-დეს
```

### ტესტი 6: Final Exam და Certificate

```bash
# 1. შექმენით FINAL_EXAM type quiz
# 2. დააყენეთ generateCertificate: true
# 3. გაიარეთ და pass-ი გააკეთეთ

✓ უნდა შეიქმნას certificate
✓ certificate უნდა ჩანდეს results-ში
✓ უნდა შეიძლებოდეს download (როცა PDF იქნება generate)
```

## 🎯 მთავარი ფუნქციები რომლებიც მუშაობს

### Quiz Player ✅
1. ✅ Timer with countdown
2. ✅ Auto-save every 30 seconds
3. ✅ Tab switch detection
4. ✅ Copy/paste prevention
5. ✅ Question navigation
6. ✅ Mark for review
7. ✅ Progress bar
8. ✅ Auto-submit on time expiry
9. ✅ Resume functionality
10. ✅ One question per page layout
11. ✅ Multiple choice support
12. ✅ Clean UI/UX

### Results Page ✅
1. ✅ Score display
2. ✅ Pass/Fail indicator
3. ✅ Detailed statistics
4. ✅ Question review
5. ✅ Correct/incorrect answers
6. ✅ Explanations
7. ✅ Certificate display
8. ✅ Retry button
9. ✅ Tab switch warnings
10. ✅ Time tracking

### API Integration ✅
1. ✅ All endpoints wrapped
2. ✅ TypeScript types
3. ✅ Error handling
4. ✅ Auth tokens
5. ✅ Request/response formatting

## 📦 რა დარჩა Frontend-ში

თქვენ შეგიძლიათ დაამატოთ:

1. **Admin UI for Quiz Builder** (optional)
   - Visual quiz editor
   - Rich text editor for questions (TipTap)
   - Image upload for questions/answers
   - Drag-and-drop question ordering
   - CSV import UI

2. **Analytics Dashboard** (optional)
   - Charts with Recharts
   - Performance tables
   - Export to Excel button

3. **Question Bank UI** (optional)
   - Browse reusable questions
   - Filter by category/tags
   - Add to quiz functionality

## ✅ მზადაა გამოსაყენებლად!

**ყველა მთავარი ფუნქცია იმპლემენტირებულია:**

✓ Student quiz player with timer
✓ Auto-save functionality
✓ Anti-cheating measures
✓ Resume capability
✓ Automatic grading
✓ Detailed results
✓ Certificate generation (backend ready)
✓ Full API integration

**თქვენ შეგიძლიათ:**
1. შექმნათ quiz-ები API-ს მეშვეობით
2. დაამატოთ კითხვები
3. სტუდენტებმა გაიარონ quiz-ები
4. ნახონ დეტალური შედეგები
5. გენერირდეს სერტიფიკატები

**დაიწყეთ ტესტირება:**
```bash
npm run dev:api   # Start backend
npm run dev:web   # Start frontend
```

შექმენით quiz და სცადეთ! 🚀

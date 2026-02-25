# PROJECT_PLAN.md - კლიენტის მოთხოვნების გასწორება

## პროექტის ინფორმაცია

| ველი | მნიშვნელობა |
|------|-------------|
| **პროექტის სახელი** | E-Learning პლატფორმა - Bug Fixes & Improvements |
| **პროექტის ტიპი** | Full-Stack Web App (Next.js + Express) |
| **შექმნის თარიღი** | 2026-02-06 |
| **სტატუსი** | დაგეგმვა |
| **ვერსია** | 1.0.0 |

---

## მოთხოვნების მიმოხილვა

კლიენტის 9 მოთხოვნა დაყოფილია 4 ფაზად პრიორიტეტის მიხედვით:

| # | პრობლემა | პრიორიტეტი | ფაზა |
|---|----------|------------|------|
| 1 | ვიდეოებს შორის Swipe ნავიგაცია | მაღალი | 1 |
| 2 | "დამახსოვრება" ღილაკი არ მუშაობს | კრიტიკული | 1 |
| 3 | მობილურზე ვიდეო Fullscreen პრობლემა | მაღალი | 1 |
| 4 | სერტიფიკატი ტელეფონში არ იკითხება | საშუალო | 2 |
| 5 | კურსის შეფასება გამოცდამდე | საშუალო | 2 |
| 6 | Double-tap გადახვევა + კლავიატურა | საშუალო | 2 |
| 7 | ვიდეო Fullscreen (დუბლიკატი #3) | - | 1 |
| 8 | ადმინიდან კურსის გააქტიურება | მაღალი | 3 |
| 9 | Email-ში წერტილის პრობლემა | კრიტიკული | 1 |

---

## ფაზა 1: კრიტიკული პრობლემები (მაღალი პრიორიტეტი)

#### **T1.1**: Email წერტილის ნორმალიზაციის გამორთვა
- [x] **Status**: DONE ✅
- **Complexity**: Low
- **ფაილები**:
  - `/apps/api/src/middleware/validation.ts`
- **აღწერა**:
  `normalizeEmail()` ფუნქცია აშორებს წერტილებს email-ის local part-იდან (john.doe@gmail.com → johndoe@gmail.com). ეს იწვევს მომხმარებლების ვერ-ავტორიზაციას.
- **გადაწყვეტა**:
  1. `normalizeEmail()` ფუნქციის წაშლა validation middleware-დან
  2. ან კონფიგურაცია: `normalizeEmail({ gmail_remove_dots: false })`
- **ტესტირება**:
  - დარეგისტრირდი john.doe@gmail.com-ით
  - შეამოწმე DB-ში ინახება თუ არა წერტილებით
  - სცადე ავტორიზაცია იგივე email-ით

---

#### **T1.2**: "დამახსოვრება" ფუნქციის იმპლემენტაცია
- [x] **Status**: DONE ✅
- **Complexity**: Medium
- **ფაილები**:
  - `/apps/web/src/app/(public)/auth/login/page.tsx`
  - `/apps/web/src/store/authStore.ts`
  - `/apps/web/src/lib/api/authApi.ts`
  - `/apps/api/src/controllers/authController.ts`
  - `/apps/api/src/services/deviceSessionService.ts`
- **აღწერა**:
  "დამახსოვრება" checkbox არსებობს UI-ში, მაგრამ არ აქვს ფუნქციონალი. უნდა:
  1. Email-ის შენახვა localStorage-ში
  2. სესიის გახანგრძლივება (30 დღე → 90 დღე)
  3. ავტომატური form fill login გვერდზე
- **გადაწყვეტა**:
  ```typescript
  // Login page
  if (rememberMe) {
    localStorage.setItem('rememberedEmail', email);
    // Backend-ზე გაგზავნა rememberMe flag-ის
  }

  // Backend - გახანგრძლივებული სესია
  const expiresAt = rememberMe
    ? addDays(new Date(), 90)  // 90 დღე
    : addDays(new Date(), 30); // 30 დღე
  ```
- **ტესტირება**:
  - ჩართე "დამახსოვრება" და შედი
  - დახურე ბრაუზერი და გახსენი - email უნდა იყოს შევსებული
  - შეამოწმე სესია 30 დღის შემდეგ ჯერ კიდევ ვალიდურია

---

#### **T1.3**: მობილურზე ვიდეო Fullscreen გაფართოება
- [x] **Status**: DONE ✅
- **Complexity**: Medium
- **ფაილები**:
  - `/apps/web/src/components/student/learning/VideoPlayer.tsx`
- **აღწერა**:
  მობილურზე ვიდეო არ ივსებს მთელ ეკრანს. უნდა:
  1. მობილურზე ავტომატური fullscreen ვიდეოს დაწყებისას
  2. Portrait რეჟიმში სრული სიგანე
  3. Landscape რეჟიმში native fullscreen
- **გადაწყვეტა**:
  ```typescript
  // VideoPlayer.tsx
  useEffect(() => {
    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
    if (isMobile && videoRef.current) {
      // iOS Safari-სთვის
      videoRef.current.webkitEnterFullscreen?.();
      // სტანდარტული API
      videoRef.current.requestFullscreen?.();
    }
  }, [isPlaying]);

  // CSS დამატება
  <video
    className="w-full h-auto object-contain"
    style={{ maxHeight: '100vh' }}
    playsInline
    webkit-playsinline="true"
  />
  ```
- **ტესტირება**:
  - iPhone Safari-ზე ვიდეოს გაშვება
  - Android Chrome-ზე ვიდეოს გაშვება
  - შეამოწმე ორივე ორიენტაცია

---

#### **T1.4**: ვიდეოებს შორის Swipe ნავიგაცია
- [x] **Status**: DONE ✅
- **Complexity**: High
- **ფაილები**:
  - `/apps/web/src/components/student/learning/VideoPlayer.tsx`
  - `/apps/web/src/components/student/learning/ChapterView.tsx`
- **აღწერა**:
  მობილურზე მარცხნივ/მარჯვნივ swipe ჟესტით გადასვლა წინა/მომდევნო თავზე.
- **გადაწყვეტა**:
  ```typescript
  // SwipeHandler hook
  const useSwipeNavigation = (onSwipeLeft: () => void, onSwipeRight: () => void) => {
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);
    const minSwipeDistance = 50;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX.current = e.changedTouches[0].clientX;
      const distance = touchStartX.current - touchEndX.current;

      if (Math.abs(distance) > minSwipeDistance) {
        if (distance > 0) {
          onSwipeLeft(); // შემდეგი თავი
        } else {
          onSwipeRight(); // წინა თავი
        }
      }
    };

    return { handleTouchStart, handleTouchEnd };
  };
  ```
- **ტესტირება**:
  - მობილურზე მარჯვნივ swipe - წინა თავზე გადასვლა
  - მობილურზე მარცხნივ swipe - შემდეგ თავზე გადასვლა
  - შეამოწმე რომ swipe არ ეწინააღმდეგება scroll-ს

---

## ფაზა 2: საშუალო პრიორიტეტის პრობლემები

#### **T2.1**: Double-tap გადახვევა (10 წამი)
- [x] **Status**: DONE ✅
- **Complexity**: Medium
- **Dependencies**: T1.3
- **ფაილები**:
  - `/apps/web/src/components/student/learning/VideoPlayer.tsx`
- **აღწერა**:
  YouTube-ის მსგავსად double-tap ჟესტით 10 წამით წინ/უკან გადახვევა.
- **გადაწყვეტა**:
  ```typescript
  const useDoubleTap = (callback: (side: 'left' | 'right') => void) => {
    const lastTap = useRef(0);
    const DOUBLE_TAP_DELAY = 300; // ms

    const handleTap = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTap.current < DOUBLE_TAP_DELAY) {
        const screenWidth = window.innerWidth;
        const tapX = e.changedTouches[0].clientX;
        callback(tapX < screenWidth / 2 ? 'left' : 'right');
      }
      lastTap.current = now;
    };

    return handleTap;
  };

  // გამოყენება
  const handleDoubleTap = useDoubleTap((side) => {
    if (side === 'left') {
      videoRef.current.currentTime -= 10;
    } else {
      videoRef.current.currentTime += 10;
    }
  });
  ```
- **ტესტირება**:
  - ეკრანის მარცხენა მხარეზე double-tap → 10 წამი უკან
  - ეკრანის მარჯვენა მხარეზე double-tap → 10 წამი წინ
  - ვიზუალური feedback (±10 ანიმაცია)

---

#### **T2.2**: კლავიატურით გადახვევა Desktop-ზე
- [x] **Status**: DONE ✅
- **Complexity**: Low
- **ფაილები**:
  - `/apps/web/src/components/student/learning/VideoPlayer.tsx`
- **აღწერა**:
  კლავიატურის ისრებით გადახვევა უკვე იმპლემენტირებულია (← 10 წამი უკან, → 10 წამი წინ), მაგრამ უნდა შევამოწმოთ მუშაობს თუ არა სწორად.
- **გადაწყვეტა**:
  ```typescript
  // უკვე არსებობს VideoPlayer.tsx-ში
  case 'ArrowLeft':
    videoRef.current.currentTime -= 10;
    break;
  case 'ArrowRight':
    // უნდა შემოწმდეს skip-ahead ლიმიტი
    if (canSkipAhead) {
      videoRef.current.currentTime += 10;
    }
    break;
  ```
- **ტესტირება**:
  - ← ისარი → 10 წამი უკან
  - → ისარი → 10 წამი წინ
  - Focus უნდა იყოს video player-ზე

---

#### **T2.3**: კურსის შეფასება გამოცდამდე
- [x] **Status**: DONE ✅
- **Complexity**: High
- **ფაილები**:
  - `/apps/web/src/components/student/learning/ChapterView.tsx`
  - `/apps/web/src/components/student/reviews/ReviewForm.tsx`
  - `/apps/api/src/controllers/studentController.ts`
  - `/apps/api/src/routes/student.routes.ts`
  - `/apps/api/src/services/review.service.ts`
- **აღწერა**:
  ბოლო თავის დასრულების შემდეგ, გამოცდის დაწყებამდე მომხმარებელს უნდა მოეთხოვოს კურსის შეფასება.
- **გადაწყვეტა**:
  1. შევამოწმოთ ბოლო თავი დასრულებულია თუ არა
  2. შევამოწმოთ არსებობს თუ არა review
  3. თუ არა - ვაჩვენოთ ReviewForm modal
  4. Review-ს შემდეგ გავხსნათ გამოცდა

  ```typescript
  // ChapterView.tsx - ბოლო თავის ლოგიკა
  const handleCompleteChapter = async () => {
    if (isLastChapter && !hasReview) {
      setShowReviewModal(true);
      return; // არ გავაგრძელოთ გამოცდაზე
    }
    // გამოცდაზე გადასვლა
    navigateToExam();
  };

  // Modal component
  <ReviewRequiredModal
    isOpen={showReviewModal}
    onSubmit={handleReviewSubmit}
    onClose={() => {}} // არ დაიხურება review-ს გარეშე
  />
  ```
- **ტესტირება**:
  - გაიარე ყველა თავი
  - ბოლო თავზე შეამოწმე modal გამოჩნდება თუ არა
  - review-ს შემდეგ გამოცდა ხელმისაწვდომი უნდა გახდეს

---

#### **T2.4**: სერტიფიკატის PDF მობილურზე კითხვადობა
- [x] **Status**: DONE ✅
- **Complexity**: Medium
- **ფაილები**:
  - `/apps/api/src/services/certificatePdfService.ts`
  - `/apps/web/src/components/certificate/CertificateDisplay.tsx`
- **აღწერა**:
  სერტიფიკატის PDF მობილურზე პატარა ტექსტით არის. უნდა გავაკეთოთ responsive PDF ან HTML preview.
- **გადაწყვეტა**:
  1. PDF-ის ზომების გადახედვა (A4 → შეიძლება უფრო დიდი ფონტები)
  2. მობილურზე HTML preview-ს გაუმჯობესება
  3. Email-ში PDF attachment-ის გაგზავნა

  ```typescript
  // certificatePdfService.ts
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margins: { top: 30, bottom: 30, left: 40, right: 40 }
  });

  // ფონტის ზომების გაზრდა
  doc.fontSize(32).text(studentName); // 24 → 32
  doc.fontSize(28).text(courseName);  // 20 → 28
  ```
- **ტესტირება**:
  - შექმენი სერტიფიკატი
  - გახსენი PDF მობილურზე
  - ტექსტი კითხვადი უნდა იყოს zoom-ის გარეშე

---

## ფაზა 3: ადმინისტრაციული ფუნქციონალი

#### **T3.1**: ადმინიდან კურსის მანუალური გააქტიურება (Backend)
- [x] **Status**: DONE ✅
- **Complexity**: High
- **ფაილები**:
  - `/apps/api/src/controllers/adminStudents.controller.ts`
  - `/apps/api/src/routes/adminStudents.routes.ts`
  - `/apps/api/src/services/purchaseService.ts` (ახალი მეთოდი)
  - `/packages/database/prisma/schema.prisma`
- **აღწერა**:
  ადმინმა შეძლოს სტუდენტისთვის კურსის გააქტიურება გადახდის გარეშე (manual grant).
- **გადაწყვეტა**:
  ```typescript
  // adminStudents.controller.ts
  export const grantCourseAccess = async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const { courseId, versionId, note } = req.body;
    const adminId = req.user.id;

    // 1. შევქმნათ Purchase record (ADMIN_GRANT ტიპით)
    const purchase = await prisma.purchase.create({
      data: {
        userId: studentId,
        courseVersionId: versionId,
        status: 'COMPLETED',
        paymentMethod: 'ADMIN_GRANT',
        amount: 0,
        grantedByAdminId: adminId,
        grantNote: note
      }
    });

    // 2. შევქმნათ UserVersionAccess
    await prisma.userVersionAccess.create({
      data: {
        userId: studentId,
        courseVersionId: versionId,
        purchaseId: purchase.id
      }
    });

    // 3. Email notification სტუდენტზე
    await emailService.sendCourseGrantedEmail(studentId, courseId);

    // 4. Activity log
    await logAdminActivity(adminId, 'COURSE_GRANTED', {
      studentId, courseId, versionId
    });

    res.json({ success: true, purchase });
  };
  ```
- **DB Migration**:
  ```prisma
  model Purchase {
    // არსებული ველები...
    paymentMethod  String   // BOG, ADMIN_GRANT
    grantedByAdminId String?
    grantNote      String?
    grantedByAdmin User?    @relation("AdminGrants")
  }
  ```
- **ტესტირება**:
  - ადმინი → სტუდენტის გვერდი → გააქტიურება
  - სტუდენტი მიიღებს email
  - სტუდენტს გაუჩნდება კურსზე წვდომა

---

#### **T3.2**: ადმინიდან კურსის გააქტიურება (Frontend)
- [x] **Status**: DONE ✅
- **Complexity**: Medium
- **Dependencies**: T3.1
- **ფაილები**:
  - `/apps/web/src/app/(admin)/admin/students/[id]/page.tsx`
  - `/apps/web/src/components/admin/students/GrantCourseModal.tsx` (ახალი)
  - `/apps/web/src/lib/api/adminApi.ts`
- **აღწერა**:
  სტუდენტის detail გვერდზე ღილაკი "კურსის გააქტიურება" და modal.
- **გადაწყვეტა**:
  ```tsx
  // StudentDetailPage.tsx
  <Button onClick={() => setShowGrantModal(true)}>
    კურსის გააქტიურება
  </Button>

  // GrantCourseModal.tsx
  <Modal>
    <CourseSelector value={selectedCourse} onChange={setSelectedCourse} />
    <VersionSelector courseId={selectedCourse} value={selectedVersion} />
    <Textarea placeholder="შენიშვნა (სურვილისამებრ)" />
    <Button onClick={handleGrant}>გააქტიურება</Button>
  </Modal>
  ```
- **ტესტირება**:
  - ადმინ პანელი → სტუდენტები → სტუდენტის არჩევა
  - "კურსის გააქტიურება" ღილაკზე დაჭერა
  - კურსის და ვერსიის არჩევა
  - დადასტურება

---

#### **T3.3**: Email ნოტიფიკაცია კურსის გააქტიურებაზე
- [x] **Status**: DONE ✅
- **Complexity**: Low
- **Dependencies**: T3.1
- **ფაილები**:
  - `/apps/api/src/services/emailService.ts`
  - `/apps/api/src/templates/course-granted.tsx` (ახალი template)
- **აღწერა**:
  სტუდენტს მიუვა email კურსის გააქტიურების შესახებ.
- **გადაწყვეტა**:
  ```typescript
  // emailService.ts
  export const sendCourseGrantedEmail = async (userId: string, courseId: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const course = await prisma.course.findUnique({ where: { id: courseId } });

    await resend.emails.send({
      from: 'noreply@kursebi.ge',
      to: user.email,
      subject: `კურსი "${course.title}" გააქტიურდა!`,
      react: CourseGrantedEmail({ userName: user.name, courseName: course.title })
    });
  };
  ```
- **ტესტირება**:
  - გააქტიურე კურსი ადმინიდან
  - შეამოწმე სტუდენტის email
  - Email-ში უნდა იყოს კურსის სახელი და ლინკი

---

## ფაზა 4: ტესტირება და დეპლოი

#### **T4.1**: ინტეგრაციული ტესტირება
- [x] **Status**: DONE ✅
- **Complexity**: Medium
- **Dependencies**: T3.1, T3.2, T3.3
- **აღწერა**:
  ყველა ცვლილების end-to-end ტესტირება.
- **ტესტ-სცენარები**:
  1. Email წერტილებით რეგისტრაცია და ლოგინი
  2. "დამახსოვრება" ფუნქცია desktop/mobile
  3. ვიდეო swipe ნავიგაცია iOS/Android
  4. Double-tap გადახვევა
  5. Fullscreen ვიდეო მობილურზე
  6. კურსის შეფასება → გამოცდა flow
  7. სერტიფიკატი PDF მობილურზე
  8. ადმინი → კურსის გააქტიურება → email

---

#### **T4.2**: მობილური ტესტირება
- [ ] **Status**: IN_PROGRESS 🔄
- **Complexity**: Medium
- **Dependencies**: T4.1
- **აღწერა**:
  სპეციფიკური მობილური device-ებზე ტესტირება.
- **Device-ები**:
  - iPhone 13/14/15 (Safari)
  - iPhone SE (პატარა ეკრანი)
  - Samsung Galaxy S21/S22 (Chrome)
  - iPad (Safari)
  - Android Tablet

---

#### **T4.3**: Production Deploy
- [ ] **Status**: TODO
- **Complexity**: Low
- **Dependencies**: T4.1, T4.2
- **აღწერა**:
  ცვლილებების production-ზე deploy.
- **ნაბიჯები**:
  1. Database migration (paymentMethod, grantedByAdminId)
  2. Backend deploy
  3. Frontend deploy
  4. Smoke testing production-ზე

---

## ტექნიკური დეტალები

### ფაილების სია (ცვლილებები)

| ფაილი | ცვლილების ტიპი | ფაზა |
|-------|---------------|------|
| `/apps/api/src/middleware/validation.ts` | შესწორება | 1 |
| `/apps/web/src/app/(public)/auth/login/page.tsx` | შესწორება | 1 |
| `/apps/web/src/store/authStore.ts` | შესწორება | 1 |
| `/apps/api/src/controllers/authController.ts` | შესწორება | 1 |
| `/apps/api/src/services/deviceSessionService.ts` | შესწორება | 1 |
| `/apps/web/src/components/student/learning/VideoPlayer.tsx` | შესწორება | 1, 2 |
| `/apps/web/src/components/student/learning/ChapterView.tsx` | შესწორება | 1, 2 |
| `/apps/api/src/controllers/adminStudents.controller.ts` | შესწორება | 3 |
| `/apps/api/src/routes/adminStudents.routes.ts` | შესწორება | 3 |
| `/apps/web/src/components/admin/students/GrantCourseModal.tsx` | ახალი | 3 |
| `/apps/api/src/services/emailService.ts` | შესწორება | 3 |
| `/apps/api/src/services/certificatePdfService.ts` | შესწორება | 2 |
| `/packages/database/prisma/schema.prisma` | შესწორება | 3 |

### Database Migration

```sql
-- Migration: add_admin_grant_fields
ALTER TABLE "Purchase" ADD COLUMN "paymentMethod" VARCHAR(50) DEFAULT 'BOG';
ALTER TABLE "Purchase" ADD COLUMN "grantedByAdminId" UUID REFERENCES "User"(id);
ALTER TABLE "Purchase" ADD COLUMN "grantNote" TEXT;

-- Update existing records
UPDATE "Purchase" SET "paymentMethod" = 'BOG' WHERE "paymentMethod" IS NULL;
```

---

## პროგრესის ტრეკინგი

| ფაზა | თასქები | დასრულებული | პროცენტი |
|------|---------|-------------|----------|
| ფაზა 1 | 4 | 4 | 100% | ✅
| ფაზა 2 | 4 | 4 | 100% | ✅
| ფაზა 3 | 3 | 3 | 100% | ✅
| ფაზა 4 | 3 | 1 | 33% | 🔄
| **სულ** | **14** | **12** | **86%** |

---

## შემდეგი ნაბიჯები

1. გადახედეთ გეგმას და შეცვალეთ საჭიროების შემთხვევაში
2. დაიწყეთ ფაზა 1-ით (კრიტიკული პრობლემები)
3. თითოეული თასქის დასრულების შემდეგ განაახლეთ სტატუსი

---

*შექმნილია: 2026-02-06*
*ბოლო განახლება: 2026-02-25*
*მიმდინარე ამოცანა: T4.2 (IN_PROGRESS)*
*Plugin Version: 1.1.1*

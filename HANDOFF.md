# Learnora — Handoff

## Stack & Conventions
React 18 + TypeScript + Vite · Tailwind CSS v4 (`@theme {}` in `src/index.css`) · react-router-dom v7
`useNav()` adapter · `DashboardLayout` (desktop) · `MobileLayout` (parent/student mobile)
Brand: primary `#4b75ff` / deep `#005cf7` / sidebar `#0d2060` — DO NOT change sidebar color

---

## Backend — Supabase

**Project URL:** `https://njriewvlsufzvxgfpzkg.supabase.co`
**Client:** `src/lib/supabase.ts`
**Auth helpers:** `src/lib/auth.ts` — `signIn()`, `signOut()`, `getProfile()`, `generateSchoolCode()`
**Schema:** `supabase/schema.sql` — already deployed to Supabase ✅
**Env vars (`.env`, gitignored):** `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
**Vercel env vars:** also set in Vercel dashboard ✅

### Auth Status
- `LoginPage.tsx` — wired to `supabase.auth.signInWithPassword()`, reads `profiles.role`, routes to correct dashboard ✅
- `SchoolSignUpPage.tsx` — creates auth user → inserts `schools` row → updates `profiles` with `school_id + role=admin` ✅
- `src/contexts/AuthContext.tsx` — `AuthProvider` wraps the whole app, `useAuth()` available everywhere ✅
- `profileToSidebarUser()` helper converts profile → `{ name, role, initials }` for DashboardLayout ✅
- Email confirmation: **disabled in Supabase** (for testing) — re-enable before production
- Super admin creation: manual — create user in Supabase Auth dashboard, then run SQL:
  ```sql
  UPDATE public.profiles SET role = 'super_admin', school_id = NULL, full_name = 'Name Here'
  WHERE email = 'superadmin@email.com';
  ```

### Database
35+ tables, all with `school_id` multi-tenancy + RLS policies. Key tables:
`schools` · `profiles` · `classes` · `subjects` · `terms` · `class_enrollments` · `teacher_assignments`
`courses` · `modules` · `lessons` · `assignments` · `assignment_submissions` · `grades`
`attendance_records` · `live_sessions` · `messages` · `invoices` · `payments` · `notifications` · `announcements`
`timetable_entries` · `quiz_questions` · `quiz_attempts` · `badge_claims` · `school_settings`

**Pending SQL (run in Supabase SQL Editor before testing payments):**
```sql
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paystack_reference TEXT;
CREATE INDEX IF NOT EXISTS idx_invoices_paystack_ref ON invoices(paystack_reference);
```

---

## Completed Options

### Option C — New Screens ✅ (commit: Option C complete)
- `StudentTimetablePage` `/student-timetable` — weekly grid (day-picker mobile, table desktop)
- `BulkStudentImportPage` `/admin/bulk-import` — CSV drag-drop → batch insert profiles + class_enrollments
- `QuizBuilderPage` `/quiz-builder` — wired to `quiz_questions` table
- `QuizPage` `/m/quiz` — loads `quiz_questions`, saves `quiz_attempts`, navigates to quiz-result
- `QuizResultPage` `/m/quiz-result` — reads `learnora_quiz_result` from sessionStorage

### Option D — Mobile App ✅ (commit: Capacitor setup)
- Capacitor installed, `appId: com.learnora.app`, `androidScheme: https`
- `vite.config.ts`: `base: './'`
- `android/` + `ios/` native project scaffolds committed
- To build: `npm run build && npx cap sync && npx cap open android`

### Option B — Production Hardening ✅ (latest commit: 002dc6d)
- `logSupabaseError` wired into 14 pages (all critical write paths)
- localStorage → sessionStorage for 37 ephemeral nav keys
- Real Service Worker (`public/sw.js`): cache-first for assets, network-first for HTML; shell fallback offline
- `OfflineSyncPage` — real `navigator.onLine`, real Cache API list + clear
- Admin tables responsive fixes
- RLS audit: `platform_broadcasts` fixed (0 policies → 2 policies)
- Paystack webhook Edge Function: `supabase/functions/paystack-webhook/index.ts`
  - Verifies HMAC-SHA512 signature from `PAYSTACK_SECRET_KEY` env var
  - On `charge.success`: finds invoice by `paystack_reference`, updates `paid_amount + status`
- `PaymentReviewPage.tsx`: loads real Paystack public key from `school_settings`, opens inline popup

**Remaining deployment steps for Paystack (not code):**
1. Run the SQL above (adds `paystack_reference` column)
2. `npx supabase functions deploy paystack-webhook`
3. `npx supabase secrets set PAYSTACK_SECRET_KEY=sk_live_xxxxx`
4. Register webhook in Paystack dashboard → `https://njriewvlsufzvxgfpzkg.supabase.co/functions/v1/paystack-webhook`
5. Re-enable email confirmation in Supabase Auth dashboard (Authentication → Settings)

---

## What's Built (All Screens)

### Super Admin
SuperAdminDashboardPage, SchoolsListPage, SchoolDetailPage (6 tabs), PlansAndPricingPage,
PlatformBillingPage, PlatformAnalyticsPage, BroadcastPage, SupportTicketsPage,
PlatformSettingsPage, FeatureFlagsPage, EmailTemplatesPage, AuditLogsPage, OnboardSchoolPage,
SuperAdminNotificationsPage

### Admin
AdminDashboardPage, AdminResultsPage, AdminFeeSetupPage, FeeCollectionPage,
AdminAttendancePage, AdminAnnouncementsPage, AdminSupportPage, RolesPermissionsPage,
AuditLogsPage, TimetableManagementPage, SchoolAnalyticsPage, SubscriptionBillingPage,
**BulkStudentImportPage** (new), UserManagementPage, InviteUsersPage, ClassesManagementPage

### Teacher
TeacherDashboardPage, GradeBookPage, AttendanceManagementPage, TeacherAnnouncementsPage,
AnalysisPage, MyClassesPage, StudentsManagementPage, TeacherAssignmentsPage,
AssignmentBuilderPage, SubmissionsInboxPage, GradingScreenPage, MyCoursesPage,
full live classes suite, TeacherMessagesPage, **QuizBuilderPage** (new)

### Student (Desktop)
OverviewDashboardPage, MyCoursesPage, CourseDetailsPage, AssignmentsPage,
AssignmentDetailsPage, NotificationsPage, GlobalSearchPage

### Student (Mobile)
MobileHomePage, MobileLearnPage, MobileAssignmentsPage, MobilePerformancePage,
MobileStudentSettingsPage (logout wired), MobileStudentMessagesPage,
**QuizPage** (new), **QuizResultPage** (new), **StudentTimetablePage** (new)

### Parent
ParentHomePage, SchoolFeesPage, ParentProgressPage, PaymentReviewPage (real Paystack),
PaymentSuccessPage, ChildTimetablePage, ParentMessageTeacherPage, ReportCardsPage

### Shared / System
EmptyStatePage (9 states via `?type=`), OfflineSyncPage (real SW + Cache API),
WhiteboardPage, TwoFASetupPage (real Supabase TOTP MFA), BadgesRewardsPage,
AchievementsPage, ConnectedDevicesPage, PrivacySettingsPage, LinkedAccountsPage,
StorageManagementPage, SharedFilesPage, SubjectPerformancePage, DeadlinesViewPage,
CourseResourcesPage, CourseSettingsPage, PlagiarismCheckPage, AttendanceHistoryPage,
ParticipantsPanelPage, ScreenSharePage, AddEventPage

---

## Error Handling Infrastructure
- `src/components/shared/ErrorBoundary.tsx` — wraps full app in `main.tsx`
- `src/lib/supabaseError.ts` — `logSupabaseError(context, error)` + `logAuthError(context, error)`
- Wired into: 14 pages covering all critical write paths

---

## Pending Roadmap

### Option A — Third-party services (blocked on external accounts)
- [ ] Video calls / Live Classroom real WebRTC — Daily.co, Jitsi, or Twilio
- [ ] Real screen share — same video provider
- [ ] SMS 2FA — Twilio / Africa's Talking
- [ ] Push notifications — Firebase FCM
- [ ] AI essay auto-feedback — OpenAI API
- [ ] ConnectedDevicesPage — real session list (Supabase Admin API, server-side only)

---

## SQL — Option C tables (run before testing timetable + quiz)

```sql
-- Timetable entries
CREATE TABLE IF NOT EXISTS public.timetable_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES profiles(id),
  day TEXT NOT NULL,
  period INT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT,
  UNIQUE(class_id, day, period)
);
ALTER TABLE timetable_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "school_members_read_tt" ON timetable_entries
  FOR SELECT USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "admin_teacher_write_tt" ON timetable_entries
  FOR ALL USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid() AND role IN ('admin','teacher','super_admin')))
  WITH CHECK (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid() AND role IN ('admin','teacher','super_admin')));

-- Quiz questions
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  type TEXT DEFAULT 'mcq' CHECK (type IN ('mcq','truefalse','short')),
  options JSONB,
  explanation TEXT,
  points INT DEFAULT 1,
  order_index INT DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "school_read_qq" ON quiz_questions
  FOR SELECT USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "teacher_write_qq" ON quiz_questions
  FOR ALL USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid() AND role IN ('teacher','admin','super_admin')))
  WITH CHECK (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid() AND role IN ('teacher','admin','super_admin')));

-- Quiz attempts
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  answers JSONB,
  score INT,
  max_score INT,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, lesson_id)
);
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_quiz_attempts" ON quiz_attempts
  FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "teacher_read_qa" ON quiz_attempts
  FOR SELECT USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid() AND role IN ('teacher','admin')));

-- Badge claims
CREATE TABLE IF NOT EXISTS public.badge_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  reward_id TEXT NOT NULL,
  claimed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, reward_id)
);
ALTER TABLE badge_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_claims" ON badge_claims
  USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
```

---

## System Map
`SYSTEM_MAP.md` — complete per-role screen tree with data sources (real/scaffold/mock) and nav flows.

---

## Git / Deploy
- Repo: `github.com/fiyeduala/learnora`
- Deploy: Vercel auto-deploys on push to `main`
- Latest batch commits: `002dc6d`→`5632e51` (Batches 2–4) + fix `DashboardLayout` AI target

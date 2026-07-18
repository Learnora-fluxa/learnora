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

### Daily.co Live Video ✅ DONE (2026-07-10)
- `@daily-co/daily-react` installed
- **Edge Function** `supabase/functions/daily-token/index.ts` — `create` (teacher) + `join` (enrolled student); enforces access server-side; stores room on `live_sessions`; mints short-lived tokens; `DAILY_API_KEY` secret never reaches frontend
- **ScheduleLiveClassPage** — full rewrite: loads real classes/subjects from `teacher_assignments`; INSERTs to `live_sessions`
- **TeacherLiveClassesPage** — "Start" / "Enter Class" calls Edge Function, stores token + room URL in sessionStorage, navigates to lobby
- **PreClassLobbyPage** — real camera/mic preview via `getUserMedia()`; mic/cam toggles; "Start/Join" navigates to classroom with device prefs in sessionStorage
- **LiveClassRoomPage** — full rewrite: `DailyProvider` + `DailyAudio` + `DailyVideo`; real participant grid (dynamic columns 1→2→3); mic/cam toggle via `daily.setLocalAudio/Video()`; screen share via `useScreenShare()`; real-time chat via `useAppMessage` / `useSendAppMessage`; participants panel via `useParticipantIds()` + `useVideoTrack/useAudioTrack`; leave updates session `status='ended'` (teacher only); fullscreen button
- **LiveClassesOverviewPage** — student "Join Now" calls Edge Function `join`, same sessionStorage flow
- **Whiteboard** — stays scaffold (needs separate real-time layer e.g. Liveblocks)
- **SQL:** `ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS daily_room_name TEXT;` ✅ Confirmed run
- **Edge Function:** `npx supabase functions deploy daily-token` ✅ Deployed to project `njriewvlsufzvxgfpzkg`

### Cross-role messaging unified ✅ DONE (2026-07-18)
- **Root bug fixed**: parent-created conversations (dm: name convention) never inserted `conversation_members` rows, so teacher/student lists (membership-driven) never showed them → parents' messages were invisible to teachers
- **`src/lib/messaging.ts`**: `getOrCreateDirectConversation()` — canonical `dm:<uuidA>:<uuidB>` name + upserts BOTH member rows (self-heals old parent conversations on open); role-based contact loaders (student/teacher/admin/super-admin)
- **NewMessageModal** shared component — searchable contact picker grouped by role
- **Student MessagesPage**: "+ New" → teachers of their classes + school admins
- **TeacherMessagesPage**: "+ New" → students of their classes, those students' parents, school admins
- **ParentMessageTeacherPage** ("Message the School"): now uses the shared helper (member rows created) + school admins added to contact list
- **StaffMessagesPage** (new, serves 2 routes): `/admin-messages` (admin → teachers/parents/students + super admins) and `/super-messages` (super admin → every school's admin; conversations live under the target school's school_id). Realtime, unread counts, optimistic send
- Nav: "Messages" added to adminNav + superAdminNav; TopBar messages icon now works for admin + super admin
- **SQL required**: `profiles_read_super_admins` policy (admins can't see super_admin profiles otherwise — school_id NULL fails school-iso RLS). See chat 2026-07-18

### Class recording + tldraw whiteboard ✅ DONE (2026-07-17)
- **Recording (free-plan, teacher-side)**: `src/lib/useClassRecorder.ts` — Record button in live class top bar (teacher only): getDisplayMedia (share this tab + tab audio) mixed with teacher mic via AudioContext → MediaRecorder (webm, 1 Mbps) → upload to private `class-recordings` Storage bucket → insert `session_recordings` row (recording_url = storage path). Recording stops automatically if teacher stops sharing. **Bucket + policies SQL must be run** (see chat 2026-07-17)
- **ClassRecordingsPage** — full rewrite: real `session_recordings` query with live_sessions/classes/subjects/teacher joins; teachers see own sessions, students see enrolled classes; play via 1-hour signed URL in an in-page video modal
- **Whiteboard (tldraw + Supabase Realtime)**: `src/components/whiteboard/LiveWhiteboard.tsx` — tldraw store synced over Realtime broadcast channel `whiteboard:{sessionId}`; late joiners request state, peers reply with snapshot; no server/table needed; lazy-loaded (own chunk). Wired into LiveClassRoomPage "Board" mode + standalone `/whiteboard` (shares class board when opened from a session, else personal board)
- `npm install tldraw` added to package.json

### CBT exams + auto-attendance + promotion + raise-hand ✅ DONE (2026-07-17)
- **CBT exam mode** (separate from assignments; lesson optional):
  - `CBTExamManagerPage` `/cbt-exams` (teacher, in teacherNav): create exam (class, subject, optional lesson, duration, randomize, instructions), inline question editor (MCQ/true-false/short — same `{opts, answer}` format as quiz_questions), publish/close/reopen/delete, inline results table with %
  - `CBTExamTakePage` `/cbt-exam` (student): intro screen → countdown timer → one-question-at-a-time with navigator dots → submit; auto-submits at 0:00; timer survives refresh (recomputed from `started_at` in DB); deterministic per-student shuffle when randomize is on; short answers matched case-insensitively; one attempt per student
  - Student entry: ExamSchedulePage now shows a "CBT Exams" section (published exams for enrolled classes, Start button or score if taken)
  - Tables: `cbt_exams`, `cbt_attempts` + `quiz_questions.exam_id` column — **SQL below must be run**
- **Auto-attendance**: student joining a Daily live class auto-inserts `attendance_records` (status=present, source='live_auto') for today; InClassAttendancePage now loads today's existing records (auto-marks shown with a note), teacher clicks override → saved as source='manual'; unmarked students default to absent
- **Student promotion**: `PromoteStudentsModal` shared component — teacher (StudentsManagementPage checkboxes + Promote button) and admin (AdminClassDetailsPage same) select students → target class → old enrollments replaced
- **Raise-hand**: broadcast via Daily app-message; amber ring + ✋ badge on tiles, ✋ in participants panel, raised-count chip in room top bar
- **sessionStorage fix**: `learnora_session_class_id` (new key) carries class UUID; `learnora_session_class` now always the display name (students used to see a UUID in the lobby)

### RBAC leak sweep + Live Classes hardening ✅ DONE (2026-07-16)
- **TopBar** rewritten role-aware (was matching display-label strings): bell/messages/calendar/settings now map per actual `profile.role`; icons hidden for roles with no destination; "Log out" in avatar dropdown now actually calls `signOut()` (was navigating to /logout leaving the session alive)
- **DashboardLayout AI button**: only rendered for student (→ ai-tutor) and teacher (→ ai-assistant); hidden for admin/parent/super_admin (they were being bounced by RoleRoute — the "AI page problem")
- **/notifications** moved to `['student','teacher','admin']` group (page already picks role nav internally)
- **CourseDetailsPage / CourseResourcesPage / SharedFilesPage / GlobalSearchPage / NotificationDetailsPage**: now pass role-appropriate nav (teachers/admins were seeing the student sidebar)
- **Live classes fixes**:
  - `functionErrorMessage()` in `supabaseError.ts` — extracts the real error body from failed `functions.invoke()` (was swallowed; users only saw generic messages)
  - `LiveClassRoomPage`: `Daily.getCallInstance() ?? createCallObject()` (fixes "Duplicate DailyIframe instances" crash on StrictMode remount / quick re-entry); join `.catch()` + `error` event listener → visible error overlay with Back button (was spinning forever)
  - "Session not found" fallback back-button now role-aware
- Verified backend: `daily-token` deployed ✅, `DAILY_API_KEY` secret set ✅, `daily_room_name` column exists ✅

### Role-Based Access Control ✅ DONE (2026-07-11)
- **`RoleRoute`** component in `App.tsx` — accepts `roles: string[]`; wrong-role users redirected to their own dashboard (not to `/login`)
- **`getDashboardPath(role)`** helper in `App.tsx` — single source of truth for post-login + wrong-role redirects
- **Route guard matrix:**
  - Student routes (25+): `['student']` only
  - Student + Teacher shared (course content, classroom): `['student', 'teacher']`
  - Teacher routes (25+): `['teacher']` only
  - Parent routes (18): `['parent']` only
  - Admin routes (20): `['admin']` only — `school-settings` and `integrations` added to this guard (were previously unguarded)
  - `/audit-logs`: `['admin', 'super_admin']` — was admin-only, super admin was getting kicked to login
  - Super Admin routes (13): `['super_admin']` only
  - Shared utilities (settings, 2fa-setup, offline-sync, etc.): all authenticated roles
- **Super Admin dashboard** (`SuperAdminDashboardPage`): replaced placeholder stats (MRR, Churn Rate) with real Total Schools + Total Teachers counts; added indigo "Platform Administration" banner to visually distinguish from school Admin dashboard

### Still pending (Option A)
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
`SYSTEM_MAP.md` — rebuilt 2026-06-24; per-role screen tree with accurate data-source status.
`WIRING_PLAN.md` — created 2026-06-23; Batches A–D approved but not yet implemented.

**Current counts (from SYSTEM_MAP):** ✅ 89 Live · ⚠️ 7 Mixed · 🔲 46 Scaffold/Blocked

### WIRING_PLAN — Batch A ✅ DONE (2026-06-24)
- **A1/A2** `AdminDashboardPage`: attendance rate (today's records) + outstanding fees (invoices delta) — live ✅
- **A3** `ReportBuilderPage`: full rewrite — real class picker, DB queries per metric (grades/attendance/fees/enrollment), CSV export — live ✅
- **A4** `LiveClassesOverviewPage`: real `live_sessions` query via student's enrolled class_ids — live ✅
- **A5** `AssignmentDetailsPage`: real Supabase Storage upload to `assignment-submissions/{school_id}/{assignment_id}/`, stores URL in `submission_url` — live ✅

### Also fixed in 2026-06-24 session
- `ClassDetailsPage`: full rewrite — real roster, grades, attendance, courses from DB ✅
- `ComposeAnnouncementPage`: real INSERT into `announcements`, real class picker from `teacher_assignments` ✅
- `SchoolDetailPage`: 5 modal occurrences of hardcoded `school.name` → `displayName` ✅

### WIRING_PLAN — Batch B ✅ DONE (2026-06-24)
- **BroadcastPage**: already read/wrote `platform_broadcasts`; upgraded to load real school counts per plan/status ✅
- **FeatureFlagsPage**: wired to `feature_flags` table — loads on mount, saves with upsert (needs SQL below) ✅
- **SupportTicketsPage**: wired to `support_tickets` table — loads tickets with school JOIN, inline status toggle (needs SQL below) ✅
- **PlatformBillingPage**: reads real school counts + student_count from `schools`; computes term revenue per plan rate ✅
- **PlatformSettingsPage**: wired to `platform_settings` key-value table — loads/saves all settings (needs SQL below) ✅

### WIRING_PLAN — Batch C ✅ DONE (2026-06-24)
- **StudentDetailViewPage**: reads `learnora_selected_student` from sessionStorage; loads real profile, grade_summaries by subject, attendance trend by month, recent submissions; auto-generates behavior flags from data; back nav → `class-details` ✅
- **DownloadsPage**: real `navigator.onLine` listener, real `navigator.storage.estimate()` for storage bar, real lessons from DB filtered to enrolled class IDs; play button sets `learnora_selected_lesson` before navigating ✅

### WIRING_PLAN — Batch D ✅ DONE (2026-06-24)
- **NotificationSettingsPage**: loads `profiles.notification_prefs` JSONB on mount; each toggle auto-saves immediately to DB with optimistic update + revert on error; "Saved" indicator after each change; email channel description uses real `profile.email`; 12 prefs total (8 notif types + 4 channels) ✅

### WIRING_PLAN — ALL BATCHES COMPLETE ✅
All originally planned wiring work is done. See "Still mock / needs attention" for remaining low-priority items.

### WIRING_PLAN — Batch E ✅ DONE (2026-06-24)
- **FinanceManagementPage**: stats from real `invoices` + `payments` tables (expected/collected/outstanding/overdue); class breakdown from fee_structures→classes join; invoices tab (outstanding, with student name); payments tab (real payments with online/manual detection); CSV export on both tabs ✅
- **SubscriptionBillingPage**: loads real `schools` row — plan, status, student_count; computes term cost from PLAN_RATES const; shows real plan label and per-student rate ✅
- **RolesPermissionsPage**: loads/saves to `localStorage` keyed by school_id (no DB table — permissions are RLS-enforced; this documents team intent); added info note explaining actual access is policy-controlled ✅

### WIRING_PLAN — Batch F ✅ DONE (2026-06-24)
- **TeacherLiveClassesPage**: queries `live_sessions` where `teacher_id = profile.id`; joins `classes` and `subjects`; splits into live/upcoming/ended; live banner shows when status='live'; "Upcoming Sessions (N)" / "Recordings (N)" counts are live; `formatScheduled` helper shows Today/Tomorrow/date labels ✅

### WIRING_PLAN — Batch G ✅ DONE (2026-06-24)
- **TeacherAnalyticsPage**: 3-phase load — teacher_assignments → enroll+att+assignments → grade_summaries+submissions+profiles; real class breakdown, subject averages, weekly submissions bar chart, top 5 students, pending grading count ✅
- **ClassPerformancePage**: real class/subject picker from teacher_assignments; data cached in refs, filtered client-side; per-student score (grade_summaries avg), attendance rate, auto-computed flag (Critical/At Risk/Declining/Good); score distribution histogram; "Profile" → sets `learnora_selected_student` + navigates to `student-detail` ✅
- **BehaviorAnalyticsPage**: computes at-risk students across all teacher's classes; classifies risk (high/medium/low) from attendance + avg grade thresholds; auto-generates flags from real data; submission rate from assignment_submissions; "Profile" → `learnora_selected_student` + `student-detail`; excludes fully healthy students from the list ✅

### WIRING_PLAN — Batch H ✅ DONE (2026-06-25)
- **ExaminationsPage**: real `assignments` query (teacher_id); joins classes+subjects; parallel sub-count (assignment_submissions) + enroll-count (class_enrollments); computed status (Upcoming/Active/Completed/Pending) + action button (Preview/Review/Grade); search filter; "New Assessment" → create-assessment ✅
- **QuestionBankPage**: real `quiz_questions` query (school_id); 4-level join for subject name (lessons→modules→courses→subjects); type filter (mcq/truefalse/short); Delete (live DB call + optimistic removal); Duplicate (INSERT copy + prepend to list); stats (count, unique subjects, total points); "Add Question" → quiz-builder ✅
- **CreateAssessmentPage**: fully controlled form state; loads real classes+subjects from teacher_assignments on mount; 3-step stepper with step validation; INSERT to assignments table on final submit (school_id, teacher_id, class_id, subject_id, title, instructions, due_date, max_score, is_published=true); saving state + error display; navigates to examinations on success ✅

### WIRING_PLAN — Batch I ✅ DONE (2026-06-25)
- **TeacherResourcesPage**: loads real `teacher_resources` where `teacher_id = profile.id` with class+subject joins; subject filter tabs from `teacher_assignments`; upload form with real class/subject selects; file types → Supabase Storage `teacher-resources` bucket upload then INSERT; link type → INSERT URL directly; status counts live; admin rejection note displayed; saving state + inline error; optimistic prepend on success ✅

### PlansAndPricingPage + EmailTemplatesPage ✅ DONE (2026-06-25)
**SQL to run (Supabase SQL Editor):**
- `platform_config` table — single row, `per_student_price INTEGER DEFAULT 850`, `updated_at`, `updated_by`; read by all authenticated users, write by super_admin only. Seed: `INSERT WHERE NOT EXISTS`.
- `email_templates` table — `key TEXT UNIQUE`, `name`, `category`, `subject`, `body`, `updated_at`, `updated_by`; super_admin only. Seeded with 6 default templates.

**PlansAndPricingPage** (full rewrite): loads `per_student_price` from `platform_config`; super admin can inline-edit and save; shows platform stats (schools, students, term revenue); calculator with presets; feature list ✅
**PlatformBillingPage** (updated): removed hardcoded `PLAN_RATES`; loads price from `platform_config` in parallel with schools query; all revenue calculations use DB price ✅
**SubscriptionBillingPage** (updated): removed hardcoded `PLAN_RATES`; loads price from `platform_config` in parallel with school query; term cost uses DB price ✅
**EmailTemplatesPage** (full rewrite): CRUD — loads from `email_templates` DB, edit+save (UPDATE), create new (INSERT via modal with auto-slug key), delete (with confirm); preview mode; all ops await + surface errors ✅

**Hardcoded rates replaced:**
- `PlatformBillingPage`: `PLAN_RATES = {starter:500, growth:800, enterprise:1200}` → `pricePerStudent` from DB
- `SubscriptionBillingPage`: `PLAN_RATES = {starter:500, growth:800, enterprise:1200, free:0}` → `pricePerStudent` from DB

**Where send flows could read templates (not changed — flagged only):**
- `InviteUsersPage.tsx`: uses `supabase.auth.admin.inviteUserByEmail()` — Supabase Auth sends its own email. To use `email_templates`, you'd call an Edge Function instead, passing `key = 'welcome_teacher'` or `'welcome_student'`.
- `ForgotPasswordPage.tsx`: calls `supabase.auth.resetPasswordForEmail()` — same: built-in Supabase email. To customise, override the template in Supabase Auth Dashboard > Email Templates, OR route via Edge Function that reads `key = 'password_reset'`.

### Still mock / needs attention
- All scaffold pages are now wired ✅ — 0 🔲 pages remaining
- Phase 6 AI pages intentionally deferred (12 pages)
- WhiteboardPage — scaffold; needs separate real-time layer (e.g. Liveblocks)
- `teacher-resources` Supabase Storage bucket required for TeacherResourcesPage file uploads

### Bank Details (fillable from UI)
- **Learnora bank account** (for school subscription offline payments) → Super Admin → Platform Settings → "Learnora Bank Account" section → writes to `platform_config`
- **School bank account** (for parent fee payments) → Admin → Fee Setup → Bank Account tab → writes to `school_settings` (`bank_account_name`, `bank_account_number` + legacy `account_name`, `account_number`)

---

## Git / Deploy
- Repo: `github.com/fiyeduala/learnora`
- Deploy: Vercel auto-deploys on push to `main`
- Latest commits: `002dc6d`→`5632e51` (Batches 2–4) · `1aabd4f` (SYSTEM_MAP + DashboardLayout AI fix) · SchoolDetailPage modal fix (uncommitted)

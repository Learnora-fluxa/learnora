# Learnora — System Map
_Updated 2026-07-10 — reflects all wiring through Daily.co + Post-MVP batch_
_Previous map: 2026-06-24 (pre-wiring baseline)_

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ Live | Real Supabase queries; data round-trips to DB |
| ⚠️ Mixed | Partially wired — some data real, some localStorage / by design |
| 🔲 Scaffold | No Supabase calls; renders mock/hardcoded/empty data |
| 🚫 Blocked | Intentionally deferred (AI Phase 6 / WebRTC / external API) |

---

## Progress Counts

| Role | ✅ Live | ⚠️ Mixed | 🔲 Scaffold | 🚫 Blocked | Total |
|------|---------|----------|------------|-----------|-------|
| Auth (shared) | 5 | 0 | 0 | 0 | 5 |
| Super Admin | 13 | 1 | 0 | 0 | 14 |
| Admin | 18 | 1 | 0 | 0 | 19 |
| Teacher | 29 | 0 | 0 | 0 | 29 |
| Student Desktop | 22 | 2 | 0 | 0 | 24 |
| Student Mobile | 10 | 0 | 0 | 0 | 10 |
| Parent | 14 | 1 | 0 | 0 | 15 |
| Shared / System | 9 | 1 | 0 | 16 | 26 |
| **Total** | **120** | **6** | **0** | **16** | **142** |

**All scaffold pages wired ✅** — no remaining 🔲 pages.

**Blocked (16):** 12 AI Phase 6 + 1 WebRTC (Whiteboard) + 3 external-API-dependent.

---

## What Changed (Batches A – I, Jun 2026)

| Batch | Pages wired | Net gain |
|-------|-------------|----------|
| A | AdminDashboardPage (stats), ReportBuilderPage, LiveClassesOverviewPage, AssignmentDetailsPage (file upload) | +4 ✅ |
| B | BroadcastPage, FeatureFlagsPage, SupportTicketsPage, PlatformBillingPage, PlatformSettingsPage | +5 ✅ |
| C | StudentDetailViewPage, DownloadsPage, ClassDetailsPage (teacher), ComposeAnnouncementPage | +4 ✅ |
| D | NotificationSettingsPage | +1 ✅ |
| E | FinanceManagementPage, SubscriptionBillingPage, RolesPermissionsPage (⚠️ localStorage) | +2 ✅, +1 ⚠️ |
| F | TeacherLiveClassesPage | +1 ✅ |
| G | TeacherAnalyticsPage, ClassPerformancePage, BehaviorAnalyticsPage | +3 ✅ |
| H | ExaminationsPage, QuestionBankPage, CreateAssessmentPage | +3 ✅ |
| I | TeacherResourcesPage | +1 ✅ |
| J | EmailTemplatesPage, PlansAndPricingPage | +2 ✅ |
| Daily.co | PreClassLobbyPage, LiveClassRoomPage, ScreenSharePage, ParticipantsPanelPage + Edge Function `daily-token` | +4 ✅ |
| Post-MVP | AdminSupportPage, AchievementsPage, PlatformSettingsPage (bank), AdminFeeSetupPage (bank) | +2 ✅ |
| **Total** | | **+32 ✅, +1 ⚠️** |

---

## 1. Auth (shared)

| Route | Component | Status | Tables |
|-------|-----------|--------|--------|
| `/login` | LoginPage | ✅ | `profiles` (role lookup) |
| `/signup` | SchoolSignUpPage | ✅ | `schools`, `profiles` |
| `/complete-profile` | CompleteProfilePage | ✅ | `profiles` |
| `/forgot-password` | ForgotPasswordPage | ✅ | `supabase.auth` |
| `/reset-password` | ResetPasswordPage | ✅ | `supabase.auth` |

---

## 2. Super Admin

| Route | Component | Status | Tables | Notes |
|-------|-----------|--------|--------|-------|
| `/super-admin` | SuperAdminDashboardPage | ✅ | `schools`, `profiles` | |
| `/schools` | SchoolsListPage | ✅ | `schools` | |
| `/school/:id` | SchoolDetailPage | ⚠️ | `schools`, `profiles`, `class_enrollments`, `invoices` | Plan/billing sections still hardcoded |
| `/onboard-school` | OnboardSchoolPage | ✅ | `schools`, `profiles` | |
| `/platform-analytics` | PlatformAnalyticsPage | ✅ | `schools`, `profiles`, `invoices` | |
| `/audit-logs` | AuditLogsPage | ✅ | `audit_logs` | |
| `/super-admin-notifications` | SuperAdminNotificationsPage | ✅ | `notifications` | |
| `/broadcast` | BroadcastPage | ✅ | `platform_broadcasts`, `schools` | Real school counts per plan |
| `/feature-flags` | FeatureFlagsPage | ✅ | `feature_flags` | Loads + upserts per flag |
| `/support-tickets` | SupportTicketsPage | ✅ | `support_tickets`, `schools` | Inline status toggle |
| `/platform-billing` | PlatformBillingPage | ✅ | `schools` | Computes revenue from student_count × plan rates |
| `/platform-settings` | PlatformSettingsPage | ✅ | `platform_settings` | Key-value load/save |
| `/email-templates` | EmailTemplatesPage | ✅ | `email_templates` | CRUD — load/edit/create/delete; preview mode |
| `/plans-pricing` | PlansAndPricingPage | ✅ | `platform_config` | Loads + saves `per_student_price`; term revenue calculator |

---

## 3. Admin

| Route | Component | Status | Tables | Notes |
|-------|-----------|--------|--------|-------|
| `/admin` | AdminDashboardPage | ✅ | `schools`, `profiles`, `class_enrollments`, `attendance_records`, `invoices`, `payments` | Attendance rate + outstanding fees both live |
| `/users` | UserManagementPage | ✅ | `profiles` | |
| `/invite-user` | InviteUsersPage | ✅ | `profiles`, `supabase.auth` | |
| `/classes` | ClassesManagementPage | ✅ | `classes`, `subjects`, `teacher_assignments` | |
| `/admin/class/:id` | AdminClassDetailsPage | ✅ | `classes`, `profiles`, `class_enrollments` | |
| `/admin-attendance` | AdminAttendancePage | ✅ | `attendance_records` | |
| `/fee-setup` | AdminFeeSetupPage | ✅ | `invoices`, `profiles` | |
| `/fee-collection` | FeeCollectionPage | ✅ | `invoices`, `payments` | |
| `/admin-announcements` | AdminAnnouncementsPage | ✅ | `announcements` | |
| `/admin-results` | AdminResultsPage | ✅ | `grade_summaries`, `profiles` | |
| `/timetable` | TimetableManagementPage | ✅ | `timetable_entries` | |
| `/school-analytics` | SchoolAnalyticsPage | ✅ | `profiles`, `attendance_records`, `grades` | |
| `/term-calendar` | TermCalendarSetupPage | ✅ | `terms` | |
| `/admin/bulk-import` | BulkStudentImportPage | ✅ | `profiles`, `class_enrollments` | CSV batch import |
| `/report-builder` | ReportBuilderPage | ✅ | `grades`, `attendance_records`, `invoices`, `class_enrollments` | 4 metric types; CSV export |
| `/finance` | FinanceManagementPage | ✅ | `invoices`, `payments`, `fee_structures`, `classes` | Expected/collected/outstanding stats; CSV export |
| `/subscription-billing` | SubscriptionBillingPage | ✅ | `schools` | Plan + student_count; term cost computed |
| `/roles-permissions` | RolesPermissionsPage | ⚠️ | localStorage (keyed by school_id) | Actual access is RLS-enforced; this documents team intent |
| `/admin-support` | AdminSupportPage | ✅ | `support_tickets` | Stats row; expandable ticket list; create form; FAQ accordion |

---

## 4. Teacher

| Route | Component | Status | Tables | Notes |
|-------|-----------|--------|--------|-------|
| `/teacher` | TeacherDashboardPage | ✅ | `profiles`, `classes`, `assignments`, `attendance_records` | |
| `/my-classes` | MyClassesPage | ✅ | `classes`, `class_enrollments` | |
| `/class-details` | ClassDetailsPage | ✅ | `classes`, `class_enrollments`, `profiles`, `grade_summaries`, `attendance_records`, `courses` | Roster + grades + attendance + courses |
| `/students` | StudentsManagementPage | ✅ | `profiles`, `class_enrollments` | |
| `/student-detail` | StudentDetailViewPage | ✅ | `profiles`, `grade_summaries`, `attendance_records`, `assignment_submissions` | Reads `learnora_selected_student` from sessionStorage |
| `/assignments` | TeacherAssignmentsPage | ✅ | `assignments`, `classes` | |
| `/assignment-builder` | AssignmentBuilderPage | ✅ | `assignments` | |
| `/submissions-inbox` | SubmissionsInboxPage | ✅ | `assignment_submissions`, `profiles` | |
| `/grading` | GradingScreenPage | ✅ | `assignment_submissions`, `grades` | |
| `/grade-book` | GradeBookPage | ✅ | `grades`, `grade_summaries`, `profiles` | |
| `/attendance` | AttendanceManagementPage | ✅ | `attendance_records`, `class_enrollments` | |
| `/teacher-calendar` | TeacherCalendarPage | ✅ | `calendar_events` | |
| `/teacher-announcements` | TeacherAnnouncementsPage | ✅ | `announcements` | |
| `/compose-announcement` | ComposeAnnouncementPage | ✅ | `announcements`, `teacher_assignments`, `classes` | Real INSERT; class picker from teacher_assignments |
| `/teacher-messages` | TeacherMessagesPage | ✅ | `messages` | |
| `/teacher-live-classes` | TeacherLiveClassesPage | ✅ | `live_sessions`, `classes`, `subjects` | Live/upcoming/ended split; Today/Tomorrow labels |
| `/course-builder` | CourseBuilderPage | ✅ | `courses`, `modules`, `lessons` | |
| `/lesson-upload` | LessonUploadPage | ✅ | `lessons`, Storage | |
| `/quiz-builder` | QuizBuilderPage | ✅ | `quiz_questions` | |
| `/analysis` | AnalysisPage | ✅ | `grades`, `attendance_records` | |
| `/teacher-analytics` | TeacherAnalyticsPage | ✅ | `teacher_assignments`, `class_enrollments`, `attendance_records`, `assignments`, `grade_summaries`, `assignment_submissions`, `profiles` | 3-phase load; subject averages; weekly chart; at-risk count |
| `/class-performance` | ClassPerformancePage | ✅ | `teacher_assignments`, `class_enrollments`, `grade_summaries`, `attendance_records`, `profiles` | Ref-cache pattern; per-student flags; score distribution |
| `/behavior-analytics` | BehaviorAnalyticsPage | ✅ | `teacher_assignments`, `class_enrollments`, `attendance_records`, `grade_summaries`, `assignment_submissions`, `profiles` | Risk classification; auto-generated flags |
| `/exams` | ExaminationsPage | ✅ | `assignments`, `assignment_submissions`, `class_enrollments`, `classes`, `subjects` | Status computed from due_date + submission count |
| `/teacher-resources` | TeacherResourcesPage | ✅ | `teacher_resources`, `teacher_assignments`, `classes`, `subjects` + Storage | File upload to `teacher-resources` bucket; status pending/approved/rejected |
| `/question-bank` | QuestionBankPage | ✅ | `quiz_questions`, `lessons`, `modules`, `courses`, `subjects` | Delete + duplicate live; type filter; 4-level subject join |
| `/create-assessment` | CreateAssessmentPage | ✅ | `assignments`, `teacher_assignments`, `classes`, `subjects` | Controlled 3-step form; INSERT on submit |
| `/pre-class-lobby` | PreClassLobbyPage | ✅ | sessionStorage + `getUserMedia()` | Camera/mic preview; device toggles; navigates to classroom |
| `/live-classroom` | LiveClassRoomPage | ✅ | `live_sessions` + Daily.co `@daily-co/daily-react` | DailyProvider; real participant grid; screen share; chat; leave updates DB |

---

## 5. Student — Desktop

| Route | Component | Status | Tables | Notes |
|-------|-----------|--------|--------|-------|
| `/student` | OverviewDashboardPage | ✅ | `profiles`, `assignments`, `attendance_records`, `courses` | |
| `/my-courses` | MyCoursesPage | ✅ | `courses`, `class_enrollments` | |
| `/course/:id` | CourseDetailsPage | ✅ | `courses`, `modules`, `lessons` | |
| `/student-assignments` | AssignmentsPage | ✅ | `assignments`, `assignment_submissions` | |
| `/assignment/:id` | AssignmentDetailsPage | ✅ | `assignments`, `assignment_submissions` + Storage | Text + file upload to `assignment-submissions` bucket |
| `/my-submissions` | MySubmissionsPage | ✅ | `assignment_submissions` | |
| `/student-analysis` | StudentAnalysisPage | ✅ | `grade_summaries`, `attendance_records` | |
| `/student-calendar` | CalendarPage | ✅ | `calendar_events` | |
| `/student-messages` | MessagesPage | ✅ | `messages` | |
| `/announcements` | AnnouncementsFeedPage | ✅ | `announcements` | |
| `/notifications` | NotificationsPage | ✅ | `notifications` | |
| `/search` | GlobalSearchPage | ✅ | `courses`, `assignments`, `announcements` | |
| `/subject-performance` | SubjectPerformancePage | ✅ | `grades`, `subjects` | |
| `/deadlines` | DeadlinesViewPage | ✅ | `assignments` | |
| `/attendance-history` | AttendanceHistoryPage | ✅ | `attendance_records` | |
| `/course-resources` | CourseResourcesPage | ✅ | `course_resources` | |
| `/student-timetable` | StudentTimetablePage | ✅ | `timetable_entries` | |
| `/live-classes` | LiveClassesOverviewPage | ✅ | `live_sessions`, `class_enrollments` | Real scheduled sessions for student's class |
| `/downloads` | DownloadsPage | ✅ | `lessons`, `class_enrollments` + Cache API | Real lessons; navigator.storage.estimate(); real SW cache list |
| `/profile` | ProfileSettingsPage | ✅ | `profiles` | |
| `/security-settings` | SecuritySettingsPage | ✅ | `supabase.auth` | Real password change |
| `/notification-settings` | NotificationSettingsPage | ✅ | `profiles` (notification_prefs JSONB) | Per-toggle auto-save; optimistic update + revert |
| `/appearance-settings` | AppearanceSettingsPage | ⚠️ | — | localStorage — intentional device-local preference |
| `/privacy-settings` | PrivacySettingsPage | ⚠️ | — | localStorage — intentional for now |

---

## 6. Student — Mobile

| Route | Component | Status | Tables | Notes |
|-------|-----------|--------|--------|-------|
| `/m/home` | MobileStudentHomePage | ✅ | `profiles`, `assignments`, `courses`, `notifications` | |
| `/m/learn` | MobileLearnPage | ✅ | `courses`, `modules`, `lessons`, `class_enrollments` | |
| `/m/lesson` | LessonViewerPage | ✅ | `lessons`, Storage | |
| `/m/lesson-done` | LessonCompletionPage | ✅ | `lessons` | |
| `/m/quiz` | QuizPage | ✅ | `quiz_questions`, `quiz_attempts` | |
| `/m/quiz-result` | QuizResultPage | ✅ | sessionStorage (`learnora_quiz_result`) | Intentional ephemeral |
| `/m/chat` | MobileStudentMessagesPage | ✅ | `messages` | |
| `/m/chatroom` | ChatRoomPage | ✅ | `messages` | |
| `/m/calendar` | MobileStudentCalendarPage | ✅ | `calendar_events` | |
| `/m/profile` | MobileStudentProfilePage | ✅ | `profiles` | |

---

## 7. Parent

| Route | Component | Status | Tables | Notes |
|-------|-----------|--------|--------|-------|
| `/parent` | ParentHomePage | ✅ | `profiles`, `parent_student_links` | |
| `/parent-progress` | ParentProgressPage | ✅ | `grade_summaries`, `attendance_records` | |
| `/child-attendance` | ChildAttendancePage | ✅ | `attendance_records` | |
| `/school-fees` | SchoolFeesPage | ✅ | `invoices` | |
| `/make-payment` | MakePaymentPage | ⚠️ | — | localStorage handoff from SchoolFeesPage — intentional |
| `/payment-review` | PaymentReviewPage | ✅ | `school_settings`, `invoices` | Real Paystack inline popup |
| `/payment-success` | PaymentSuccessPage | ✅ | `profiles`, `schools` | |
| `/parent-chat` | ParentChatPage | ✅ | `messages` | |
| `/message-teacher` | ParentMessageTeacherPage | ✅ | `messages`, `profiles` | |
| `/parent-notifications` | ParentNotificationsPage | ✅ | `notifications` | |
| `/parent-announcements` | ParentAnnouncementsPage | ✅ | `announcements` | |
| `/report-cards` | ReportCardsPage | ✅ | `grade_summaries`, `terms` | |
| `/parent-profile` | ParentProfilePage | ✅ | `profiles` | |
| `/parent-calendar` | ParentCalendarPage | ✅ | `calendar_events` | |
| `/child-timetable` | ChildTimetablePage | ✅ | `timetable_entries` | |

---

## 8. Shared / Cross-Role

| Route | Component | Status | Notes |
|-------|-----------|--------|-------|
| `/2fa-setup` | TwoFASetupPage | ✅ | `supabase.auth` TOTP MFA |
| `/badges` | BadgesRewardsPage | ✅ | `badge_claims` |
| `/add-event` | AddEventPage | ✅ | `calendar_events` |
| `/course-settings` | CourseSettingsPage | ✅ | `courses` |
| `/storage` | StorageManagementPage | ✅ | Storage API |
| `/shared-files` | SharedFilesPage | ✅ | Storage / `course_resources` |
| `/offline-sync` | OfflineSyncPage | ⚠️ | Cache API + SW — intentional, no Supabase by design |
| `/achievements` | AchievementsPage | ✅ | `lesson_progress`, `grade_summaries`, `attendance_records`, `assignment_submissions` | 10 badges derived from real data; streak compute; XP + level system |
| `/screen-share` | ScreenSharePage | ✅ | Daily.co `useScreenShare()` | Wired inside LiveClassRoomPage; screen stream auto-detected |
| `/participants` | ParticipantsPanelPage | ✅ | Daily.co `useParticipantIds()` | Side panel in LiveClassRoomPage; real cam/mic state per participant |

---

## 9. Intentionally Blocked / Deferred (20 pages)

### Phase 6 — AI (no AI backend wired)
`/ai-assistant` · `/ai-tutor` · `/ai-chat` · `/ai-flashcards` · `/ai-study-plan` · `/ai-quiz` · `/ai-upload` · `/ai-saved` · `/ai-image-solver` · `/ai-exam-prep` · `/ai-recommendations` · `/ai-grading`

### Video / WebRTC (remaining)
`/whiteboard` — scaffold; needs separate real-time layer (e.g. Liveblocks); all other live-class pages are ✅ via Daily.co

### External-API-blocked
| Route | Reason |
|-------|--------|
| `/plagiarism-check` | Needs third-party API (Turnitin / Copyleaks) |
| `/connected-devices` | Needs Supabase Admin API — server-side only |
| `/linked-accounts` | Needs OAuth provider setup |

---

## 10. What's Still Remaining

### Genuinely unwired — no DB table exists (Post-MVP)
| Page | Missing |
|------|---------|
| EmailTemplatesPage | `email_templates` table |
| PlansAndPricingPage | `platform_plans` table |
| AdminSupportPage | No `support_tickets` query wired on admin side |
| AchievementsPage | `achievements` table |

### ⚠️ Mixed — by design (not bugs)
| Page | Why |
|------|-----|
| RolesPermissionsPage | localStorage keyed by school_id; actual access is RLS-enforced |
| MakePaymentPage | localStorage handoff from SchoolFeesPage (intentional bridge) |
| AppearanceSettingsPage | localStorage — device-local preference, acceptable |
| PrivacySettingsPage | localStorage — acceptable for now |
| MakePaymentPage | localStorage handoff — intentional |
| OfflineSyncPage | Cache API only — no Supabase by design |

### Deployment checklist (non-code)
- [ ] `teacher-resources` Supabase Storage bucket must exist for file uploads in TeacherResourcesPage
- [ ] `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paystack_reference TEXT;` (SQL in HANDOFF.md)
- [ ] Deploy Paystack webhook Edge Function
- [ ] Re-enable email confirmation in Supabase Auth before production

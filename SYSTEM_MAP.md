# Learnora — System Map
_Last updated: 2026-06-23. Reflects actual codebase state (App.tsx routes + page files)._

Legend:
- ✅ Real — queries Supabase
- ⚠️ Mixed — some real data, some hardcoded/stub
- 🔲 Scaffold — UI only, no live data (Phase 6 AI features)
- 🔗 nav → — page navigates to these routes

---

## 1. Authentication & Entry

```
/ (SplashPage) ─────────────────────── 🔲 static
  └─► /login (LoginPage)               ✅ supabase.auth.signInWithPassword
        ├─► /otp-verify                ✅ supabase.auth.verifyOtp
        │     └─► /role-selection      🔲 static → role dashboard
        ├─► /forgot-password           ✅ auth.resetPasswordForEmail
        └─► /sign-up (SignUpPage)      ✅ auth.signUp
              ├─► /school-sign-up      ✅ schools insert
              └─► /otp-verify
/invite-accept (InviteAcceptancePage)  ✅ validates token → /complete-profile
/complete-profile (CompleteProfilePage)✅ profiles upsert → role dashboard
/onboarding (OnboardingCarouselPage)   🔲 static → /login
```

---

## 2. Student — Desktop (DashboardLayout + studentNav)

Nav: Dashboard · My Courses · Assignments · Analysis · Live Classes · Messages · AI Tutor · Calendar · Downloads · Settings

```
/dashboard (OverviewDashboardPage)                ✅ real
  Data: class_enrollments → courses, lessons, lesson_progress, assignments, assignment_submissions
  Stats: enrolled courses (w/ progress %), pending/overdue assignments, due this week count
  🔗 nav → courses, course-details (sessionStorage key), assignments, live-classes

/courses (MyCoursesPage)                          ✅ real
  Data: class_enrollments → courses (is_published), lesson counts, progress
  🔗 nav → course-details

/course-details (CourseDetailsPage)               ✅ real
  Data: courses, lessons (is_published), lesson_progress, sessionStorage: learnora_selected_course
  🔗 nav → m/lesson, assignments

/assignments (AssignmentsPage)                    ✅ real
  Data: class_enrollments → assignments (is_published), assignment_submissions
  Inline submission: textarea + supabase insert into assignment_submissions
  🔗 nav → assignment-details

/assignment-details (AssignmentDetailsPage)       ✅ real
  Data: assignments + subjects, assignment_submissions; sessionStorage: learnora_selected_assignment
  🔗 nav → assignments

/analysis (StudentAnalysisPage)                   ✅ real
  Data: grade_summaries, attendance_records
  🔗 nav → subject-performance, deadlines

/subject-performance (SubjectPerformancePage)     ✅ real
  Data: grade_summaries by subject, sessionStorage key for subject
  🔗 nav → analysis

/deadlines (DeadlinesViewPage)                    ✅ real
  Data: assignments filtered by due_date
  🔗 nav → assignments

/live-classes (LiveClassesOverviewPage)           🔲 scaffold
  🔗 nav → live-classroom, pre-class-lobby

/ai-tutor (AITutorPage)                           ⚠️ mixed/scaffold
  Mock: quickActions array, recentChats array; AI response is stub text
  🔗 nav → ai-exam-prep, ai-flashcards, ai-study-plan, ai-image-solver

/messages (MessagesPage)                          ✅ real
  Data: conversations, conversation_members, messages; Supabase realtime channel
  🔗 nav → shared-files

/calendar (CalendarPage)                          ✅ real
  Data: assignments (due dates), live_sessions
  🔗 nav → (no nav targets, displays only)

/notifications (NotificationsPage)                ✅ real
  Data: notifications table; filtered by user_id
  🔗 nav → dynamic via notif.link field

/downloads (DownloadsPage)                        ✅ real
  Data: resources table, lesson attachments
  🔗 nav → course-details

/settings (SettingsPage)                          🔲 static hub
  🔗 nav → profile-settings, notif-settings, security-settings,
           privacy-settings, connected-devices, linked-accounts,
           appearance-settings, storage-management, offline-sync, downloads

/profile-settings (ProfileSettingsPage)           ✅ real
  Data: profiles upsert (full_name, phone, avatar_url)
  🔗 nav → settings

/notif-settings (NotificationSettingsPage)        ✅ real
/security-settings (SecuritySettingsPage)         ✅ real
/privacy-settings (PrivacySettingsPage)           🔲 static
/connected-devices (ConnectedDevicesPage)         🔲 scaffold (Phase 6)
/linked-accounts (LinkedAccountsPage)             🔲 scaffold
/appearance-settings (AppearanceSettingsPage)     🔲 static
/storage-management (StorageManagementPage)       🔲 static
/offline-sync (OfflineSyncPage)                   🔲 static
```

**AI floating button** (DashboardLayout): navigates → `ai-tutor` (student pages omit `nav` prop; auto-detected).

---

## 3. Student — Mobile (MobileLayout + studentMobileNav)

Nav: Home · Learn · Chat · Calendar · Profile

```
/m/home (MobileStudentHomePage)                   ✅ real
  Data: grade_summaries, live_sessions, class_enrollments → courses → lesson_progress,
        attendance_records, assignments (due ≤7 days), assignment_submissions
  Sections: GPA, attendance rate, active courses, upcoming deadlines (urgent if ≤2 days),
            weekly progress cards, recent activity (last 4 submissions)
  🔗 nav → ai-tutor (FAB), learn, live-classes, calendar, assignments, notifications, analysis

/m/learn (MobileLearnPage)                        ✅ real
  Data: class_enrollments → courses, lessons; sessionStorage: learnora_selected_course
  🔗 nav → m/lesson, m/quiz

/m/lesson (LessonViewerPage)                      ✅ real
  Data: lessons, lesson_progress upsert; sessionStorage: learnora_selected_lesson
  🔗 nav → m/quiz, lesson-completion, m/learn

/lesson-completion (LessonCompletionPage)         ✅ real
  🔗 nav → m/learn

/m/quiz (QuizPage)                                ✅ real
  Data: quiz_questions (by lesson_id), answer tracking with timer (useRef)
  Submits: quiz_submissions insert
  🔗 nav → quiz-result

/quiz-result (QuizResultPage)                     ✅ real
  Data: sessionStorage (quiz answers + correct map)
  🔗 nav → m/learn

/m/messages (MobileStudentMessagesPage)           ✅ real
  Data: conversations + messages; Supabase realtime
  🔗 nav → chat-room, group-chat

/chat-room (ChatRoomPage)                         ✅ real
/group-chat (GroupChatPage)                       ✅ real

/m/calendar (MobileStudentCalendarPage)           ✅ real
  Data: assignments (due dates), live_sessions, school calendar events

/m/profile (MobileStudentProfilePage)             ✅ real
  Data: profiles read; links to settings
  🔗 nav → settings, badges-rewards, achievements, certificates

/m/settings (MobileStudentSettingsPage)           ✅ real

/m/onboarding (MobileOnboardingPage)              🔲 static
  🔗 nav → m/home
```

**AI FAB** (MobileLayout): `MobileStudentHomePage` passes `aiPage="ai-tutor"` → circular FAB visible.

---

## 4. Teacher (DashboardLayout + teacherNav)

Nav: Dashboard · My Classes · Students · Assignments · Attendance · Examinations · Gradebook ·
     Analytics · Performance · Behavior · Live Classes · Messages · Resources · Calendar ·
     Announcements · AI Assistant · Reports · Settings · Support

```
/teacher-dashboard (TeacherDashboardPage)          ✅ real
  Data: profiles (own), courses (teacher_id), assignments (teacher_id),
        assignment_submissions count, classes (teacher_id)
  Sections: stat cards, My Classes list, Assignment Overview table, Recent Activity
  Empty states: 🏫 no classes, 📝 no assignments, 📬 no submissions
  🔗 nav → assignment-builder, teacher-live-classes, resources, classes,
           submissions-inbox, attendance, analytics, teacher-announcements

/classes (MyClassesPage)                           ✅ real
  Data: teacher's classes, enrollment counts
  🔗 nav → class-details, students

/class-details (ClassDetailsPage)                  ✅ real
  Data: class by id, enrolled students, courses in class

/students (StudentsManagementPage)                 ✅ real
  Data: profiles (role=student, school_id), class_enrollments
  🔗 nav → student-detail-view

/student-detail-view (StudentDetailViewPage)       ✅ real
  Data: profile, grade_summaries, attendance_records

/teacher-assignments (TeacherAssignmentsPage)      ✅ real
  Data: assignments (teacher_id), subjects, submission counts
  🔗 nav → assignment-builder, submissions-inbox

/assignment-builder (AssignmentBuilderPage)        ✅ real
  Data: subjects, classes; assignments insert/update
  🔗 nav → teacher-assignments

/submissions-inbox (SubmissionsInboxPage)          ✅ real
  Data: assignment_submissions with student/assignment joins; filter by status
  🔗 nav → grading-screen, plagiarism-check

/grading-screen (GradingScreenPage)                ✅ real
  Data: assignment_submissions upsert (grade, feedback); sessionStorage: submission_id

/plagiarism-check (PlagiarismCheckPage)            🔲 scaffold
  No backend integration yet

/attendance (AttendanceManagementPage)             ✅ real
  Data: attendance_records upsert with school_id, status enum (present|absent|late)
  Requires: class selection, date selection
  🔗 nav → in-class-attendance

/in-class-attendance (InClassAttendancePage)       ✅ real

/examinations (ExaminationsPage)                   ✅ real
  Data: assessments table, exam_schedule

/exam-schedule (ExamSchedulePage)                  ✅ real

/create-assessment (CreateAssessmentPage)          ✅ real
  🔗 nav → question-bank

/question-bank (QuestionBankPage)                  ✅ real

/grade-book (GradeBookPage)                        ✅ real
  Data: grade_summaries upsert (school_id), courses by teacher_id, student roster
  CSV export: Blob download

/analytics (TeacherAnalyticsPage)                  ✅ real
  Data: grade_summaries, attendance_records aggregated
  🔗 nav → class-performance, student-analysis, behavior-analytics

/class-performance (ClassPerformancePage)          ✅ real
/student-analysis (StudentAnalysisPage)            ✅ real
/behavior-analytics (BehaviorAnalyticsPage)        ✅ real

/teacher-live-classes (TeacherLiveClassesPage)     ✅ real
  Data: live_sessions (teacher_id); create/cancel sessions
  🔗 nav → live-classroom, pre-class-lobby, screen-share, schedule-live-class

/live-classroom (LiveClassRoomPage)                🔲 scaffold (WebRTC/video — Phase 6)
/pre-class-lobby (PreClassLobbyPage)               🔲 scaffold
/screen-share (ScreenSharePage)                    🔲 scaffold
/participants-panel (ParticipantsPanelPage)        🔲 scaffold
/class-recordings (ClassRecordingsPage)            ✅ real (recordings table)

/messages (MessagesPage)                           ✅ real (shared with student desktop)

/resources (TeacherResourcesPage)                  ✅ real
  Data: resources table (teacher_id), file upload to Supabase Storage

/lesson-upload (LessonUploadPage)                  ✅ real
/lesson-planner (LessonPlannerPage)                ✅ real
/course-builder (CourseBuilderPage)                ✅ real
  Data: courses insert, lessons insert, is_published toggle
/course-settings (CourseSettingsPage)              ✅ real

/calendar (CalendarPage)                           ✅ real (shared)
/add-event (AddEventPage)                          ✅ real

/teacher-announcements (TeacherAnnouncementsPage)  ✅ real
  Data: announcements table, target_roles

/ai-assistant (AIGradingPage)                      ⚠️ scaffold/mock
  Uses teacherNav; mock recentChats + quickActions; stub AI response
  NOTE: Component is named "AIGradingPage" but functions as general AI chat scaffold

/reports (ReportPage)                              ⚠️ mixed
  Generate Report → report-builder | Export → window.print() | Schedule → teacher-calendar
  Quick Generate templates → report-builder
  Table download → window.print()

/report-builder (ReportBuilderPage)                ⚠️ mixed
  Filter/column UI is live; table data is hardcoded mock rows (gradeRows, attendanceRows, feeRows, enrollmentRows)
  Export CSV → Blob download of mock data

/settings (SettingsPage)                           🔲 static hub (same as student)
/teacher-support (TeacherSupportPage)              🔲 static

/ai-grading (AIGradingPage)                        ⚠️ same component as /ai-assistant
```

**AI floating button** (DashboardLayout, teacherNav): navigates → `ai-assistant` (auto-detected from nav).

---

## 5. Admin (DashboardLayout + adminNav)

Nav: Dashboard · Users · Classes · Attendance · Finance · Fee Setup · Fee Collection ·
     Subscription · Analytics · Reports · Report Builder · Results · Timetable ·
     Integrations · Announcements · Roles · Audit Logs · Settings · Support

```
/admin-dashboard (AdminDashboardPage)              ✅ real
  Data: profiles count (students, teachers), classes count, recent profiles (5)
  ⚠️ Attendance Rate stat: hardcoded "—" (not yet wired to attendance_records)
  ⚠️ Finance in Module Overview: hardcoded "—"
  Onboarding checklist: checks teacher/class counts to mark steps done
  🔗 nav → user-management, classes-management, admin-fee-setup

/user-management (UserManagementPage)              ✅ real
  Data: profiles (school_id) with CRUD; role assignment; bulk invite

/invite-users (InviteUsersPage)                    ✅ real
  Data: sends invite emails via Supabase auth admin

/bulk-student-import (BulkStudentImportPage)       ✅ real
  Data: CSV parse → profiles bulk insert

/classes-management (ClassesManagementPage)        ✅ real
  Data: classes CRUD; teacher assignment; enrollment management

/admin-class-details (AdminClassDetailsPage)       ✅ real
  Data: class + enrolled students + courses + attendance summary

/attendance (AdminAttendancePage)                  ✅ real
  Data: attendance_records by school_id with filters; class/date drill-down

/attendance-analytics (AttendanceAnalyticsPage)    ✅ real
  Data: attendance_records aggregated (present/absent/late rates)

/finance (FinanceManagementPage)                   ✅ real
  Data: invoices, payments aggregated; outstanding totals; revenue by period

/admin-fee-setup (AdminFeeSetupPage)               ✅ real
  Data: fee_structures CRUD (term, grade, amount)

/fee-collection (FeeCollectionPage)                ✅ real
  Data: invoices (school_id), payments; mark paid; bulk invoice generation

/subscription-billing (SubscriptionBillingPage)   ✅ real
  Data: school subscription tier + billing history

/analytics (SchoolAnalyticsPage)                   ✅ real
  Data: grade_summaries, attendance_records aggregated school-wide

/reports (ReportPage)                              ⚠️ mixed (same as teacher, wired buttons)

/admin-reports (AdminReportsPage)                  ✅ real
  Data: generates live from attendance_records|grade_summaries|invoices|class_enrollments
  Generate: Loader2 spinner while fetching; Download PDF → window.print(); Export CSV → Blob

/report-builder (ReportBuilderPage)                ⚠️ mixed (same as teacher — mock table data)

/admin-results (AdminResultsPage)                  ✅ real
  Data: grade_summaries with subject/student joins; term filter

/timetable-management (TimetableManagementPage)   ✅ real
  Data: timetable_entries CRUD; class/subject/teacher scheduling

/integrations (AdminIntegrationsPage)             ✅ real
  Data: integration settings table; Paystack config

/payment-integration (PaymentIntegrationPage)     ✅ real
  Data: payment gateway config; Paystack public/secret key setup

/admin-announcements (AdminAnnouncementsPage)     ✅ real
  Data: announcements insert/list (school_id); audience → target_roles mapping

/roles-permissions (RolesPermissionsPage)         ✅ real
  Data: custom role permissions (if applicable)

/audit-logs (AuditLogsPage)                       ✅ real (if implemented)

/school-settings (SchoolSettingsPage)             ✅ real
  Data: schools update (name, logo, timezone, term structure)

/settings (SettingsPage)                          🔲 static hub → profile-settings etc.

/admin-support (AdminSupportPage)                 🔲 static
```

**AI floating button** (DashboardLayout, adminNav passed): navigates → `ai-assistant` (auto-detected).

---

## 6. Parent — Mobile (MobileLayout + parentMobileNav)

Nav: Home · Progress · Fees · Updates · Profile

```
/parent/home (ParentHomePage)                      ✅ real
  Data: parent_student_links → grade_summaries, class_enrollments, invoices,
        attendance_records, notifications (last 3)
  Sections: child overview, attendance summary strip, quick actions,
            academic performance, finance card, communication, recent notifications
  Child switcher: sessionStorage (learnora_selected_child_id) for multi-child families
  🔗 nav → parent/progress, parent/report-cards, parent/attendance, parent/chat,
           parent/fees, parent/message-teacher, parent/notifications

/parent/progress (ParentProgressPage)              ✅ real
  Data: grade_summaries, subject breakdowns for selected child
  🔗 nav → parent/home

/parent/report-cards (ReportCardsPage)             ✅ real
  Data: grade_summaries by term; formatted as printable report cards
  🔗 nav → parent/home

/parent/attendance (ChildAttendancePage)           ✅ real
  Data: attendance_records (student_id from sessionStorage child)
  Rate calculation, month drill-down
  🔗 nav → parent/home

/parent/timetable (ChildTimetablePage)             ✅ real
  Data: timetable_entries (class_id of child)

/parent/fees (SchoolFeesPage)                      ✅ real
  Data: invoices (student_id), fee_structures, payments; bank details from school_settings
  Near-due detection, outstanding total, payment history
  🔗 nav → make-payment, select-payment-method

/make-payment (MakePaymentPage)                    ✅ real
  Data: invoice loading; Paystack JS SDK inline payment
  🔗 nav → select-payment-method

/select-payment-method (SelectPaymentMethodPage)   ✅ real
  🔗 nav → payment-review

/payment-review (PaymentReviewPage)                ✅ real
  🔗 nav → payment-success

/payment-success (PaymentSuccessPage)              🔲 static confirmation
  🔗 nav → parent/home

/parent/chat (ParentChatPage)                      ✅ real
  Data: conversations (parent_id), messages; Supabase realtime

/parent/message-teacher (ParentMessageTeacherPage) ✅ real
  Data: profiles (teachers in child's classes); new conversation start

/parent/notifications (ParentNotificationsPage)    ✅ real
  Data: notifications (user_id); filtered for parent role

/parent/announcements (ParentAnnouncementsPage)    ✅ real
  Data: announcements (target_roles includes 'parent' or school-wide)

/parent/calendar (ParentCalendarPage)              ✅ real
  Data: school calendar events, term dates, exam schedules

/permission-slips (PermissionSlipsPage)            ✅ real
  Data: permission_slip_requests

/parent/profile (ParentProfilePage)                ✅ real
  Data: profiles upsert (parent's own profile)
  🔗 nav → settings
```

**No AI FAB** on parent pages (ParentHomePage does not pass `aiPage` to MobileLayout — by design).

---

## 7. Super Admin (DashboardLayout + superAdminNav)

Nav: Platform · Schools · Billing · Plans · Analytics · Broadcast · Feature Flags ·
     Email Templates · Audit Logs · Support · Settings

```
/super-dashboard (SuperAdminDashboardPage)          ✅ real
  Data: schools table (count, recent list); profiles count per school; subscription status
  🔗 nav → schools-list, platform-analytics

/schools-list (SchoolsListPage)                    ✅ real
  Data: schools (all) with search/filter; student/teacher counts
  🔗 nav → school-detail, onboard-school

/school-detail (SchoolDetailPage)                  ✅ real
  Data: school record + metrics; admin list for that school
  🔗 nav → (school edit, user management for school)

/onboard-school (OnboardSchoolPage)                ✅ real
  Data: schools insert; first admin profile creation; sends invite email
  🔗 nav → schools-list

/platform-billing (PlatformBillingPage)            ✅ real
  Data: subscriptions table; payment history per school

/plans-pricing (PlansAndPricingPage)               🔲 static
  Informational pricing page

/platform-analytics (PlatformAnalyticsPage)        ✅ real
  Data: cross-school aggregates (profiles count, active schools, revenue)

/broadcast (BroadcastPage)                         ✅ real
  Data: platform_announcements insert; targets all schools

/feature-flags (FeatureFlagsPage)                  ✅ real
  Data: feature_flags table (name, enabled, per-school overrides)

/email-templates (EmailTemplatesPage)              ✅ real
  Data: email_templates CRUD (welcome, invite, reset etc.)

/audit-logs (AuditLogsPage)                        ✅ real (shared with admin)

/super-notifications (SuperAdminNotificationsPage) ✅ real
  Data: platform-level notifications

/support-tickets (SupportTicketsPage)              ✅ real
  Data: support_tickets table; status, assignment, replies

/platform-settings (PlatformSettingsPage)          ✅ real
  Data: platform-level config (domain, branding, limits)

/settings (SettingsPage)                           🔲 static hub
```

**AI floating button** (DashboardLayout, superAdminNav passed): navigates → `ai-assistant`.

---

## 8. Shared / Phase 6 AI Pages (all roles, via sidebar/nav)

```
/ai-assistant (AIGradingPage)                ⚠️ scaffold — mock recentChats, hardcoded quickActions
/ai-tutor (AITutorPage)                      ⚠️ scaffold — stub AI response
/ai-exam-prep (AIExamPrepPage)               🔲 scaffold
/ai-flashcards (AIFlashcardsPage)            🔲 scaffold
/ai-generated-quiz (AIGeneratedQuizPage)     🔲 scaffold
/ai-grading (AIGradingPage)                  ⚠️ scaffold (same component as /ai-assistant)
/ai-image-solver (AIImageSolverPage)         🔲 scaffold
/ai-recommendations (AIRecommendationsPage)  🔲 scaffold
/ai-saved-conversations (AISavedConversations) 🔲 scaffold
/ai-study-plan (AIStudyPlanPage)             🔲 scaffold
/ai-upload-materials (AIUploadMaterialsPage) 🔲 scaffold
/ai-chat-session (AIChatSessionPage)         🔲 scaffold
```

All Phase 6 AI pages are intentional scaffolds pending real AI model integration.

---

## Known Issues & Gaps

| # | Location | Issue | Status |
|---|----------|-------|--------|
| 1 | `DashboardLayout` | Floating AI button defaulted to `ai-assistant` for student pages | ✅ Fixed (auto-detects via nav prop) |
| 2 | `AdminDashboardPage` | "Attendance Rate" stat hardcoded `—`, not queried | Open — minor |
| 3 | `AdminDashboardPage` | "Finance" in Module Overview hardcoded `—` | Open — minor |
| 4 | `ReportBuilderPage` | Table data is hardcoded mock rows (gradeRows, attendanceRows, etc.) | Open — Phase 6 |
| 5 | `AIGradingPage` | Component name misleads; actually serves as general AI chat scaffold at `/ai-assistant` AND `/ai-grading` | Open — naming debt |
| 6 | Student desktop pages | `assignment_submissions` insert does not upload files (text only) | Open — no file upload UI yet |
| 7 | `live-classroom`, `pre-class-lobby`, `screen-share` | WebRTC/video — Phase 6 scaffold | Blocked on external service |
| 8 | `plagiarism-check` | No backend integration | Blocked on external service |
| 9 | `connected-devices` | Mock session list | Blocked on auth session API |
| 10 | School-scoping | Most queries rely on RLS; explicit `school_id` filter sometimes absent in reads (safe, but defensive coding gap) | Low priority |
| 11 | Parent Paystack | Webhook Edge Function deployed separately; `paystack_reference` column must be added to `invoices` | Pending SQL (see HANDOFF.md) |

---

## Navigation Summary (cross-role entry points)

```
Login → role → dashboard
  student  → /m/home (mobile) OR /dashboard (desktop)
  teacher  → /teacher-dashboard
  admin    → /admin-dashboard
  parent   → /parent/home
  superadmin → /super-dashboard

Shared pages (any role can reach):
  /settings, /profile-settings, /notif-settings, /security-settings
  /notifications, /messages, /calendar
  /ai-tutor (student), /ai-assistant (teacher/admin/super)
```

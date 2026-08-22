# Learnora — Mock Data & Supabase Connectivity Audit

**Date:** 2026-06-09  
**Scope:** Every interactive element and data display, every role  
**Goal:** Know exactly what's live vs mock before wiring anything

---

## Status Key
| Symbol | Meaning |
|--------|---------|
| ✅ | Connected — live Supabase query confirmed |
| ⚠️ | Partial — some data live, some still mock |
| ❌ | Mock — no Supabase calls; UI only |

## Priority Key
| Tag | Meaning |
|-----|---------|
| 🔴 MVP | Product can't function without this |
| 🟡 Soon | Needed within first month of real use |
| ⚪ Later | Advanced/nice-to-have; fine to stay mock for now |

## Tables NOT in schema
`audit_logs`, `email_templates`, `quiz_questions` — these don't exist yet; pages that depend on them are flagged.

---

## 1. Auth & Onboarding (all roles)

| Screen | Feature | Status | Should do | Table(s) | Priority |
|--------|---------|--------|-----------|----------|----------|
| LoginPage | Sign in form | ✅ | `signIn()` → role-routes correctly | `profiles` | — |
| SchoolSignUpPage | School + admin registration | ✅ | Creates school + auth user + profile | `schools`, `profiles` | — |
| InviteAcceptancePage | Accept invite link | ✅ | signUp → update profile → enroll | `invitations`, `profiles`, `class_enrollments` | — |
| ForgotPasswordPage | Send reset email | ✅ | `supabase.auth.resetPasswordForEmail()` | auth only | 🔴 MVP |
| ResetPasswordPage | Set new password | ✅ | `supabase.auth.updateUser({ password })` | auth only | 🔴 MVP |
| OTPVerificationPage | OTP check | ❌ | `supabase.auth.verifyOtp()` | auth only | 🟡 Soon |
| CompleteProfilePage | Save profile on first login | ✅ | UPDATE profiles (full_name, phone) | `profiles` | 🔴 MVP |
| ProfileSettingsPage | Edit name/phone/bio | ❌ | UPDATE profiles | `profiles` | 🟡 Soon |
| NotificationSettingsPage | Toggle preferences | ❌ | Upsert user prefs (no table yet — add `notification_preferences` col to profiles or new table) | `profiles` | ⚪ Later |
| SecuritySettingsPage | Change password | ❌ | `supabase.auth.updateUser({ password })` | auth only | 🟡 Soon |
| AppearanceSettingsPage | Theme toggle | ⚠️ | Saves to localStorage only; could persist in profiles | `profiles` | ⚪ Later |

---

## 2. Super Admin

| Screen | Feature | Status | Should do | Table(s) | Priority |
|--------|---------|--------|-----------|----------|----------|
| SuperAdminDashboardPage | Active schools count | ✅ | SELECT schools, count active | `schools` | — |
| SuperAdminDashboardPage | Total students count | ✅ | SUM student_count from schools | `schools` | — |
| SuperAdminDashboardPage | MRR / Churn Rate | ❌ | Calculate from invoices/payments | `invoices`, `payments` | ⚪ Later |
| SchoolsListPage | List all schools | ✅ | SELECT all schools | `schools` | — |
| SchoolDetailPage | School overview (stats, modules, students, tickets) | ❌ | SELECT school + JOIN profiles (admin) + counts | `schools`, `profiles`, `class_enrollments`, `support_tickets` | 🟡 Soon |
| OnboardSchoolPage | Create school | ✅ | INSERT schools | `schools` | — |
| PlatformAnalyticsPage | All platform stats | ❌ | Aggregate across schools/profiles/enrollments | `schools`, `profiles`, `class_enrollments`, `lesson_progress` | ⚪ Later |
| PlatformBillingPage | Revenue / invoices | ❌ | SELECT invoices + payments across schools | `invoices`, `payments` | ⚪ Later |
| PlansAndPricingPage | Edit plan rates | ❌ | No backing table — rates are in `fee_structures` or a new `platform_plans` table | ⚠️ No table | ⚪ Later |
| BroadcastPage | Send platform-wide message | ❌ | INSERT announcements (school_id = null for global) | `announcements` | ⚪ Later |
| FeatureFlagsPage | Toggle feature flags | ❌ | SELECT/UPDATE feature_flags | `feature_flags` | 🟡 Soon |
| SupportTicketsPage | View/resolve tickets | ❌ | SELECT support_tickets across all schools | `support_tickets` | 🟡 Soon |
| EmailTemplatesPage | Edit email templates | ❌ | No `email_templates` table — needs new table | ⚠️ No table | ⚪ Later |
| AuditLogsPage | Platform audit trail | ❌ | No `audit_logs` table — needs new table | ⚠️ No table | ⚪ Later |
| SuperAdminNotificationsPage | Platform notifications | ❌ | SELECT notifications WHERE school_id IS NULL | `notifications` | ⚪ Later |
| PlatformSettingsPage | Global toggles | ❌ | Persist in `feature_flags` or `platform_schools` | `platform_schools` | ⚪ Later |

---

## 3. Admin

| Screen | Feature | Status | Should do | Table(s) | Priority |
|--------|---------|--------|-----------|----------|----------|
| AdminDashboardPage | Student/teacher/class counts | ✅ | COUNT profiles + classes | `profiles`, `classes` | — |
| AdminDashboardPage | Recent users list | ✅ | SELECT profiles ORDER BY created_at | `profiles` | — |
| AdminDashboardPage | Onboarding checklist | ⚠️ | Steps auto-check based on DB state; some checks still hardcoded | `profiles`, `classes`, `invitations` | 🟡 Soon |
| ClassesManagementPage | List classes | ✅ | SELECT classes with teacher + enrollment count | `classes`, `profiles`, `class_enrollments` | — |
| ClassesManagementPage | Create class | ✅ | INSERT class + class_subjects | `classes`, `class_subjects` | — |
| AdminClassDetailsPage | Class detail (students, performance) | ❌ | SELECT class + enrollments + grades + attendance | `classes`, `class_enrollments`, `profiles`, `grades`, `attendance_records` | 🟡 Soon |
| UserManagementPage | List users | ✅ | SELECT profiles WHERE school_id = mine | `profiles` | — |
| UserManagementPage | Invite user (teacher/student/parent) | ✅ | INSERT invitations | `invitations` | — |
| UserManagementPage | Deactivate user | ❌ | UPDATE profiles SET is_active = false | `profiles` | 🟡 Soon |
| AdminAttendancePage | View attendance by class | ❌ | SELECT attendance_records JOIN profiles/classes | `attendance_records`, `classes`, `profiles` | 🟡 Soon |
| AdminFeeSetupPage | Create/edit fee structures | ❌ | INSERT/UPDATE fee_structures | `fee_structures` | 🟡 Soon |
| FeeCollectionPage | View invoices + payments | ❌ | SELECT invoices + payments JOIN profiles | `invoices`, `payments`, `profiles` | 🟡 Soon |
| SubscriptionBillingPage | School's Learnora subscription | ❌ | SELECT invoices WHERE type='subscription' | `invoices` | ⚪ Later |
| AdminResultsPage | Publish results / report cards | ❌ | SELECT grades + grade_summaries; INSERT report_cards | `grades`, `grade_summaries`, `report_cards` | 🟡 Soon |
| AdminAnnouncementsPage | List announcements | ❌ | SELECT announcements WHERE school_id = mine | `announcements` | 🟡 Soon |
| TimetableManagementPage | Create timetable / term calendar | ❌ | INSERT calendar_events; INSERT terms | `calendar_events`, `terms` | 🟡 Soon |
| SchoolAnalyticsPage | School-wide analytics | ❌ | Aggregate from grades, attendance, enrollments | `grades`, `attendance_records`, `class_enrollments` | ⚪ Later |
| AdminReportsPage | Download reports | ❌ | SELECT grade_summaries + report_cards | `grade_summaries`, `report_cards` | ⚪ Later |
| RolesPermissionsPage | Manage role permissions | ❌ | No dedicated table — roles are in profiles | `profiles` | ⚪ Later |
| AuditLogsPage | School audit trail | ❌ | No `audit_logs` table | ⚠️ No table | ⚪ Later |
| AdminSupportPage | Submit/view support tickets | ❌ | INSERT/SELECT support_tickets | `support_tickets` | ⚪ Later |
| InviteUsersPage | Bulk invite UI | ❌ | INSERT multiple invitations | `invitations` | 🟡 Soon |
| TermCalendarSetupPage | Configure school terms | ❌ | INSERT/UPDATE terms | `terms` | 🟡 Soon |
| SchoolSystemSettingsPage | School branding/settings | ❌ | UPDATE schools | `schools` | ⚪ Later |
| FinanceManagementPage | Finance overview | ❌ | SELECT invoices + payments + fee_structures | `invoices`, `payments`, `fee_structures` | ⚪ Later |
| PaymentIntegrationPage | Payment gateway config | ❌ | No dedicated table | ⚠️ No table | ⚪ Later |
| AdminIntegrationsPage | Third-party integrations | ❌ | No dedicated table | ⚠️ No table | ⚪ Later |
| ReportBuilderPage | Custom report builder | ❌ | Complex query builder UI — no backing table | ⚠️ No table | ⚪ Later |

---

## 4. Teacher

| Screen | Feature | Status | Should do | Table(s) | Priority |
|--------|---------|--------|-----------|----------|----------|
| TeacherDashboardPage | Stats (classes, students, submissions) | ✅ | COUNT teacher_assignments, class_enrollments, assignment_submissions | `teacher_assignments`, `class_enrollments`, `assignment_submissions` | 🔴 MVP |
| TeacherDashboardPage | Recent activity feed | ✅ | SELECT assignment_submissions ORDER BY submitted_at | `assignment_submissions` | 🔴 MVP |
| TeacherDashboardPage | Upcoming schedule widget | ❌ | SELECT calendar_events WHERE school_id + teacher | `calendar_events` | 🟡 Soon |
| MyClassesPage | List assigned classes | ✅ | SELECT teacher_assignments → classes + enrollment count | `teacher_assignments`, `classes`, `class_enrollments` | 🔴 MVP |
| StudentsManagementPage | List students in teacher's classes | ✅ | SELECT class_enrollments → profiles WHERE teacher's classes | `class_enrollments`, `profiles`, `teacher_assignments` | 🔴 MVP |
| StudentDetailViewPage | Individual student profile + grades | ❌ | SELECT profile + grades + attendance_records | `profiles`, `grades`, `attendance_records` | 🟡 Soon |
| TeacherAssignmentsPage | List assignments | ❌ | SELECT assignments WHERE created_by = teacher | `assignments` | 🔴 MVP |
| AssignmentBuilderPage | Create assignment | ✅ | INSERT assignments | `assignments` | 🔴 MVP |
| SubmissionsInboxPage | View student submissions | ✅ | SELECT assignment_submissions JOIN profiles | `assignment_submissions`, `profiles` | 🔴 MVP |
| GradingScreenPage | Grade a submission | ✅ | UPDATE assignment_submissions SET grade; INSERT grades | `assignment_submissions`, `grades` | 🔴 MVP |
| GradeBookPage | Full grade book grid | ❌ | SELECT grades JOIN profiles + assignments | `grades`, `profiles`, `assignments` | 🟡 Soon |
| BulkGradePage | Grade multiple at once | ❌ | UPDATE multiple grades | `grades` | 🟡 Soon |
| InClassAttendancePage | Mark today's attendance | ✅ | INSERT attendance_records (upsert on student_id,class_id,date) | `attendance_records` | 🔴 MVP |
| AttendanceAnalyticsPage | Attendance trends | ❌ | SELECT + aggregate attendance_records | `attendance_records` | 🟡 Soon |
| AttendanceManagementPage | View/edit attendance history | ❌ | SELECT/UPDATE attendance_records | `attendance_records` | 🟡 Soon |
| TeacherLiveClassesPage | List live sessions | ❌ | SELECT live_sessions WHERE teacher | `live_sessions` | 🟡 Soon |
| ScheduleLiveClassPage | Create live session | ❌ | INSERT live_sessions | `live_sessions` | 🟡 Soon |
| ClassRecordingsPage | View recordings | ❌ | SELECT session_recordings | `session_recordings` | ⚪ Later |
| TeacherAnnouncementsPage | List announcements | ❌ | SELECT announcements WHERE school_id + class_id | `announcements` | 🟡 Soon |
| ComposeAnnouncementPage | Post announcement | ❌ | INSERT announcements | `announcements` | 🟡 Soon |
| TeacherMessagesPage | Conversations list + chat | ❌ | SELECT conversations + messages | `conversations`, `conversation_members`, `messages` | 🟡 Soon |
| TeacherCalendarPage | Calendar view | ❌ | SELECT calendar_events | `calendar_events` | 🟡 Soon |
| ClassPerformancePage | Class-level performance | ❌ | SELECT grade_summaries | `grade_summaries` | ⚪ Later |
| TeacherAnalyticsPage | Teacher analytics | ❌ | Aggregate grades/attendance | `grades`, `attendance_records` | ⚪ Later |
| BehaviorAnalyticsPage | At-risk students | ❌ | Derived from attendance + grades | `attendance_records`, `grades` | ⚪ Later |
| ExaminationsPage | Exam schedule list | ❌ | SELECT calendar_events WHERE type='exam' | `calendar_events` | 🟡 Soon |
| CourseBuilderPage | Build a course | ❌ | INSERT courses + modules + lessons | `courses`, `modules`, `lessons` | 🟡 Soon |
| LessonPlannerPage | Plan lessons | ❌ | INSERT/UPDATE lessons | `lessons` | 🟡 Soon |
| LessonUploadPage | Upload lesson resources | ❌ | INSERT course_resources | `course_resources` | 🟡 Soon |
| QuestionBankPage | Question bank | ❌ | No `quiz_questions` table — needs new table | ⚠️ No table | ⚪ Later |
| QuizBuilderPage | Build a quiz | ❌ | No `quizzes` table — needs new table | ⚠️ No table | ⚪ Later |
| AssignmentDetailsPage | View single assignment | ❌ | SELECT assignments + submissions count | `assignments`, `assignment_submissions` | 🟡 Soon |
| LessonNotesPage | Lesson notes | ❌ | SELECT/INSERT lessons | `lessons` | ⚪ Later |
| TeacherResourcesPage | Resource library | ❌ | SELECT course_resources | `course_resources` | ⚪ Later |
| TeacherSettingsPage | Dark mode + profile | ⚠️ | Dark mode works locally; profile save not wired | `profiles` | 🟡 Soon |
| TeacherSupportPage | Submit support ticket | ❌ | INSERT support_tickets | `support_tickets` | ⚪ Later |

---

## 5. Student

| Screen | Feature | Status | Should do | Table(s) | Priority |
|--------|---------|--------|-----------|----------|----------|
| OverviewDashboardPage | Welcome + enrolled courses (first 4) + lesson progress | ✅ | class_enrollments → courses; lesson_progress for progress % | `class_enrollments`, `courses`, `lessons`, `lesson_progress` | 🔴 MVP |
| OverviewDashboardPage | Upcoming assignments with submission status | ✅ | SELECT assignments + assignment_submissions for student | `assignments`, `assignment_submissions` | 🔴 MVP |
| OverviewDashboardPage | Grades summary | ❌ | SELECT grade_summaries WHERE student | `grade_summaries` | 🔴 MVP |
| MyCoursesPage | List enrolled courses with progress % | ✅ | class_enrollments → courses; lesson_progress per course | `class_enrollments`, `courses`, `lessons`, `lesson_progress` | 🔴 MVP |
| CourseDetailsPage | Course modules + lessons + student progress | ✅ | SELECT modules + lessons; lesson_progress for done/not-done; localStorage for course selection | `courses`, `modules`, `lessons`, `lesson_progress` | 🔴 MVP |
| AssignmentsPage | List assignments + status + inline submit | ✅ | SELECT assignments; upsert assignment_submissions on submit | `assignments`, `assignment_submissions`, `class_enrollments` | 🔴 MVP |
| AssignmentDetailsPage | View assignment + submit | ✅ | SELECT assignment + submission status; INSERT assignment_submissions; localStorage for selection | `assignments`, `assignment_submissions` | 🔴 MVP |
| MySubmissionsPage | View submitted work | ❌ | SELECT assignment_submissions WHERE student | `assignment_submissions` | 🟡 Soon |
| AnalysisPage | Student performance | ❌ | SELECT grade_summaries + grades | `grade_summaries`, `grades` | 🟡 Soon |
| StudentAnalysisPage | Detailed analysis | ❌ | SELECT grades + attendance_records | `grades`, `attendance_records` | ⚪ Later |
| AcademicHistoryPage | Past terms history | ❌ | SELECT report_cards | `report_cards` | ⚪ Later |
| LiveClassesOverviewPage | Upcoming live sessions | ❌ | SELECT live_sessions WHERE class enrolled | `live_sessions`, `class_enrollments` | 🟡 Soon |
| PreClassLobbyPage | Join live class | ❌ | UPDATE live_attendance | `live_attendance`, `live_sessions` | 🟡 Soon |
| ClassRecordingsPage | Past recordings | ❌ | SELECT session_recordings | `session_recordings` | ⚪ Later |
| NotificationsPage | Notification feed | ❌ | SELECT notifications WHERE user_id | `notifications` | 🟡 Soon |
| AnnouncementsFeedPage | School announcements | ❌ | SELECT announcements WHERE school_id | `announcements` | 🟡 Soon |
| AnnouncementDetailsPage | Single announcement | ❌ | SELECT single announcement | `announcements` | 🟡 Soon |
| MessagesPage | Inbox | ❌ | SELECT conversations + messages | `conversations`, `conversation_members`, `messages` | 🟡 Soon |
| CalendarPage | Events + schedule | ❌ | SELECT calendar_events for student's classes | `calendar_events`, `class_enrollments` | 🟡 Soon |
| GlobalSearchPage | Search across content | ❌ | Full-text search on courses, lessons, assignments, announcements | multiple | ⚪ Later |
| DownloadsPage | Downloaded content | ❌ | SELECT course_resources | `course_resources` | ⚪ Later |
| LeaderboardPage | Class/school rankings | ❌ | SELECT grade_summaries ORDER BY score | `grade_summaries` | ⚪ Later |
| AchievementsPage | Badges/streaks | ❌ | No achievements table — needs new table | ⚠️ No table | ⚪ Later |
| AITutorPage | AI chat | ❌ | INSERT ai_sessions + ai_messages; call AI API | `ai_sessions`, `ai_messages` | ⚪ Later |
| AIFlashcardsPage | Flashcards | ❌ | Derive from lessons content; no dedicated table | `lessons` | ⚪ Later |
| AIExamPrepPage | Exam prep | ❌ | SELECT past_questions; no `past_questions` table | ⚠️ No table | ⚪ Later |
| AIGeneratedQuizPage | AI quiz | ❌ | No quiz table; AI API call | ⚠️ No table | ⚪ Later |
| AISavedConversationsPage | Saved AI chats | ❌ | SELECT ai_sessions | `ai_sessions` | ⚪ Later |
| StudyPlannerPage | Study plan | ❌ | No `study_plans` table | ⚠️ No table | ⚪ Later |
| CertificatesPage | Earned certificates | ❌ | No `certificates` table | ⚠️ No table | ⚪ Later |
| AcademicGoalsPage | Personal goals | ❌ | No `goals` table | ⚠️ No table | ⚪ Later |
| DiscussionForumPage | Class discussion | ❌ | Could use messages table; no `forum_posts` table | ⚠️ No table | ⚪ Later |
| SupportCenterPage | Help / tickets | ❌ | INSERT support_tickets | `support_tickets` | ⚪ Later |

---

## 6. Parent

| Screen | Feature | Status | Should do | Table(s) | Priority |
|--------|---------|--------|-----------|----------|----------|
| ParentHomePage | List linked children | ❌ | SELECT parent_student_links → profiles | `parent_student_links`, `profiles` | 🔴 MVP |
| ParentHomePage | Child's recent grades/attendance | ❌ | SELECT grade_summaries + attendance_records for child | `grade_summaries`, `attendance_records` | 🔴 MVP |
| ParentProgressPage | Full child performance | ❌ | SELECT grades + grade_summaries + assignments | `grades`, `grade_summaries`, `assignments` | 🔴 MVP |
| ReportCardsPage | Term report cards | ❌ | SELECT report_cards for child | `report_cards` | 🟡 Soon |
| SchoolFeesPage | Fee balances + history | ❌ | SELECT invoices WHERE student = child | `invoices`, `payments` | 🔴 MVP |
| MakePaymentPage | Pay a fee | ❌ | INSERT payments; UPDATE invoices | `payments`, `invoices` | 🔴 MVP |
| SelectPaymentMethodPage | Choose payment method | ❌ | UI only — payment gateway integration needed | `payments` | 🔴 MVP |
| PaymentReviewPage | Review before paying | ❌ | SELECT invoice | `invoices` | 🔴 MVP |
| PaymentSuccessPage | Confirm payment | ❌ | Should confirm real payment status | `payments`, `invoices` | 🔴 MVP |
| ParentMessageTeacherPage | Message a teacher | ❌ | INSERT conversation + message | `conversations`, `conversation_members`, `messages` | 🟡 Soon |
| ParentChatPage | Ongoing chats | ❌ | SELECT conversations + messages | `conversations`, `messages` | 🟡 Soon |
| ParentAnnouncementsPage | School announcements | ❌ | SELECT announcements WHERE school_id | `announcements` | 🟡 Soon |
| ParentNotificationsPage | Notifications | ❌ | SELECT notifications WHERE user_id | `notifications` | 🟡 Soon |
| ParentCalendarPage | School events | ❌ | SELECT calendar_events WHERE school_id | `calendar_events` | 🟡 Soon |
| ChildAttendancePage | Child's attendance record | ❌ | SELECT attendance_records WHERE student = child | `attendance_records`, `parent_student_links` | 🟡 Soon |
| ChildTimetablePage | Child's class schedule | ❌ | SELECT calendar_events for child's class | `calendar_events`, `class_enrollments` | 🟡 Soon |
| PermissionSlipsPage | Sign permission slips | ❌ | No `permission_slips` table | ⚠️ No table | ⚪ Later |
| ParentProfilePage | Edit parent profile | ❌ | UPDATE profiles | `profiles` | 🟡 Soon |

---

## 7. Mobile (Student)

| Screen | Feature | Status | Should do | Table(s) | Priority |
|--------|---------|--------|-----------|----------|----------|
| MobileStudentHomePage | Today's classes + continue learning | ❌ | SELECT class_enrollments + lesson_progress | `class_enrollments`, `lesson_progress` | 🔴 MVP |
| MobileLearnPage | Lesson list | ❌ | SELECT courses → modules → lessons | `courses`, `modules`, `lessons` | 🔴 MVP |
| LessonViewerPage | Watch/read a lesson | ❌ | SELECT lesson; INSERT/UPDATE lesson_progress | `lessons`, `lesson_progress` | 🔴 MVP |
| LessonCompletionPage | Mark lesson done | ❌ | UPDATE lesson_progress SET completed = true | `lesson_progress` | 🔴 MVP |
| MobileStudentMessagesPage | Messages inbox | ❌ | SELECT conversations + messages | `conversations`, `messages` | 🟡 Soon |
| MobileStudentCalendarPage | Calendar | ❌ | SELECT calendar_events | `calendar_events` | 🟡 Soon |
| MobileStudentProfilePage | Student profile | ❌ | SELECT profile | `profiles` | 🟡 Soon |
| MobileStudentSettingsPage | Dark mode + account links | ⚠️ | Dark mode works (localStorage); sign out not wired | auth | 🟡 Soon |
| mobile/QuizPage | Take a quiz | ❌ | No `quizzes` table | ⚠️ No table | ⚪ Later |
| mobile/QuizResultPage | Quiz results | ❌ | No quiz results table | ⚠️ No table | ⚪ Later |
| MobileOnboardingPage | First-run onboarding | ❌ | Mark onboarding complete in profiles | `profiles` | ⚪ Later |

---

## Summary

| Role | ✅ Wired | ⚠️ Partial | ❌ Mock | 🔴 MVP gaps |
|------|---------|-----------|---------|------------|
| Auth | 3 | 1 | 5 | Password reset, CompleteProfile |
| Super Admin | 4 | 0 | 12 | None blocking (can use existing) |
| Admin | 5 | 1 | 18 | Fee setup, Attendance, Results |
| Teacher | 6 | 1 | 26 | TeacherAssignmentsPage list |
| Student | 5 | 0 | 30 | Grades summary, Live Classes |
| Parent | 0 | 0 | 18 | Children links, Fees, Progress |
| Mobile | 0 | 1 | 10 | Home, Learn, Lesson progress |

**Total wired: ~24 / ~120 screens**  
*Batch 2 added: TeacherDashboardPage, MyClassesPage, StudentsManagementPage, InClassAttendancePage, AssignmentBuilderPage, SubmissionsInboxPage, GradingScreenPage*  
*Batch 3 added: OverviewDashboardPage, MyCoursesPage, CourseDetailsPage, AssignmentsPage, AssignmentDetailsPage*  
**All backing tables exist** (except: `audit_logs`, `email_templates`, `quiz_questions`, `achievements`, `study_plans`, `certificates`, `goals`, `forum_posts`, `permission_slips`)

---

## Recommended Wiring Order

### Batch 1 — Auth basics (unblocks all roles)
1. ForgotPasswordPage + ResetPasswordPage
2. CompleteProfilePage (save to profiles on first login)

### Batch 2 — Teacher core (unblocks daily use)
3. TeacherDashboardPage — live stats
4. MyClassesPage — teacher_assignments → classes
5. StudentsManagementPage — class_enrollments → profiles
6. InClassAttendancePage — insert attendance_records
7. AssignmentBuilderPage — insert assignments
8. SubmissionsInboxPage + GradingScreenPage — read/grade submissions

### Batch 3 — Student core
9. OverviewDashboardPage — enrolled courses, upcoming assignments
10. MyCoursesPage + CourseDetailsPage — courses, lesson_progress
11. AssignmentsPage + AssignmentDetailsPage — view + submit

### Batch 4 — Parent core
12. ParentHomePage — parent_student_links → children
13. ParentProgressPage — grades + attendance for child
14. SchoolFeesPage — invoices for child

### Batch 5 — Shared features
15. Announcements (post + read) — teacher, admin, student, parent
16. Notifications — all roles
17. Messages/Chat — teacher ↔ student ↔ parent
18. Calendar — all roles

### Batch 6 — Admin advanced
19. AdminAttendancePage — real records
20. AdminFeeSetupPage + FeeCollectionPage
21. AdminResultsPage + report cards
22. TimetableManagementPage + TermCalendarSetupPage

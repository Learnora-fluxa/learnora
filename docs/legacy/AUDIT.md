# Learnora — Full Health Audit
**Date:** 2026-06-09  
**Scope:** All roles · All screens · All flows  
**Status:** Report only — no fixes applied

---

## How to read this

- ❌ **Broken** — actively wrong; bug, security hole, or completely non-functional flow  
- ⚠️ **Needs attention** — incomplete, partial, or fragile; won't crash today but will bite you  
- ✅ **OK** — verified, no action needed  
- Severity: **HIGH** / **MED** / **LOW**  

---

## 🔴 HIGH — Fix these first

---

### Auth & Access Control (HIGH)

| # | Status | Finding | Severity |
|---|--------|---------|----------|
| A1 | ✅ | ~~No ProtectedRoute anywhere.~~ **Fixed (1ab53da):** `ProtectedRoute` layout route wraps all non-auth routes in App.tsx; unauthenticated visitors redirect to `/login`. | HIGH |
| A2 | ✅ | ~~Logout never calls `supabase.auth.signOut()`.~~ **Fixed (1ab53da):** Sidebar logout confirm now calls `await signOut()` from `useAuth()` before navigating. | HIGH |
| A3 | ✅ | ~~SignUpPage never calls `supabase.auth.signUp()`.~~ **Fixed (1ab53da):** Calls `supabase.auth.signUp()`; since email confirmation is off, session is live immediately; stores role in localStorage and navigates to `role-select` (OTP skipped). | HIGH |
| A4 | ✅ | ~~OTP verification is UI-only.~~ **Fixed (1ab53da):** OTP page is no longer reachable via the normal signup flow (email confirmation is disabled); signup goes directly to role-select. | HIGH |
| A5 | ✅ | ~~No role guard on any page.~~ **Fixed (1ab53da):** `RoleRoute` wraps all admin and super_admin routes in App.tsx. Non-matching roles redirect to `/login`. | HIGH |

---

### Navigation & Flows (HIGH)

| # | Status | Finding | Severity |
|---|--------|---------|----------|
| N1 | ✅ | ~~"Forgot password?" is a dead button.~~ **Fixed (1ab53da):** `onClick={() => onNavigate('forgot-password')}` added to the button. | HIGH |
| N2 | ❌ | **School selector persists nothing.** `src/pages/SchoolSelectorPage.tsx` — four hardcoded schools, clicking any navigates to `login` without saving a `school_id` anywhere. The entire multi-tenant login path is broken. | HIGH |

---

### Data Connections — Fully Mock Pages (HIGH)

All pages below have **zero Supabase calls** — they render static/hardcoded data only.

| # | Status | Page | What's hardcoded | Severity |
|---|--------|------|-----------------|----------|
| D1 | ⚠️ | `SchoolSelectorPage.tsx` | 4 hardcoded schools | HIGH |
| D2 | ⚠️ | `AttendanceManagementPage.tsx` | Student names, class list, user object | HIGH |
| D3 | ⚠️ | `GradeBookPage.tsx` | Grade rows, user object — no supabase import | HIGH |
| D4 | ⚠️ | `AnalysisPage.tsx` | `subjectStats`, `topStudents`, `scoreBands` | HIGH |
| D5 | ⚠️ | `TeacherAnnouncementsPage.tsx` | Announcements array, user object | HIGH |
| D6 | ⚠️ | `admin/AdminAttendancePage.tsx` | `classData`, `studentRecords` | HIGH |
| D7 | ⚠️ | `admin/AdminAnnouncementsPage.tsx` | Announcements array | HIGH |
| D8 | ⚠️ | `admin/AdminResultsPage.tsx` | Class results table | HIGH |
| D9 | ⚠️ | `admin/AdminFeeSetupPage.tsx` | Fee structure form renders but never INSERTs | HIGH |
| D10 | ⚠️ | `admin/FeeCollectionPage.tsx` | Student payment table | HIGH |
| D11 | ⚠️ | `superadmin/SchoolDetailPage.tsx` | School object hardcoded as "Greenfield Academy"; all stats | HIGH |
| D12 | ⚠️ | `mobile/MobileStudentHomePage.tsx` | Student name "David", empty class/course arrays, no useAuth | HIGH |
| D13 | ⚠️ | `mobile/MobileLearnPage.tsx` | Subjects and resources arrays | HIGH |
| D14 | ⚠️ | `mobile/LessonViewerPage.tsx` | Algebra lesson content | HIGH |
| D15 | ⚠️ | `parent/SelectPaymentMethodPage.tsx` | Balance ₦17,500, bank details | HIGH |
| D16 | ⚠️ | `parent/MakePaymentPage.tsx` | Amount ₦85,000 | HIGH |
| D17 | ⚠️ | `parent/PaymentReviewPage.tsx` | TXN-2026-45983, ₦50,000, account number | HIGH |
| D18 | ⚠️ | `parent/PaymentSuccessPage.tsx` | "Olive Princely", "Greenfield Academy" receipt | HIGH |
| D19 | ⚠️ | `parent/ChildAttendancePage.tsx` | Attendance records array | HIGH |
| D20 | ⚠️ | `parent/ReportCardsPage.tsx` | Subject scores table | HIGH |

---

### Data Connections — Mock Saves on Otherwise Wired Pages (HIGH)

| # | Status | Finding | Severity |
|---|--------|---------|----------|
| D21 | ❌ | **ProfileSettingsPage save is mock.** `src/pages/ProfileSettingsPage.tsx` — `save()` only calls `setSaved(true)`. No `supabase.from('profiles').update(...)`. Also uses hardcoded defaults: `useState('Olive')`, `useState('Johnson')`. | HIGH |
| D22 | ❌ | **SecuritySettingsPage password change is mock.** `src/pages/SecuritySettingsPage.tsx` — `savePassword()` sets local state only. Active sessions list is hardcoded (Chrome on Windows 10, Safari on iPhone 14). | HIGH |
| Q8 | ⚠️ | **Hardcoded school name and bank details in payment flow.** `PaymentSuccessPage.tsx`, `SelectPaymentMethodPage.tsx`, `SchoolFeesPage.tsx` — "Greenfield Academy", "GTBank", "0123456789" are module-level constants. Wrong for every school except the dev's test tenant. | HIGH |

---

## 🟡 MEDIUM — Important but not blocking

---

### Auth & Access Control (MED)

| # | Status | Finding | Severity |
|---|--------|---------|----------|
| A6 | ⚠️ | **Sidebar shows hardcoded fallback user.** `src/components/layout/Sidebar.tsx` — `defaultUser = { name: 'Olive Johnson', role: 'Student', ... }`. Any page that omits the `user` prop shows this fake identity. | MED |
| A7 | ⚠️ | **~47 pages pass hardcoded user object to DashboardLayout.** Includes `AttendanceManagementPage`, `GradeBookPage`, `TeacherAnnouncementsPage`, `AdminAttendancePage`, and ~43 others. These pass `user={{ name: 'Daniel Johnson', role: 'Teacher', ... }}` instead of `profileToSidebarUser(profile)` from `useAuth()`. Authenticated users see a wrong name and role in the sidebar. | MED |
| A8 | ⚠️ | **ParentProgressPage relies only on localStorage for child ID.** No `profile?.id` guard. If `learnora_selected_child` is stale or spoofed, a Supabase query runs with an arbitrary UUID. | MED |
| A9 | ⚠️ | **MobileStudentSettingsPage has no logout button.** `src/pages/mobile/MobileStudentSettingsPage.tsx` — only a dark-mode toggle. Students on mobile cannot sign out. | MED |

---

### Navigation & Flows (MED)

| # | Status | Finding | Severity |
|---|--------|---------|----------|
| N3 | ⚠️ | **"View All" quick-action button in ParentHomePage has no handler.** Renders but does nothing. Similar dead "View All" links appear on several other pages. | MED |

---

### Data Connections (MED)

| # | Status | Finding | Severity |
|---|--------|---------|----------|
| D23 | ⚠️ | **SchoolFeesPage bank details are hardcoded.** `src/pages/parent/SchoolFeesPage.tsx` — `{ name: 'GTBank', acct: '0123456789', acctName: 'School Account' }` as module-level constant. No `school_settings` table in schema yet — flagged as a known gap in HANDOFF. | MED |
| D24 | ⚠️ | **TeacherAssignmentsPage missing `.eq('school_id', ...)` filter.** `src/pages/TeacherAssignmentsPage.tsx` — queries assignments by `teacher_id` only. Cross-school isolation depends entirely on RLS; a misconfigured policy would leak data. | MED |
| D25 | ⚠️ | **Messages pages not school-scoped.** `MessagesPage.tsx` and `TeacherMessagesPage.tsx` — `conversation_members` and `messages` queries have no `school_id` filter. Conversations from a user's previous school could appear. | MED |

---

### Security (MED)

| # | Status | Finding | Severity |
|---|--------|---------|----------|
| S3 | ⚠️ | **RLS not explicitly enabled on 9+ tables.** `supabase/schema.sql` — the RLS grant block does not list: `audit_logs`, `email_templates`, `quiz_questions`, `quizzes`, `achievements`, `study_plans`, `certificates`, `goals`, `forum_posts`, `permission_slips`. If these tables exist and are queried they may be accessible without school scoping. | MED |

---

### Form Validation (MED)

| # | Status | Finding | Severity |
|---|--------|---------|----------|
| V3 | ⚠️ | **SecuritySettingsPage doesn't reauthenticate before password change.** When wired, `supabase.auth.updateUser({ password })` alone is insufficient — `supabase.auth.reauthenticate()` or re-prompt for current password is required by Supabase for sensitive operations. | MED |

---

### Error / Loading / Empty States (MED)

| # | Status | Finding | Severity |
|---|--------|---------|----------|
| E3 | ⚠️ | **No `ErrorBoundary` anywhere in the app.** An unhandled render exception in any component crashes the entire SPA with a white screen. No fallback UI exists. | MED |
| E4 | ⚠️ | **Supabase `error` return is silently discarded sitewide.** Pattern `const { data } = await supabase.from(...)` throughout. `MyCoursesPage`, `AssignmentsPage`, `TeacherDashboardPage`, `MyClassesPage`, and ~20 more wired pages. Users see an empty list instead of an error message on any DB failure. | MED |
| E6 | ⚠️ | **Unread message count is always 0.** `MessagesPage.tsx` and `TeacherMessagesPage.tsx` — `unread: 0` hardcoded in the conversation mapping. The badge UI exists but never shows. | MED |

---

### Code Quality (MED)

| # | Status | Finding | Severity |
|---|--------|---------|----------|
| Q4 | ⚠️ | **No real-time subscription on messages.** Messages load once on conversation open; new messages from the other party don't appear until the user navigates away and back. No `supabase.channel().on('postgres_changes', ...)`. | MED |
| Q5 | ⚠️ | **localStorage cross-page coupling is fragile.** `ParentProgressPage`, `SchoolFeesPage`, `MakePaymentPage`, `PaymentReviewPage` all read `learnora_selected_child` from localStorage. A second tab or cleared storage silently breaks these pages. Same pattern with `learnora_selected_course` / `learnora_selected_assignment`. | MED |
| Q7 | ⚠️ | **No Supabase type generation in use.** No `database.types.ts` generated file found. All join response types are cast via `as unknown as` (36 occurrences). Running `supabase gen types` would eliminate all manual casts and make DB type errors compile-time errors. | MED |

---

## 🟢 LOW — Minor / Polish

---

### Navigation (LOW)

| # | Status | Finding | Severity |
|---|--------|---------|----------|
| N4 | ⚠️ | **Paperclip button in MessagesPage has no handler.** File-attachment UI is implied but not wired. | LOW |
| N5 | ⚠️ | **MoreVertical button in MessagesPage has no handler.** | LOW |
| N6 | ⚠️ | **Download buttons on SchoolFeesPage payment history rows have no handler.** Receipt download not implemented. | LOW |

---

### Security (LOW)

| # | Status | Finding | Severity |
|---|--------|---------|----------|
| S1 | ⚠️ | **Real Supabase project URL in `.env` working tree.** Anon key is intentionally public but the project URL is present. `.gitignore` correctly excludes `.env` — not committed to history. No action needed unless repo is made public without env review. | LOW |
| S4 | ✅ | **Invitations table allows public token read** — intentional for invite-link flow. Documented as accepted risk. | LOW |

---

### Form Validation (LOW)

| # | Status | Finding | Severity |
|---|--------|---------|----------|
| V2 | ⚠️ | **ProfileSettingsPage has no field validation.** Empty name is not caught — moot until the save is wired. | LOW |
| V4 | ⚠️ | **AssignmentBuilderPage: no client-side validation on required fields.** Title / due date / instructions can be submitted empty; Supabase constraints may reject but there's no user-facing feedback. | LOW |

---

### Errors & States (LOW)

| # | Status | Finding | Severity |
|---|--------|---------|----------|
| E1 | ⚠️ | **MobileStudentHomePage: no loading or error state.** Renders hardcoded data immediately; no async flow, no spinner, no empty state. | LOW |
| E5 | ⚠️ | **ParentProgressPage: silent empty state if `learnora_selected_child` is missing.** `setLoading(false); return` with no message to the user. | LOW |

---

### Code Quality (LOW)

| # | Status | Finding | Severity |
|---|--------|---------|----------|
| Q3 | ⚠️ | **Failed message send is not rolled back.** `MessagesPage.tsx` — message is optimistically appended before the INSERT. If the INSERT fails, the ghost message stays in the UI. | LOW |
| Q6 | ⚠️ | **Icon-only buttons have no `aria-label`.** Bell, settings, back-chevron, send, paperclip, download buttons across multiple pages. Screen readers cannot identify their purpose. | LOW |

---

### Responsiveness (LOW)

| # | Status | Finding | Severity |
|---|--------|---------|----------|
| R1 | ✅ | Student mobile screens use MobileLayout correctly. | — |
| R2 | ✅ | Parent screens use MobileLayout correctly. | — |
| R3 | ✅ | Teacher and admin screens use DashboardLayout correctly. | — |
| R4 | ⚠️ | Teacher/admin complex tables not audited at narrow viewport — desktop-first per design spec but overflow not verified. | LOW |
| R5 | ⚠️ | **MobileStudentSettingsPage: no logout, no profile edit, no nav to other student pages.** | MED |

---

## ✅ Positive findings (nothing to fix)

| # | Finding |
|---|---------|
| P1 | **No `console.log` anywhere in `src/`.** Zero occurrences. |
| P2 | **No `service_role` key anywhere in the frontend.** Only `VITE_SUPABASE_ANON_KEY` is used. |
| P3 | **No `as any` TypeScript casts.** 36 `as unknown as` casts (accepted Supabase join workaround). |
| P4 | **`.env` is correctly gitignored.** Credentials not in git history. |
| P5 | **`tsc -b` is clean.** Zero TypeScript errors as of last commit. |

---

## Summary by severity

| Severity | Count | Areas |
|----------|-------|-------|
| **HIGH** | 27 | Auth (5), Nav (2), Mock data (20) |
| **MED** | 19 | Auth (4), Nav (1), Data (3), Security (1), Forms (1), Errors (3), Quality (3), Mobile (1) |
| **LOW** | 12 | Nav (3), Security (2), Forms (2), Errors (2), Quality (2), Responsiveness (1) |
| **OK** | 5 | Positive findings |

**Total issues: 58** (27 HIGH · 19 MED · 12 LOW)

---

## Recommended fix order

1. **A1–A5** — Auth: ProtectedRoute + signOut + SignUp/OTP backend wiring (security foundation — everything else builds on this)
2. **A7 + D21/D22** — Real user identity in sidebar + wired profile/security settings saves
3. **D12–D14** — Mobile student home, learn, and lesson pages (most-used student path)
4. **D15–D20** — Parent payment flow end-to-end (money movement — high stakes)
5. **D2–D11** — Teacher/admin mock pages (teacher grade book, attendance, announcements, admin fee setup, fee collection, results)
6. **E3 + E4** — ErrorBoundary + surface Supabase errors sitewide
7. **Q8** — School name and bank details from DB, not constants
8. **N1 + N2** — Forgot password link + school selector persistence
9. **Q4** — Real-time messages
10. Everything MED/LOW as bandwidth allows

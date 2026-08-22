# Learnora — Backend Map & Checklist

## Architecture Decision

**Stack: Supabase (all-in-one)**
- PostgreSQL database (all data)
- Supabase Auth (all 5 roles, JWT, OTP, magic links)
- Supabase Storage (files, videos, avatars, PDFs)
- Supabase Realtime (chat, notifications, live updates)
- Supabase Edge Functions (Deno/TypeScript — webhooks, AI proxy, email, PDFs)

**Third-party services wired via Edge Functions:**
| Service | Purpose | Cost |
|---------|---------|------|
| Paystack | Nigerian school fee payments | Free until ₦500k/month |
| Daily.co | Video calling for Live Classes | Free 10,000 min/month |
| Resend | Transactional email (invites, OTP, receipts) | Free 3,000/month |
| Claude API | AI Tutor (claude-haiku-4-5) | Pay-per-use |
| Termii / Africa's Talking | Nigerian SMS (OTP, alerts) | Pay-per-use |

---

## Multi-tenancy Pattern

Every table (except `schools` and `super_admin_users`) has a `school_id UUID` column.
Row Level Security (RLS) policies enforce: `school_id = auth.jwt()->>'school_id'`
This means a school admin, teacher, parent, or student can **never** see another school's data — enforced at the database level, not in application code.

---

## Database Tables

### Core / Cross-cutting

```
schools
  id, name, code (unique slug), logo_url, domain,
  subscription_plan, subscription_status, student_count,
  created_at

profiles  (extends Supabase auth.users)
  id (= auth.users.id), school_id, role (student|teacher|admin|parent|super_admin),
  full_name, avatar_url, phone, email, is_active, created_at

parent_student_links
  id, school_id, parent_id, student_id

notifications
  id, school_id, user_id, title, body, type, read, link, created_at

announcements
  id, school_id, author_id, title, body, target_roles[], published_at
```

### Academic Structure

```
terms
  id, school_id, name (e.g. "2025/2026 First Term"),
  start_date, end_date, is_current

classes
  id, school_id, term_id, name (e.g. "SS2A"), level, arm

subjects
  id, school_id, name, code

class_subjects          (which subjects are taught in which class)
  id, school_id, class_id, subject_id

class_enrollments       (student → class)
  id, school_id, student_id, class_id, term_id, enrolled_at

teacher_assignments     (teacher → subject in a class)
  id, school_id, teacher_id, class_id, subject_id, term_id
```

### Courses & Content

```
courses
  id, school_id, class_id, subject_id, teacher_id, term_id,
  title, description, cover_url, is_published, created_at

modules
  id, course_id, school_id, title, position

lessons
  id, module_id, course_id, school_id, title, type (video|pdf|text|quiz),
  content_url, duration_minutes, position, is_published

lesson_progress         (student progress per lesson)
  id, school_id, student_id, lesson_id, completed, completed_at, last_position_seconds

course_resources        (extra files attached to a course)
  id, course_id, school_id, name, file_url, file_type, uploaded_by
```

### Assignments

```
assignments
  id, school_id, class_id, subject_id, teacher_id, term_id,
  title, instructions, due_date, max_score, attachment_url, created_at

assignment_submissions
  id, school_id, assignment_id, student_id,
  submission_url, submission_text, submitted_at, status (pending|submitted|graded|late)

grades
  id, school_id, submission_id, assignment_id, student_id, teacher_id,
  score, max_score, feedback, graded_at
```

### Attendance

```
attendance_records
  id, school_id, class_id, subject_id, teacher_id, term_id,
  student_id, date, status (present|absent|late), marked_at
```

### Live Classes

```
live_sessions
  id, school_id, class_id, subject_id, teacher_id, term_id,
  topic, scheduled_at, duration_minutes, daily_room_url, status (upcoming|live|ended)

session_recordings
  id, school_id, session_id, recording_url, duration_seconds, created_at

live_attendance
  id, school_id, session_id, student_id, joined_at, left_at
```

### Messaging

```
conversations
  id, school_id, type (direct|group), name, class_id (nullable), created_at

conversation_members
  id, conversation_id, user_id, school_id, joined_at

messages
  id, school_id, conversation_id, sender_id,
  body, attachment_url, sent_at, read_by[]
```

### Finance / Fees

```
fee_structures
  id, school_id, term_id, class_id (nullable = applies to all),
  name, amount, due_date, is_mandatory

invoices
  id, school_id, student_id, term_id, fee_structure_id,
  amount, status (unpaid|paid|partial|waived), due_date, created_at

payments
  id, school_id, invoice_id, student_id, amount, currency (NGN),
  paystack_reference, paystack_status, paid_at
```

### Performance / Reports

```
grade_summaries         (aggregated per student per subject per term)
  id, school_id, student_id, subject_id, term_id,
  average_score, total_assignments, grade_letter, position_in_class

report_cards
  id, school_id, student_id, term_id,
  status (draft|published), pdf_url, published_at, generated_at
```

### Calendar

```
calendar_events
  id, school_id, title, description, start_date, end_date,
  type (exam|holiday|activity|deadline), created_by
```

### AI Tutor

```
ai_sessions
  id, school_id, student_id, title, subject, created_at

ai_messages
  id, session_id, school_id, role (user|assistant), content, created_at
```

### Super Admin (no school_id — platform-level)

```
platform_schools        (mirrors schools + billing metadata)
  id, school_id, plan, mrr_ngn, students_billed, status, onboarded_at

feature_flags
  id, school_id, flag_name, enabled

support_tickets
  id, school_id, subject, body, status, created_at
```

---

## Storage Buckets

| Bucket | Contents | Access |
|--------|---------|--------|
| `avatars` | User profile photos | Authenticated read, owner write |
| `lesson-videos` | Course video files | Enrolled students + teacher read |
| `lesson-pdfs` | Course PDFs/notes | Enrolled students + teacher read |
| `assignment-submissions` | Student submission files | Student owner + teacher read |
| `course-resources` | Extra course materials | Class members read |
| `school-branding` | Logos, banners | Public read |
| `report-cards` | Generated PDF report cards | Student owner + parent + admin read |

---

## Edge Functions (Deno / TypeScript)

| Function | Trigger | Does |
|---------|---------|------|
| `paystack-webhook` | POST from Paystack | Verifies HMAC, marks invoice paid, notifies parent |
| `create-live-session` | Teacher schedules class | Calls Daily.co REST API, creates room, saves URL |
| `generate-report-card` | Admin publishes term | Compiles grades, renders PDF, uploads to Storage |
| `ai-tutor-chat` | Student sends message | Proxies to Claude API (keeps API key server-side) |
| `send-email` | Invite / OTP / receipt | Calls Resend API |
| `send-sms` | OTP / fee reminder | Calls Termii API |
| `create-paystack-link` | Parent clicks Pay | Creates Paystack payment link, returns URL |

---

## Realtime Subscriptions (Supabase Realtime)

| Channel | Used by | Trigger |
|---------|---------|---------|
| `messages` table | MessagesPage | New message insert |
| `notifications` table | NotificationCenter | New notification insert |
| `live_sessions` table | LiveClassesPage | Status change (upcoming → live) |
| `attendance_records` | InClassAttendancePage | Teacher marks attendance live |

---

## Screen → Backend Map

### Phase 1 — Foundation
| Screen | Tables | Auth | Storage | Edge Fn | Realtime |
|--------|--------|------|---------|---------|----------|
| School Signup | schools, profiles | ✓ signup | school-branding | send-email | — |
| Login / OTP | profiles | ✓ login, OTP | — | send-sms | — |
| Forgot/Reset Password | — | ✓ reset flow | — | — | — |
| Invite Acceptance | profiles | ✓ invite | — | send-email | — |
| Admin Dashboard | profiles, classes, assignments, attendance_records | ✓ admin role | — | — | — |
| User Management | profiles | ✓ | — | send-email (invite) | — |
| Super Admin Dashboard | platform_schools | ✓ super_admin | — | — | — |
| Schools List | platform_schools, schools | ✓ | — | — | — |
| Onboard New School | schools, profiles | ✓ | school-branding | send-email | — |

### Phase 2 — Core LMS
| Screen | Tables | Auth | Storage | Edge Fn | Realtime |
|--------|--------|------|---------|---------|----------|
| Student Dashboard | profiles, classes, assignments, lesson_progress, attendance_records | ✓ student | avatars | — | — |
| My Courses | courses, modules, lessons, lesson_progress | ✓ | — | — | — |
| Course Details | courses, modules, lessons | ✓ | — | — | — |
| Video/Lesson Player | lessons, lesson_progress | ✓ | lesson-videos, lesson-pdfs | — | — |
| Course Builder | courses, modules, lessons | ✓ teacher | lesson-videos, lesson-pdfs | — | — |
| Lesson Upload | lessons | ✓ teacher | lesson-videos, lesson-pdfs | — | — |
| Teacher Dashboard | profiles, classes, assignments, attendance_records | ✓ teacher | — | — | — |
| My Classes | classes, class_enrollments, teacher_assignments | ✓ | — | — | — |
| Assignments Overview [S] | assignments, assignment_submissions, grades | ✓ student | — | — | — |
| Assignment Builder [T] | assignments | ✓ teacher | lesson-pdfs | — | — |
| Submissions Inbox [T] | assignment_submissions | ✓ teacher | assignment-submissions | — | — |
| Grading Screen [T] | grades, assignment_submissions | ✓ teacher | — | — | — |
| Attendance Management | attendance_records, class_enrollments | ✓ teacher | — | — | ✓ |

### Phase 3 — Engagement
| Screen | Tables | Auth | Storage | Edge Fn | Realtime |
|--------|--------|------|---------|---------|----------|
| Messages / Chat | conversations, messages, conversation_members | ✓ | — | — | ✓ messages |
| Announcements | announcements | ✓ teacher/admin | — | — | — |
| Notifications | notifications | ✓ | — | — | ✓ notifications |
| Calendar | calendar_events, terms | ✓ | — | — | — |
| Performance Overview [S] | grade_summaries, attendance_records | ✓ student | — | — | — |

### Phase 4 — Parents & Finance
| Screen | Tables | Auth | Storage | Edge Fn | Realtime |
|--------|--------|------|---------|---------|----------|
| Parent Dashboard | profiles, class_enrollments, grade_summaries, attendance_records, invoices | ✓ parent | — | — | — |
| Child Performance | grade_summaries, grades | ✓ parent | — | — | — |
| Child Attendance | attendance_records | ✓ parent | — | — | — |
| Fee Status | invoices, fee_structures | ✓ parent | — | — | — |
| Pay Fees Flow | invoices, payments | ✓ parent | — | create-paystack-link, paystack-webhook | — |
| Admin Finance | fee_structures, invoices, payments | ✓ admin | — | — | — |
| Admin Fee Collection | invoices, payments | ✓ admin | — | — | — |

### Phase 5 — Polish
| Screen | Tables | Auth | Storage | Edge Fn | Realtime |
|--------|--------|------|---------|---------|----------|
| Report Cards [A][T] | report_cards, grade_summaries, grades | ✓ admin/teacher | report-cards | generate-report-card | — |
| Report Cards [S][P] | report_cards | ✓ student/parent | report-cards | — | — |
| Settings / Profile | profiles | ✓ | avatars | — | — |
| Global Search | all tables (full-text search) | ✓ | — | — | — |

### Phase 6 — Differentiators
| Screen | Tables | Auth | Storage | Edge Fn | Realtime |
|--------|--------|------|---------|---------|----------|
| Schedule Live Class | live_sessions | ✓ teacher | — | create-live-session | ✓ |
| Live Classroom | live_attendance | ✓ | — | — (Daily.co SDK) | ✓ |
| Class Recordings | session_recordings | ✓ | lesson-videos | — | — |
| AI Tutor Chat | ai_sessions, ai_messages | ✓ student | — | ai-tutor-chat | — |
| WAEC/JAMB Prep | ai_sessions, ai_messages | ✓ student | — | ai-tutor-chat | — |
| Performance Deep Dive | grade_summaries, attendance_records | ✓ | — | — | — |

---

## Master Build Checklist

### 🗄️ Database Tables
- [ ] schools
- [ ] profiles (+ Supabase Auth trigger to auto-create on signup)
- [ ] parent_student_links
- [ ] notifications
- [ ] announcements
- [ ] terms
- [ ] classes
- [ ] subjects
- [ ] class_subjects
- [ ] class_enrollments
- [ ] teacher_assignments
- [ ] courses
- [ ] modules
- [ ] lessons
- [ ] lesson_progress
- [ ] course_resources
- [ ] assignments
- [ ] assignment_submissions
- [ ] grades
- [ ] attendance_records
- [ ] live_sessions
- [ ] session_recordings
- [ ] live_attendance
- [ ] conversations
- [ ] conversation_members
- [ ] messages
- [ ] fee_structures
- [ ] invoices
- [ ] payments
- [ ] grade_summaries
- [ ] report_cards
- [ ] calendar_events
- [ ] ai_sessions
- [ ] ai_messages
- [ ] platform_schools
- [ ] feature_flags
- [ ] support_tickets

### 🔐 Row Level Security Policies
- [ ] school_id isolation on every tenant table
- [ ] Role-based read/write per table (student vs teacher vs admin vs parent)
- [ ] Parent can only read their linked children's data
- [ ] Super admin bypasses school_id check (service role)

### 🗑️ Storage Buckets
- [ ] avatars
- [ ] lesson-videos
- [ ] lesson-pdfs
- [ ] assignment-submissions
- [ ] course-resources
- [ ] school-branding
- [ ] report-cards

### ⚡ Edge Functions
- [ ] paystack-webhook
- [ ] create-live-session (Daily.co)
- [ ] generate-report-card
- [ ] ai-tutor-chat (Claude proxy)
- [ ] send-email (Resend)
- [ ] send-sms (Termii)
- [ ] create-paystack-link

### 🔄 Realtime Channels
- [ ] messages table → MessagesPage
- [ ] notifications table → NotificationCenter
- [ ] live_sessions table → LiveClassesPage
- [ ] attendance_records table → InClassAttendancePage

### 🌐 Third-party Accounts & Keys
- [x] Supabase project created
- [ ] Paystack account + test keys
- [ ] Daily.co account + API key
- [ ] Resend account + API key
- [ ] Termii account (or Africa's Talking) + API key
- [ ] Claude API key (for AI Tutor — Phase 6)

### 🔧 Frontend Wiring (src/lib/)
- [x] supabase.ts — client created
- [ ] auth.ts — login, signup, logout, session helpers
- [ ] schools.ts — school lookup by code
- [ ] users.ts — profile CRUD
- [ ] courses.ts — course/lesson queries
- [ ] assignments.ts — assignment CRUD + submissions
- [ ] attendance.ts — mark + read attendance
- [ ] messages.ts — send + subscribe to messages
- [ ] notifications.ts — read + subscribe
- [ ] fees.ts — invoices + payment link
- [ ] reports.ts — grade summaries + report cards

### 🚀 Vercel Environment Variables
- [x] VITE_SUPABASE_URL
- [x] VITE_SUPABASE_ANON_KEY
- [ ] (Edge Functions only — stored in Supabase secrets, not Vercel)

---

## What Goes Where — Quick Reference

```
User opens app
  └─ Supabase Auth  →  JWT with role + school_id
  └─ profiles table →  name, avatar, class

Student views courses
  └─ courses + modules + lessons tables
  └─ lesson_progress (last position, completed)
  └─ Storage: lesson-videos / lesson-pdfs

Teacher marks attendance
  └─ attendance_records INSERT
  └─ Realtime → parent app notification

Parent pays fees
  └─ invoices READ (what's owed)
  └─ Edge Fn: create-paystack-link → redirect to Paystack
  └─ Paystack webhook → Edge Fn: mark invoice paid + create payment record
  └─ send-sms Edge Fn → receipt to parent's phone

Admin publishes results
  └─ grade_summaries READ
  └─ Edge Fn: generate-report-card → PDF → Storage: report-cards
  └─ report_cards status → published
  └─ notifications INSERT → students + parents

Teacher starts live class
  └─ Edge Fn: create-live-session → Daily.co room URL
  └─ live_sessions INSERT with room URL
  └─ Realtime → students see "class is live"

Student chats with AI Tutor
  └─ ai_messages INSERT (user message)
  └─ Edge Fn: ai-tutor-chat → Claude API → response
  └─ ai_messages INSERT (assistant response)

Super Admin checks platform MRR
  └─ platform_schools READ (no school_id filter — service role)
  └─ payments aggregate (SUM per school per term)
```

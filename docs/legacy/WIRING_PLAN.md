# Learnora — Wiring Plan
_Cross-check: PROJECT.md × App.tsx × page files × schema.sql_
_Created: 2026-06-23. Do not start building until approved._

---

## How to read this

- **Section 1 — Missing pages:** Referenced in nav/PROJECT.md but no route exists yet.
- **Section 2 — Built but not wired:** Page file exists, route registered, but data is hardcoded/mock. CAN be connected to existing Supabase tables.
- **Section 3 — Needs schema:** Page requires a new column or table before it can be wired. **Needs your approval before any DB object is created.**
- **Section 4 — Intentionally left as scaffold:** Out-of-scope per your instructions. Not touched.

---

## Section 1: Missing Pages

Only **one** page exists in PROJECT.md with a clear MVP phase but no route in App.tsx:

| Screen | PROJECT.md | Gap | Action |
|--------|-----------|-----|--------|
| Report Card Generator [T] | 16.13 · Phase 5 | No teacher-side route. `/admin-results` is admin-only. Teachers need read-only report card access for their classes. | **Flag only — needs Figma design before building (per CLAUDE.md)** |

Everything else referenced in all five nav bars has a registered route. No other missing pages.

---

## Section 2: Built but not wired

Grouped into batches matching the build order I'd suggest. Each item maps to existing Supabase tables — no schema changes needed.

### Batch A — Explicitly requested (high priority)

| # | Page/File | What's wrong | Fix | Tables |
|---|-----------|-------------|-----|--------|
| A1 | `AdminDashboardPage` | "Attendance Rate" stat hardcoded `—` | Query today's attendance_records for school; calculate `present / total` | `attendance_records` |
| A2 | `AdminDashboardPage` | "Finance" in Module Overview hardcoded `—` | Query invoices; sum outstanding (status='unpaid') amount | `invoices` |
| A3 | `ReportBuilderPage` | All 4 data arrays (`gradeRows`, `attendanceRows`, `feeRows`, `enrollmentRows`) are hardcoded mock objects — no supabase import exists in this file | Replace with live queries that match the `reportType` filter; reuse same Export CSV logic | `grade_summaries`, `attendance_records`, `invoices`, `class_enrollments` |
| A4 | `LiveClassesOverviewPage` | No supabase import — full scaffold | Wire the session listing to `live_sessions` filtered by student's enrolled class_ids; leave "Join" button and video room as scaffold | `live_sessions`, `class_enrollments` |
| A5 | `AssignmentsPage` + `AssignmentDetailsPage` | Submission is text-only; `submission_url` column already exists on `assignment_submissions` table | Add file picker + upload to Supabase Storage bucket `assignment-submissions/{school_id}/{assignment_id}/`, store URL in `submission_url` | `assignment_submissions` · Storage bucket `assignment-submissions` |

> ✅ **PaymentSuccessPage** — already wired (reads child name + school from DB, ref from sessionStorage). No work needed.

### Batch B — Super Admin mock → real

All 5 pages in this batch have no supabase calls — they render hardcoded arrays or empty state.

| # | Page/File | What's mock | Fix | Tables |
|---|-----------|------------|-----|--------|
| B1 | `BroadcastPage` | No supabase; "Sent Messages" is empty `[]` | Wire send to `announcements` INSERT with `school_id = null` (platform-wide); list past broadcasts | `announcements` |
| B2 | `FeatureFlagsPage` | `initialFlags` is a hardcoded array of 8 fake flags | Load flags from `feature_flags` per school; toggle updates flag; create new flags | `feature_flags` |
| B3 | `SupportTicketsPage` | `const tickets: Ticket[] = []` — always empty | Load from `support_tickets` across all schools (super_admin view); allow status updates | `support_tickets` |
| B4 | `PlatformBillingPage` | Hardcoded stats (`const stats = [...]`) and empty invoices array | Load from `platform_schools` (MRR, plan, status per school) + aggregate invoices | `platform_schools`, `invoices` |
| B5 | `PlatformSettingsPage` | No supabase calls | Wire "Save" to update the super-admin's own `platform_schools` row for global config; falls back to static UI if no row exists | `platform_schools` |

> **SchoolDetailPage** — partially wired (has real queries) but falls back to hardcoded `name: 'Greenfield Academy'` if DB returns null. Fix: use loading state instead of hardcoded fallback. Minor one-liner.

### Batch C — Teacher/Student mock → real

| # | Page/File | What's mock | Fix | Tables |
|---|-----------|------------|-----|--------|
| C1 | `StudentDetailViewPage` | Entire page hardcoded: `const student = { name: 'Daniel Aliyu', class: 'SS2A', ... }` + hardcoded `subjectScores[]` and `attendanceMonths[]` | Read student_id from sessionStorage (`learnora_selected_student`); query real profile + grade_summaries + attendance_records | `profiles`, `grade_summaries`, `attendance_records` |
| C2 | `DownloadsPage` | `const videos = [...]` and `const pdfs = [...]` hardcoded | Load from `course_resources` (type='video' / 'pdf') for student's enrolled courses | `course_resources`, `class_enrollments` |

### Batch D — Settings (two stay localStorage; one needs schema)

| # | Page/File | Current state | Decision |
|---|-----------|--------------|---------|
| D1 | `AppearanceSettingsPage` | Saves theme/font/compact to localStorage | **Acceptable as-is** — theme is device-local preference; no schema change needed. Mark ✓ done. |
| D2 | `PrivacySettingsPage` | Saves toggles to localStorage | **Acceptable as-is** until `profiles.privacy_settings` column exists (see Section 3, S3). No code change now. |
| D3 | `NotificationSettingsPage` | Saves toggles to localStorage only | **Needs schema** to persist across devices — see Section 3, S2 below. |

---

## Section 3: Needs schema — STOP, awaiting your approval

### S1 — `invoices.paystack_reference TEXT` ⚠️ CRITICAL

The Paystack webhook at `supabase/functions/paystack-webhook/index.ts` finds invoices via:
```
.eq('paystack_reference', reference)
```
But `invoices` in schema.sql has **no `paystack_reference` column** — only `payments` does.
This means the webhook cannot currently match an incoming Paystack callback to an invoice.

**Proposed SQL (already in HANDOFF.md as pending):**
```sql
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paystack_reference TEXT;
CREATE INDEX IF NOT EXISTS idx_invoices_paystack_ref ON invoices(paystack_reference);
```

**Also needs a corresponding update in `PaymentReviewPage`** to write the reference to `invoices.paystack_reference` at the moment the Paystack popup is opened (before the webhook fires).

> **Question: Has this SQL already been run in the live Supabase DB?**
> If yes → I update schema.sql to document it and wire `PaymentReviewPage`.
> If no → SQL needs to be run first, then I wire the code.

---

### S2 — `profiles.notification_prefs JSONB` (for NotificationSettingsPage)

`NotificationSettingsPage` currently saves 6 toggles to `localStorage` only — prefs are lost on sign-in from a different device.

**Proposed SQL:**
```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_prefs JSONB
  DEFAULT '{"email":true,"push":true,"sms":false,"announcements":true,"grades":true,"attendance":true}'::jsonb;
```

With this column, the page reads prefs on mount from `profiles` (falls back to localStorage if null) and saves back to `profiles` on toggle.

> **Approve this? Yes / No (localStorage-only is acceptable for now)**

---

### S3 — `profiles.privacy_settings JSONB` (for PrivacySettingsPage) — optional

`PrivacySettingsPage` currently saves 4 toggles (Show Profile, Activity Visibility, etc.) to localStorage. Cross-device persistence would require:

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS privacy_settings JSONB
  DEFAULT '{"show_profile":true,"allow_messages":true,"activity_visible":true}'::jsonb;
```

> **Approve this? Yes / No (localStorage-only is acceptable)**

---

## Section 4: Intentionally left as scaffold

These are **not touched** per your out-of-scope instruction.

### Phase 6 AI (all — no AI backend wired)
`ai-assistant`, `ai-tutor`, `ai-chat`, `ai-flashcards`, `ai-study-plan`, `ai-quiz`, `ai-upload`, `ai-saved`, `ai-image-solver`, `ai-exam-prep`, `ai-recommendations`, `ai-grading`

### Video/WebRTC (no provider configured)
`live-classroom`, `pre-class-lobby`, `screen-share`, `participants-panel`, `whiteboard`

### External-blocked
- `plagiarism-check` — needs third-party API
- `connected-devices` — needs Supabase Admin API (server-side only)
- `linked-accounts` — needs OAuth provider setup

### No table / no design (Phase 6 or Post-MVP)
`study-consistency`, `academic-goals`, `leaderboard`, `achievements`, `certificates`, `academic-history`, `study-planner` (no `study_plans` table), `discussion-forum` (no `forum_posts` table), `permission-slips` (no `permission_slips` table), `plans-pricing` (no `platform_plans` table), `email-templates` (no `email_templates` table), `audit-logs` (no `audit_logs` table)

---

## Build order (after your approval)

```
Batch A  → Admin stats + Report Builder + Live Classes + File Upload   (high impact, user-requested)
Batch B  → Super Admin 5 pages                                          (clean up mock data)
Batch C  → StudentDetailView + Downloads                                (teacher UX)
Batch D  → NotifSettings (only if S2 schema approved)
Schema   → S1 paystack fix (critical), S2/S3 if approved
Misc     → SchoolDetailPage Greenfield fallback fix (one-liner)
```

Total estimated work: ~12 files touched, 0 new files, 1–3 SQL ALTER statements.

---

## Your decisions needed

1. **S1 (paystack_reference on invoices):** Has the HANDOFF.md SQL been run already? → I wire code or SQL-first.
2. **S2 (notification_prefs):** Approve schema change? Or leave localStorage-only?
3. **S3 (privacy_settings):** Approve schema change? Or leave localStorage-only?
4. **Report Card Generator (Section 1):** Provide Figma design when ready — not building without it.
5. **Batch order:** Confirm you want Batch A first before I start, or reorder.

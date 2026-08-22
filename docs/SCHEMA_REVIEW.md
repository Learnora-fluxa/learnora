# Learnora Schema and Relationship Review

_Reviewed: August 7, 2026_

## Summary

The current schema is a strong SaaS LMS baseline, but there are a few structural issues that will become painful as Learnora adds a dedicated AI assistant, richer finance workflows, and stronger parent/admin orchestration.

This review focuses on flaws that affect the MVP foundation, not cosmetic normalization.

## High-Priority Flaws

### 1. Role integrity is implied, not enforced

Tables such as `parent_student_links`, `class_enrollments`, and `teacher_assignments` reference `profiles(id)` but do not enforce that the linked profile actually has the correct role.

Examples:

- a non-parent can be inserted into `parent_student_links.parent_id`
- a non-student can be inserted into `class_enrollments.student_id`
- a non-teacher can be inserted into `teacher_assignments.teacher_id`

Recommended fix:

- add database constraints through trigger-based role validation or move to role-specific membership guard functions
- add service-layer validation in NestJS immediately

### 2. Cross-tenant consistency is not fully protected by foreign keys

Many tables include `school_id`, but foreign keys do not guarantee that the related rows belong to the same school.

Examples:

- `assignments.school_id` can drift from `class_id` or `teacher_id`
- `payments.school_id` can drift from `invoice_id`
- `messages.school_id` can drift from `conversation_id`

Recommended fix:

- add service-layer checks now
- plan composite or trigger-based integrity checks for high-risk tables

### 3. Finance model is too thin for a real payment lifecycle

The current base schema has `fee_structures`, `invoices`, and `payments`, but the expanded TDD expects a stronger finance domain.

Gaps:

- no `receipts` table
- no `payment_transactions` table
- no explicit `paid_amount` or running balance on invoices
- no refund model
- invoice reference handling is incomplete in the base schema

Impact:

- harder reconciliation
- harder auditability
- weaker parent payment history

### 4. AI data model is too student-only

Current AI tables:

- `ai_sessions`
- `ai_messages`

Problems:

- `ai_sessions.student_id` assumes only student AI use
- no support for teacher, parent, or admin assistant sessions
- no trace model for prompts, retrieval sources, costs, or safety decisions

Recommended direction:

- replace `student_id` with `user_id`
- add `assistant_type`
- add `ai_runs` or `ai_traces`
- add optional retrieval source references

### 5. Conversation model lacks explicit audit and delivery state

The shared conversation model is a solid start, but it is still minimal.

Gaps:

- no read receipts table
- no delivery state model
- no soft delete/archive controls
- no attachment metadata table

This is acceptable for early MVP, but it should be acknowledged as intentional.

## Medium-Priority Flaws

### 6. `announcements.school_id` is mandatory, which conflicts with platform-wide broadcast use cases

The schema currently requires `school_id NOT NULL`, but platform broadcasts in a super-admin context often want cross-tenant announcements.

Recommended options:

- allow nullable `school_id` for platform-wide broadcasts
- or create `platform_announcements`

### 7. `grade_summaries.position_in_class` is under-modeled

Class ranking depends on class and term context, but `grade_summaries` does not include `class_id`.

That makes `position_in_class` ambiguous in multi-class subject contexts.

### 8. `report_cards` are missing authoring metadata

Useful future columns:

- `generated_by`
- `published_by`
- `version`
- `summary_json`

### 9. Calendar events are school-wide only

`calendar_events` lacks clear scoping for:

- class-specific events
- role-specific visibility
- student-specific deadlines generated from assignments

### 10. Notifications are too generic for analytics and multi-channel orchestration

Current table is fine for in-app notifications, but not enough for channel-aware delivery tracking.

Future additions:

- channel
- status
- sent_at
- provider_message_id
- dedupe_key

## Recommended Model Direction For AI Assistant

For the MVP assistant foundation, prefer:

```text
ai_sessions
  id
  school_id
  user_id
  assistant_type
  title
  subject_id
  course_id
  created_at

ai_messages
  id
  session_id
  school_id
  role
  content
  created_at

ai_runs
  id
  session_id
  school_id
  user_id
  model
  prompt_version
  input_tokens
  output_tokens
  cost
  status
  created_at
```

## Recommended Order Of Fixes

1. Harden service-layer validation for role and school consistency in the new Nest API.
2. Fix finance lifecycle modeling before expanding parent payments.
3. Generalize AI entities from student-only to role-aware.
4. Clarify broadcast announcement modeling.
5. Add message and notification delivery audit models when operationally needed.

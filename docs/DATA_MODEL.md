# Learnora Data Model

## 1. Data Model Goals

- Enforce strict multi-tenancy
- Support all five user roles as first-class actors
- Model parent-child relationships cleanly
- Keep finance, messaging, and AI auditable

## 2. Tenant Boundary

Every school-owned entity should carry a `school_id` and be protected by row-level security. Platform-owned entities for super admin operations may exist outside tenant scope when required.

## 3. Core Entity Groups

### Identity and Roles

- `schools`
- `profiles`
- `parent_student_links`

Key rule:
One parent can be linked to multiple students, and one student can be linked to multiple guardians.

### Academic Structure

- `terms`
- `classes`
- `subjects`
- `class_enrollments`
- `teacher_assignments`

### Teaching and Learning

- `courses`
- `modules`
- `lessons`
- `course_resources`
- `assignments`
- `assignment_submissions`
- `grades`
- `grade_summaries`
- `attendance_records`
- `live_sessions`
- `session_recordings`

### Parent Engagement

- `report_cards`
- `notifications`
- `announcements`
- parent-facing message access through shared conversation tables

### Messaging

- `conversations`
- `conversation_members`
- `messages`

### Finance

- `fee_structures`
- `invoices`
- `payments`
- `receipts`
- `payment_transactions`

### AI Platform

- `ai_sessions`
- `ai_messages`
- AI audit or usage tables as the orchestration layer matures

## 4. Key Relationships

### Parent to Student

```text
Parent -> ParentStudentLink -> Student
```

This relationship is the backbone for parent dashboards, report cards, attendance alerts, and payment visibility.

### Teacher to Class to Student

```text
Teacher -> TeacherAssignment -> Class -> ClassEnrollment -> Student
```

This relationship drives attendance, grading, assignments, and messaging scope.

### Finance Ownership

```text
FeeStructure -> Invoice -> Payment -> Receipt
```

Invoices belong to a student within a tenant. Parent access is derived through the linked child, not through direct invoice ownership.

## 5. Ownership Rules

- `profiles` owns role identity and user metadata
- `class_enrollments` is the source of truth for student-class membership
- `teacher_assignments` is the source of truth for teacher teaching scope
- `parent_student_links` is the source of truth for parent visibility
- `invoices` is the source of truth for fee obligations
- `messages` must always resolve through membership tables or explicitly bounded direct-message rules

## 6. Required Data Design Principles

### Tenant Isolation

Every query, mutation, and generated artifact must be tenant-aware.

### Auditability

Payments, grading, and AI outputs should be traceable.

### Minimal Duplication

Use summaries and denormalized reporting tables only where query performance or reporting needs justify them.

### Future Readiness

The schema should support:

- multiple guardians
- installment plans
- school-specific payment settings
- role-specific AI logs
- school-level analytics rollups

## 7. Notable Additions From the Expanded TDD

The expanded TDD reinforces the need for these entities or capabilities:

- stronger parent-student linking
- finance-specific tables for transactions and receipts
- shared messaging entities instead of role-specific message silos
- richer notification and announcement ownership
- AI auditability and recommendation support

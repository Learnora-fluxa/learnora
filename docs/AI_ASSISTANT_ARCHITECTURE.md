# Learnora AI Assistant Architecture

_Updated: August 7, 2026_

## 1. Purpose

This document defines the architecture for the Learnora AI Assistant.

The Learnora AI Assistant is not a collection of disconnected bots. It is one intelligent, governed AI system that serves different users according to:

- role
- permissions
- school tenancy
- data scope
- current product context

## 2. Core Principle

Learnora should have one AI platform and one assistant system, with role-aware behavior.

That means:

- one orchestration layer
- one retrieval layer
- one safety and policy layer
- one logging and audit layer
- one cost and usage control layer

But different user experiences for:

- students
- teachers
- parents
- school admins
- super admins where appropriate

## 3. Product Model

### One assistant, multiple modes

The assistant should behave like one platform capability with role-specific modes.

```text
Learnora AI Assistant
  -> Student mode
  -> Teacher mode
  -> Parent mode
  -> Admin mode
  -> Super-admin mode (restricted)
```

These are not separate products. They are scoped operating modes of the same assistant system.

## 4. Architecture Overview

```text
Web Client
  -> AI Assistant UI
  -> API Client
        |
        v
NestJS API
  -> Auth and RBAC
  -> AI Orchestrator
  -> Retrieval Service
  -> Tool Router
  -> Audit and Usage Logging
        |
        v
AI Infrastructure
  -> LLM provider
  -> pgvector retrieval
  -> approved school data
  -> document and curriculum context
```

## 5. Request Lifecycle

Every assistant request should follow the same lifecycle.

```text
1. User sends prompt
2. Identity is verified
3. Role and permission scope are resolved
4. School tenant is resolved
5. Context filters are applied
6. Retrieval sources are selected
7. Prompt policy is selected
8. Optional tools are invoked
9. Response is generated
10. Safety checks are applied
11. Response is logged
12. Response is returned
```

## 6. Role-Based Capability Model

### Student Mode

The student assistant helps with learning and study support.

Allowed capabilities:

- explain topics
- summarize lessons
- generate flashcards
- generate quizzes
- produce study plans
- answer questions from approved materials
- provide exam revision help

Disallowed behavior:

- revealing another student's data
- inventing grades
- modifying official records
- exposing teacher-only comments unless policy allows it

### Teacher Mode

The teacher assistant helps with instruction and classroom support.

Allowed capabilities:

- generate lesson ideas
- generate quizzes and assignments
- create rubrics
- suggest class interventions
- summarize student or class performance
- help draft report comments
- recommend revision activities

Disallowed behavior:

- cross-school access
- exposure of private admin billing data
- unsafely auto-finalizing grades without teacher review

### Parent Mode

The parent assistant helps parents understand and support their child's learning.

Allowed capabilities:

- explain report cards
- summarize child performance
- identify weak subjects
- explain attendance trends
- suggest at-home support activities
- explain upcoming exams or assignments

Disallowed behavior:

- access to children not linked to the parent
- access to internal teacher-only or admin-only data
- generating new grades or official decisions

### Admin Mode

The admin assistant helps school operators interpret school data and workflows.

Allowed capabilities:

- summarize school trends
- identify risk areas
- summarize attendance and engagement patterns
- explain operational metrics
- draft announcements and reports

Disallowed behavior:

- cross-tenant access
- unrestricted platform-level financial or infrastructure insights unless specifically allowed

### Super Admin Mode

This mode should be limited and carefully governed.

Allowed capabilities:

- summarize platform usage
- identify operational issues
- assist with support and rollout communication

Disallowed behavior:

- exposing private tenant data without explicit policy and entitlement

## 7. Permission and Scope Rules

The assistant must never rely only on a frontend role label.

The backend must enforce:

- authenticated identity
- role
- school_id
- object-level scope
- relationship scope

### Scope examples

#### Student

Can access:

- own progress
- own assignments
- own course content
- own AI history

Cannot access:

- another student's data
- staff-only reports

#### Teacher

Can access:

- assigned classes
- assigned students
- assigned subjects
- teacher-owned content

Cannot access:

- unrelated classes
- another teacher's private workflow data unless explicitly shared

#### Parent

Can access:

- linked children
- child attendance
- child performance
- child invoices where applicable

Cannot access:

- unrelated children
- staff-only analysis

## 8. Retrieval Rules

The assistant should use retrieval-augmented generation, but only from approved sources.

### Approved retrieval sources

- course content
- lesson notes
- uploaded materials
- assignments
- grade summaries
- attendance summaries
- report cards
- school announcements
- timetable and calendar data
- school policy documents
- approved curriculum content

### Retrieval constraints

- all retrieval must be tenant-scoped
- all retrieval must be role-scoped
- all retrieval must be object-scoped where necessary
- raw internal notes should only be included if policy allows them

### Suggested vector strategy

Use `pgvector` inside PostgreSQL for MVP.

Candidate embedding sources:

- lessons
- uploaded documents
- curriculum references
- report comments
- announcement archives

## 9. Prompting and Policy Layer

The AI platform should select prompts based on mode and task.

### Prompt dimensions

- role
- task type
- school policy mode
- age or grade band where relevant
- safety level

### Example task types

- explain
- summarize
- recommend
- generate quiz
- generate rubric
- parent summary
- report explanation
- intervention suggestion

The system prompt should also explicitly state:

- do not invent school facts
- do not fabricate grades
- do not exceed authorized scope
- say when information is missing

## 10. Tooling Model

The assistant should support tool-based workflows over time.

### Initial tools

- retrieval tool
- student performance summary tool
- attendance summary tool
- invoice summary tool
- assignment and quiz generation tool

### Later tools

- OCR
- rubric generator
- grading assistant
- recommendation engine
- notification drafting tool
- report-card explanation tool

## 11. Backend Module Design

The new NestJS backend should own AI orchestration.

### Recommended AI module structure

```text
apps/api/src/modules/ai/
  ai.module.ts
  ai.controller.ts
  ai.service.ts
  ai-orchestrator.service.ts
  ai-policy.service.ts
  ai-retrieval.service.ts
  ai-tools.service.ts
  prompts/
    student.prompts.ts
    teacher.prompts.ts
    parent.prompts.ts
    admin.prompts.ts
```

### Responsibilities

#### `ai.controller`

- receives assistant requests
- validates request payloads
- delegates to orchestrator

#### `ai-orchestrator.service`

- resolves mode
- chooses prompt policy
- invokes retrieval and tools
- coordinates final response generation

#### `ai-policy.service`

- enforces role and permission policy
- filters unsafe requests
- applies guardrails

#### `ai-retrieval.service`

- fetches approved structured context
- performs vector lookup
- formats grounding context

#### `ai-tools.service`

- runs AI-adjacent tools safely
- encapsulates deterministic operations

## 12. Data Model Changes Needed

The current AI schema is too student-specific.

### Current issue

`ai_sessions.student_id` assumes AI is only for students.

### Recommended MVP model

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
  school_id
  session_id
  user_id
  assistant_type
  model
  prompt_version
  task_type
  input_tokens
  output_tokens
  estimated_cost
  status
  created_at
```

### Optional future tables

```text
ai_run_sources
  id
  run_id
  source_type
  source_id
  source_label

ai_feedback
  id
  run_id
  user_id
  rating
  feedback
  created_at
```

## 13. Safety Rules

The assistant must be safe by design.

### Mandatory safety rules

- never fabricate grades, payments, or attendance
- never access cross-tenant data
- never ignore role-based limits
- never finalize sensitive actions without human confirmation
- always indicate uncertainty when context is missing

### Sensitive response areas

- report cards
- academic interventions
- fee/payment status
- disciplinary or behavior summaries
- health or child-safeguarding issues if introduced later

## 14. Observability and Audit

Every AI request should be measurable.

### Minimum logging

- user_id
- school_id
- assistant_type
- task_type
- model used
- token usage
- latency
- outcome status

### Recommended traceability

- prompt version
- retrieval source count
- safety decision flag
- tool invocation summary

## 15. MVP Scope

The MVP assistant should stay narrow enough to be reliable.

### MVP features to build first

- student explain/summarize/study-help
- teacher quiz and lesson-help
- parent progress explanation
- role-aware assistant endpoint
- session and message persistence
- usage logging

### Features to defer slightly

- fully automated grading
- advanced OCR pipelines
- multi-step agent workflows
- cross-system admin intelligence

## 16. Frontend Integration

The web app should call the assistant through the API, not directly from page components to model providers.

### Web responsibilities

- collect user prompt
- send role and context hints
- render response
- render citations or grounded source references where useful
- show loading, failure, and safety states

### API responsibilities

- auth verification
- scope enforcement
- retrieval
- orchestration
- logging

## 17. Build Order

Recommended implementation order:

1. Create the assistant architecture and contracts.
2. Generalize AI schema from student-only to role-aware.
3. Add `POST /api/ai/assistant`.
4. Implement teacher, student, and parent modes first.
5. Add structured retrieval from approved school data.
6. Add usage logging and trace records.
7. Add vector retrieval with `pgvector`.
8. Expand tools and recommendation workflows.

## 18. Short Summary

Learnora should have one intelligent AI system, not separate disconnected assistants.

That system should:

- understand user role
- respect permissions
- stay inside tenant boundaries
- retrieve only approved data
- log every important interaction
- adapt its behavior by context

This gives Learnora one maintainable AI platform that can serve every role safely and consistently.

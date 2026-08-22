# Learnora Build Phases

_Updated: August 7, 2026_

## Purpose

This document gives a clear picture of:

- what has already been built
- what foundation work has already been introduced
- what comes next as Learnora progresses
- how the app structure evolves over time

It is meant to be the high-level progress map for the product and codebase.

## 1. Where Learnora Started

Learnora started as a Supabase-first LMS product with a single React + Vite frontend application.

### Initial structure

```text
learnora/
  src/
  public/
  supabase/
  android/
  ios/
```

### Initial architecture

- Frontend: React + Vite
- Backend/data platform: Supabase
- Auth: Supabase Auth
- Database: Supabase PostgreSQL
- Storage: Supabase Storage
- Realtime: Supabase Realtime
- Server-side workflows: Supabase Edge Functions

This helped the product move fast and made it possible to build many screens and workflows early.

## 2. What Has Already Been Built

The current application already includes substantial product coverage.

### Product surfaces already present

- Student flows
- Teacher flows
- Parent flows
- School admin flows
- Super admin flows

### Major working platform areas

- Authentication and onboarding
- Role-based routing
- Courses and lessons
- Assignments and submissions
- Grading workflows
- Attendance
- Messaging
- Notifications
- Parent fee flows
- Live class flows
- Admin and super admin dashboards

### Existing server-side integrations already in the repo

- Paystack webhook flow
- Daily live session token flow
- AI grading edge function

Relevant files:

- [`apps/web/src/App.tsx`](/Users/pecorian/Projects/Learnora/learnora/apps/web/src/App.tsx)
- [`supabase/schema.sql`](/Users/pecorian/Projects/Learnora/learnora/supabase/schema.sql)
- [`supabase/functions/paystack-webhook/index.ts`](/Users/pecorian/Projects/Learnora/learnora/supabase/functions/paystack-webhook/index.ts)
- [`supabase/functions/daily-token/index.ts`](/Users/pecorian/Projects/Learnora/learnora/supabase/functions/daily-token/index.ts)
- [`supabase/functions/ai-grading/index.ts`](/Users/pecorian/Projects/Learnora/learnora/supabase/functions/ai-grading/index.ts)

## 3. What Phase We Were In Before The New Foundation

Before the current architecture step, Learnora was effectively in:

### Phase A: Product-first build phase

Characteristics:

- one main frontend application
- Supabase-first backend strategy
- rapid screen and workflow delivery
- server-side logic split between frontend and Supabase functions

This phase was successful for speed, but it also created pressure in a few areas:

- privileged business logic was spreading across pages and edge functions
- AI orchestration did not yet have a central home
- payment and live-session workflows needed a stronger application layer
- the schema needed a relationship review before deeper expansion

## 4. What Phase We Are In Now

We are now in:

### Phase B: MVP foundation hardening

This is the phase where we keep the current product working, but start building the architecture that can support:

- AI assistant
- safer privileged workflows
- stronger domain boundaries
- background jobs
- better observability
- long-term SaaS scaling

### Work completed in this phase

The following foundation work has now been added:

- Vite frontend moved into [`apps/web`](/Users/pecorian/Projects/Learnora/learnora/apps/web)
- NestJS API scaffold in [`apps/api`](/Users/pecorian/Projects/Learnora/learnora/apps/api)
- root workspace preparation in [`package.json`](/Users/pecorian/Projects/Learnora/learnora/package.json)
- shared TypeScript base config in [`tsconfig.base.json`](/Users/pecorian/Projects/Learnora/learnora/tsconfig.base.json)
- frontend environment example in [`apps/web/.env.example`](/Users/pecorian/Projects/Learnora/learnora/apps/web/.env.example)
- API environment contract updates in [`apps/api/.env.example`](/Users/pecorian/Projects/Learnora/learnora/apps/api/.env.example)
- repo foundation guide in [`docs/REPO_FOUNDATION_PLAN.md`](/Users/pecorian/Projects/Learnora/learnora/docs/REPO_FOUNDATION_PLAN.md)
- schema review in [`docs/SCHEMA_REVIEW.md`](/Users/pecorian/Projects/Learnora/learnora/docs/SCHEMA_REVIEW.md)

### Current structure

```text
learnora/
  apps/
    web/
    api/
  docs/
  supabase/
  android/
  ios/
```

## 5. What We Have Learned About The Current App Structure

The current Learnora app structure is strong for feature velocity, but it needs clearer boundaries as the product grows.

### Current role of the frontend

Today, the frontend does all of these:

- renders product UI
- talks directly to Supabase for most reads
- performs some workflow orchestration
- owns some logic that should eventually become backend-owned

### Current role of Supabase

Supabase currently acts as:

- auth provider
- primary database
- storage system
- realtime backbone
- partial server-side application layer

### New direction

We are now operating with this split:

- Supabase as platform infrastructure
- NestJS as application layer
- React web app as client layer

## 6. App Structure Vision

As Learnora progresses, the intended repo structure becomes:

```text
learnora/
  apps/
    web/
    api/
  supabase/
  docs/
  android/
  ios/
```

### Responsibility split in the target structure

#### `apps/web`

- student, teacher, parent, admin, and super admin UI
- user-scoped reads
- API integration layer
- AI assistant interface

#### `apps/api`

- privileged workflows
- payment orchestration
- Daily live-session orchestration
- AI assistant orchestration
- invitation and access-sensitive flows
- future queues, jobs, and integrations

#### `supabase`

- auth
- postgres
- storage
- realtime
- migrations
- pgvector later for AI retrieval

## 7. The Phases Ahead

### Phase B1: Backend scaffold and schema review

Status: in progress

Goals:

- create backend app scaffold
- review model and entity relationships
- clarify migration direction

Completed:

- API scaffold created
- `apps/web` and `apps/api` separated
- schema review documented

### Phase B2: Privileged flow migration

Goals:

- move payment webhook and payment init flow behind API
- move Daily token generation behind API
- move AI grading and AI assistant orchestration behind API
- start using a dedicated API client from the frontend

Expected result:

- the frontend stops owning sensitive workflow orchestration

### Phase B3: Web integration cleanup

Goals:

- add `apps/web/src/lib/api.ts`
- add typed API clients
- move workflow logic out of page components
- continue reducing page-level orchestration inside `apps/web`

Expected result:

- cleaner frontend architecture
- reduced page-level orchestration logic

### Phase B4: Repo restructuring

Goals:

- convert the repo into a true app workspace structure
- isolate build concerns between web and api

Expected result:

```text
learnora/
  apps/
    web/
    api/
```

### Phase C: AI assistant foundation

Goals:

- create `POST /api/ai/assistant`
- generalize AI schema beyond student-only sessions
- add role-aware AI orchestration
- introduce traceability for prompts, responses, and costs
- prepare RAG with pgvector

Expected result:

- AI becomes a governed platform capability instead of scattered feature code

### Phase D: Jobs, observability, and scale readiness

Goals:

- add Redis + BullMQ
- add Sentry and OpenTelemetry
- create background processing for AI, reports, notifications, and payment reconciliation
- improve operational visibility

### Phase E: Domain maturity

Goals:

- strengthen finance model
- strengthen messaging and notification auditability
- refine parent, admin, and teacher domain boundaries
- improve school-wide and platform-wide reporting

## 8. Current Immediate Priorities

The next practical steps are:

1. Install and boot the new API dependencies.
2. Replace decode-only token handling with real Supabase JWT verification.
3. Move the Paystack webhook into the NestJS API.
4. Move the Daily token flow into the NestJS API.
5. Define the AI assistant request and response contract.
6. Add a frontend API client layer.
7. Evolve the AI schema to support all assistant roles.

## 9. Structural Risks We Are Intentionally Managing

These are the main risks we are addressing early:

- business logic spread across page components
- too much privileged workflow logic outside a dedicated backend
- student-only AI modeling
- finance model gaps for receipts and transaction history
- weak role integrity in some relationship tables
- repo growth without clear domain boundaries

## 10. Short Summary

Learnora has already completed the fast product-build phase successfully.

We are now in the foundation-hardening phase:

- keep the current app running
- introduce a real backend layer
- tighten the model
- prepare the AI assistant properly
- gradually reshape the repo into a cleaner `web + api` workspace

That is the picture of the app structure as it stands today and where it is going next.

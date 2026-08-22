# Learnora Technical Design

## 1. Purpose

This document translates the expanded Learnora TDD into an actionable technical design for a multi-tenant SaaS platform.

## 2. Design Goals

- Serve multiple schools safely under strict tenant isolation
- Support five first-class user roles
- Allow product modules to evolve independently
- Centralize AI safety, retrieval, and audit controls
- Support mobile-heavy parent and student usage patterns
- Keep the current single-repo application shippable while enabling modular growth

## 3. System Context

Learnora consists of role-based application surfaces backed by shared platform services.

### Application Surfaces

- Teacher portal
- Student portal
- Parent portal
- School admin portal
- Super admin portal

### Shared Platform Services

- Authentication and identity
- Core API and domain services
- Messaging and notifications
- Finance and payments
- Analytics
- AI orchestration
- Background jobs

## 4. Core Domains

### School Management

Owns school setup, academic structures, billing configuration, and role administration.

### Teaching and Learning

Owns courses, lessons, assignments, quizzes, grading, attendance, and live classroom workflows.

### Parent Engagement

Owns parent-child relationships, parent dashboards, payment visibility, messaging, and family notifications.

### Artificial Intelligence

Owns prompt orchestration, retrieval, model access, evaluation, rate limits, and AI audit logs.

### Platform and Infrastructure

Owns tenancy, identity, storage, observability, background execution, and operational controls.

## 5. Logical Architecture

```text
Client Applications
  teacher | student | parent | admin | super-admin
            |
            v
        API / BFF Layer
            |
  -----------------------------
  |     |      |      |       |
  v     v      v      v       v
Auth  Core   AI    Events   Jobs
      Domain Service Bus  Workers
            |
            v
      Postgres + Storage
```

## 6. Current-State Implementation

The current repository implements most role-based functionality inside a single React + Vite application backed by Supabase:

- Supabase Auth for authentication
- Postgres for relational data
- Storage for uploads
- Realtime for messaging and collaboration
- Edge Functions for webhooks and service integrations

This is a valid v1 architecture and should remain the delivery vehicle until modular extraction creates clear operational value.

## 7. Target-State Architecture

The TDD describes a target state with clearer domain boundaries.

### Applications

- `teacher-web`
- `student-web`
- `parent-web`
- `admin-web`
- `super-admin-web`

### Current Repository Applications

- `apps/web`
- `apps/api`
- `supabase` infrastructure assets

### Service Layer

- assessment service
- grading service
- recommendation service
- communication service
- reporting service

The platform does not need to become microservices immediately. These boundaries can first be expressed as internal modules within `apps/api` and focused integration layers inside `apps/web`.

## 8. AI Orchestration Design

All AI requests should flow through a central orchestration layer.

### Responsibilities

- Route by role and use case
- Apply the correct system prompts
- Retrieve approved context
- Validate tenant scope
- Enforce safety rules
- Log prompts, outputs, cost, and outcomes
- Support fallback models and retries

### AI Agents

- Teacher Assistant
- Student Tutor
- Parent Assistant
- Assessment Generator
- Rubric Generator
- AI Grading
- OCR
- Recommendation Engine

## 9. Messaging and Notifications

Messaging should be a shared platform capability rather than separate implementations per role.

### Messaging Capabilities

- Direct conversations
- Group or class conversations
- Attachments
- Search
- Read receipts
- Conversation history

### Notification Channels

- In-app
- Email
- Push
- SMS where enabled

## 10. Finance Design

Finance is a dedicated domain, not a small parent feature.

### Responsibilities

- Fee structures
- Invoice generation
- Payment processing
- Receipts
- Refund handling
- Reporting

Parents should only access invoices associated with linked children.

## 11. Security and Compliance

- Row-level tenant isolation on all tenant-owned data
- Role-based route and action control
- Audit logs for sensitive actions
- Signed URLs or protected access for private files
- AI responses restricted to approved school data
- Payment webhooks verified server-side

## 12. Non-Functional Requirements

### Availability

- Core academic and communication workflows must remain available during school hours

### Scalability

- Support growth from a single-school deployment pattern to thousands of schools

### Performance

- Fast dashboard loads for each role
- Predictable file upload and retrieval
- Responsive messaging and notification delivery

### Observability

- Error logging
- Job monitoring
- Payment traceability
- AI usage and cost dashboards

## 13. Architectural Decisions

- Keep the current monolithic repo for delivery speed in the short term
- Enforce domain boundaries in code before splitting deployables
- Treat parent workflows as first-class, not future-state
- Centralize AI access and policy enforcement
- Prefer shared services for messaging, notifications, finance, and analytics

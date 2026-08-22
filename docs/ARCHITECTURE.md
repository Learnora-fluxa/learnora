# Learnora Architecture

## 1. Overview

This document bridges two truths:

- The current codebase is a single React application with Supabase-backed services
- The target platform should evolve toward clearer domain and application boundaries

## 2. Current Architecture

### Frontend

- Single React 19 + TypeScript + Vite application
- Route-based role separation for student, teacher, parent, admin, and super admin experiences
- Shared layouts and components for desktop and mobile-heavy surfaces

### Backend Platform

- Supabase Auth for identity and role bootstrapping
- Supabase Postgres for tenant data
- Supabase Storage for uploads and generated assets
- Supabase Realtime for messaging and collaboration
- Supabase Edge Functions for webhooks and privileged workflows

### Integrations

- Paystack for fees
- Daily.co for live classes
- Email and SMS integrations through server-side functions
- LLM integrations through controlled AI entry points

## 3. Target Architecture

### Client Layer

Separate app surfaces are recommended as the product grows:

- Teacher web
- Student web
- Parent web
- Admin web
- Super admin web

### Domain Layer

The code should be organized around these domains:

- Identity and access
- School management
- Teaching and learning
- Parent engagement
- Messaging and notifications
- Finance
- Analytics
- AI orchestration

### Platform Layer

- Postgres data platform
- Object storage
- Eventing and background jobs
- Monitoring and audit logging

## 4. Recommended Repository Direction

The current repository should evolve in stages:

### Stage 1

Keep one deployable app, but group code by domain and role more consistently.

### Stage 2

Keep separate `apps/web` and `apps/api` deployables, and only extract additional modules when operational boundaries clearly justify them.

### Stage 3

Split selected surfaces or services only where scale, release cadence, or operational isolation make it worthwhile.

## 5. Domain Ownership Model

### Identity and Access

Owns users, roles, sessions, tenant membership, and permission enforcement.

### School Management

Owns schools, terms, classes, subjects, rosters, and school configuration.

### Teaching and Learning

Owns courses, lessons, assignments, submissions, grades, attendance, and classroom workflows.

### Parent Engagement

Owns parent-child links, fee visibility, parent dashboards, and parent-facing communications.

### Finance

Owns fee structures, invoices, payments, receipts, and billing reports.

### AI Orchestration

Owns role-specific AI tools, retrieval, prompt policy, evaluation, and usage tracking.

## 6. Integration Patterns

### Synchronous

- User authentication
- Dashboard queries
- Assignment submission
- Payment initiation
- Messaging send and read flows

### Asynchronous

- Notifications fan-out
- Payment webhook confirmation
- Report card generation
- AI batch evaluation
- Recording processing

## 7. Key Architectural Constraints

- School data must remain tenant-scoped
- Parent access must be limited to linked students
- AI cannot access unapproved or cross-tenant context
- Sensitive actions require server-side enforcement, not frontend-only checks

## 8. Immediate Architecture Priorities

- Standardize module ownership in the frontend codebase
- Consolidate shared messaging and notification logic
- Formalize finance and parent data ownership
- Introduce an explicit AI orchestration boundary
- Maintain a clear separation between current-state implementation and target-state plans

# Learnora Repo Foundation Plan

_Updated: August 7, 2026_

## Goal

Create and maintain a clean `web + api` workspace for Learnora while giving privileged workflows and AI assistant orchestration a proper backend boundary.

## Current Approach

The repo now has explicit app boundaries:

- React + Vite app in `apps/web`
- NestJS API in `apps/api`
- Supabase for auth, data, storage, and realtime
- Supabase Edge Functions for selected server-side workflows

This foundation is good enough to ship features, but it is becoming too thin for payments, AI orchestration, invitations, and other privileged workflows.

## Incremental Foundation Strategy

### Step 1: Maintain separate web and api apps

- `apps/web`: frontend app with app-local env and dependencies
- `apps/api`: NestJS modular monolith scaffold with app-local env and dependencies

### Step 2: Move privileged flows first

Priority migrations from Supabase Edge Functions:

1. Paystack webhook
2. Daily live-session token generation
3. AI grading and assistant orchestration

### Step 3: Keep ordinary reads on Supabase temporarily

Direct user-scoped page reads can remain in the frontend during MVP hardening. We should only move them once the backend patterns are proven.

## Current Repo Layout

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

## Target Repo Layout

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

## Backend Modules To Build First

1. `health`
2. `auth`
3. `payments`
4. `live-classes`
5. `ai`
6. `users`
7. `academics`
8. `notifications`

## AI Assistant Build Direction

The first AI backend endpoint should be `POST /api/ai/assistant`.

It should eventually own:

- prompt policy
- role-specific prompt templates
- retrieval from approved school data
- safety filtering
- logging and traceability
- tool selection for grading, summaries, and recommendations

## Next Engineering Actions

1. Install the new backend dependencies and generate the API lockfile updates.
2. Add Supabase JWT verification instead of decode-only scaffolding.
3. Migrate `paystack-webhook` into the Nest `payments` module.
4. Migrate `daily-token` into the Nest `live-classes` module.
5. Design the AI assistant orchestration contract before wiring the UI.
6. Continue removing sensitive workflow orchestration from the frontend.

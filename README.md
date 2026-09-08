# Learnora

Learnora is a multi-tenant, AI-powered learning platform for schools. It brings together school administration, teaching and learning, parent engagement, finance, analytics, and AI-assisted workflows in a single product.

This repository is organized as a monorepo:

- `apps/web`: the React, TypeScript, and Vite frontend
- `apps/api`: the NestJS backend API
- `supabase/*`: schema, migrations, and edge functions
- `android/` + `ios/`: Capacitor native wrappers
- `docs/`: product, architecture, and operational references

## Documentation

Project documentation is organized in [`docs/README.md`](/Users/pecorian/Projects/Learnora/learnora/docs/README.md).

- [`docs/PRODUCT_REQUIREMENTS.md`](/Users/pecorian/Projects/Learnora/learnora/docs/PRODUCT_REQUIREMENTS.md): product goals, users, modules, and success metrics
- [`docs/TECHNICAL_DESIGN.md`](/Users/pecorian/Projects/Learnora/learnora/docs/TECHNICAL_DESIGN.md): technical design based on the expanded TDD
- [`docs/ARCHITECTURE.md`](/Users/pecorian/Projects/Learnora/learnora/docs/ARCHITECTURE.md): current-state and target-state architecture
- [`docs/DATA_MODEL.md`](/Users/pecorian/Projects/Learnora/learnora/docs/DATA_MODEL.md): core entities, relationships, and ownership boundaries
- [`docs/IMPLEMENTATION_ROADMAP.md`](/Users/pecorian/Projects/Learnora/learnora/docs/IMPLEMENTATION_ROADMAP.md): phased execution plan from the current codebase to the target platform
- [`docs/ENVIRONMENTS.md`](/Users/pecorian/Projects/Learnora/learnora/docs/ENVIRONMENTS.md): dev/prod environment setup for Supabase, Render, and Vercel

Legacy project references still in active use:

- [`docs/legacy/PROJECT.md`](/Users/pecorian/Projects/Learnora/learnora/docs/legacy/PROJECT.md)
- [`docs/legacy/SYSTEM_MAP.md`](/Users/pecorian/Projects/Learnora/learnora/docs/legacy/SYSTEM_MAP.md)
- [`docs/legacy/BACKEND.md`](/Users/pecorian/Projects/Learnora/learnora/docs/legacy/BACKEND.md)
- [`docs/legacy/WIRING_PLAN.md`](/Users/pecorian/Projects/Learnora/learnora/docs/legacy/WIRING_PLAN.md)
- [`docs/legacy/HANDOFF.md`](/Users/pecorian/Projects/Learnora/learnora/docs/legacy/HANDOFF.md)

## Stack

- React 19 + TypeScript + Vite
- Supabase Auth, Postgres, Storage, Realtime, and Edge Functions
- Capacitor for mobile packaging
- Daily.co for live classes

## Local Development

```bash
npm install
npm run dev
```

API development:

```bash
npm run dev:api
```

Frontend environment variables live in [`apps/web/.env.example`](/Users/pecorian/Projects/Learnora/learnora/apps/web/.env.example).

API environment variables live in [`apps/api/.env.example`](/Users/pecorian/Projects/Learnora/learnora/apps/api/.env.example).

See [`docs/ENVIRONMENTS.md`](/Users/pecorian/Projects/Learnora/learnora/docs/ENVIRONMENTS.md) for how local dev, Vercel, and Render are kept pointed at separate dev/prod Supabase projects so local work never touches production data.

Frontend env vars:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL`

## Notes

- The root [`package.json`](/Users/pecorian/Projects/Learnora/learnora/package.json) is a workspace orchestrator for `apps/web` and `apps/api`.
- The root [`capacitor.config.ts`](/Users/pecorian/Projects/Learnora/learnora/capacitor.config.ts) stays at the repository root because the Capacitor native projects are still in [`android`](/Users/pecorian/Projects/Learnora/learnora/android) and [`ios`](/Users/pecorian/Projects/Learnora/learnora/ios).
- The root [`supabase`](/Users/pecorian/Projects/Learnora/learnora/supabase) folder is infrastructure source, not frontend or API runtime code.

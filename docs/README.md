# Learnora Documentation

This folder contains the project documents created from the expanded Learnora TDD and aligned to the current repository.

## Core Documents

- [`PRODUCT_REQUIREMENTS.md`](/Users/pecorian/Projects/Learnora/learnora/docs/PRODUCT_REQUIREMENTS.md)
  Defines the product vision, user roles, value proposition, modules, scope, and success metrics.

- [`TECHNICAL_DESIGN.md`](/Users/pecorian/Projects/Learnora/learnora/docs/TECHNICAL_DESIGN.md)
  Formal technical design for the platform, including services, module boundaries, non-functional requirements, and AI orchestration.

- [`ARCHITECTURE.md`](/Users/pecorian/Projects/Learnora/learnora/docs/ARCHITECTURE.md)
  Explains the current implementation architecture and the target-state architecture described by the TDD.

- [`DATA_MODEL.md`](/Users/pecorian/Projects/Learnora/learnora/docs/DATA_MODEL.md)
  Maps the platform domains to entities, relationships, ownership rules, and key schema decisions.

- [`IMPLEMENTATION_ROADMAP.md`](/Users/pecorian/Projects/Learnora/learnora/docs/IMPLEMENTATION_ROADMAP.md)
  Breaks delivery into phases from the existing codebase to a scalable SaaS platform.

## Supporting Existing Docs

These repository docs remain useful and should be treated as operational references:

- [`legacy/PROJECT.md`](/Users/pecorian/Projects/Learnora/learnora/docs/legacy/PROJECT.md): screen inventory and MVP coverage
- [`legacy/SYSTEM_MAP.md`](/Users/pecorian/Projects/Learnora/learnora/docs/legacy/SYSTEM_MAP.md): route-by-route implementation status
- [`legacy/BACKEND.md`](/Users/pecorian/Projects/Learnora/learnora/docs/legacy/BACKEND.md): backend tables, buckets, and service checklist
- [`legacy/WIRING_PLAN.md`](/Users/pecorian/Projects/Learnora/learnora/docs/legacy/WIRING_PLAN.md): remaining wiring work
- [`legacy/HANDOFF.md`](/Users/pecorian/Projects/Learnora/learnora/docs/legacy/HANDOFF.md): implementation notes and deployment handoff

## Current Repository Shape

```text
learnora/
  apps/
    web/
    api/
  supabase/
  android/
  ios/
  docs/
```

## Recommended Reading Order

1. Product requirements
2. Technical design
3. Architecture
4. Data model
5. Implementation roadmap

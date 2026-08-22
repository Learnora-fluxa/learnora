# Learnora Implementation Roadmap

## 1. Roadmap Intent

This roadmap translates the expanded TDD into delivery phases that fit the current repository and architecture.

## 2. Current Baseline

The repository already contains:

- role-based application surfaces
- Supabase-backed academic, messaging, and finance features
- parent-facing pages
- super admin tooling
- live class infrastructure

The next step is documentation-led consolidation, not a ground-up rewrite.

## 3. Delivery Phases

### Phase 1: Documentation and Alignment

- Establish product requirements
- Establish technical design
- Clarify current versus target architecture
- Define data ownership and module boundaries
- Align repo docs around a shared vocabulary

### Phase 2: Domain Consolidation

- Standardize domain boundaries in the frontend codebase
- Centralize shared messaging and notification logic
- Harden parent engagement flows
- Formalize finance workflows and payment lifecycle handling

### Phase 3: AI Platform Foundation

- Route all AI features through one orchestration layer
- Add retrieval, safety, and logging controls
- Introduce role-specific prompt contracts
- Add AI usage analytics and cost controls

### Phase 4: Scale and Reliability

- Add background workers for long-running tasks
- Improve observability and operational dashboards
- Expand audit coverage for sensitive actions
- Optimize high-volume analytics and reporting flows

### Phase 5: Modular Extraction

- Extract modules only where there is a clear maintenance or deployment reason
- Split deployables only where clearly justified
- Introduce dedicated services for high-change or high-load domains

## 4. Priority Workstreams

### Parent Experience

- strengthen parent-child linking and access policies
- expand report card and progress explanations
- complete fee workflows end to end

### Messaging and Notifications

- keep one shared messaging service model
- unify announcements, chat, and notification fan-out

### Finance

- normalize invoice, payment, receipt, and transaction handling
- ensure payment webhook reliability and traceability

### AI

- separate UI features from orchestration internals
- enforce bounded data access and response logging

## 5. Success Criteria Per Phase

### Documentation and Alignment

- stakeholders can understand product and system scope without relying on scattered notes

### Domain Consolidation

- core workflows map cleanly to named domains in code and docs

### AI Foundation

- AI usage becomes governable, measurable, and safer

### Scale and Reliability

- the platform can operate with better confidence across many schools

### Modular Extraction

- team velocity improves without adding unnecessary operational complexity

## 6. Recommended Next Decisions

1. Decide whether the new docs should become the canonical source over the older root-level references.
2. Choose the first code refactor that follows the new domain boundaries.
3. Define the initial AI orchestration contract before expanding more AI-facing pages.

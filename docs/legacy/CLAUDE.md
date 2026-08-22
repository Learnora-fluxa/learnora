# Learnora — Guide for Claude Code

Learnora is a multi-tenant LMS (school learning platform) with roles: Student, Teacher, Admin, Parent, Super Admin. This repo is the standalone React frontend, built from Figma designs. The backend is separate.

## Stack
- React + TypeScript + Vite
- Tailwind CSS for all styling (no inline styles)
- Components in `src/components/`, one component per file
- Functional components and hooks only

## Building from Figma
- I'll give you Figma frame links. Use the figma MCP to read the real design — pull actual colors, spacing, font sizes, and layout; don't approximate.
- Build the design system first: extract the palette, spacing scale, and typography into the Tailwind theme as tokens, and use those tokens everywhere.

## Conventions
- Responsive across mobile, tablet, and desktop. Student & Parent screens are mobile-heavy; Admin & Teacher are desktop-first.
- Extract reusable pieces (buttons, inputs, cards) into shared components.
- Semantic HTML + basic accessibility (alt text, labels, real buttons).

## Important
- Only build screens that are actually designed. Don't invent whole screens from scratch — ask me first.
- When you create a viewport (mobile/tablet/desktop) the designer didn't provide, say which screens those were so I can review them.
- If a behavior or state is unclear, ask instead of guessing.
- Standalone frontend only — no backend code or API calls unless I ask.

## Keeping HANDOFF.md current
Maintain a HANDOFF.md file in the project root as the running state of the project. Update it on your own — without being asked — at these moments:
- After finishing a screen or module
- Before any context compaction, and whenever context is getting full
- After any significant decision or change of plan

HANDOFF.md should always contain, concisely:
- Tech stack and key conventions (1–2 lines)
- Where the design screenshots live (folder path) + naming convention
- The Figma/MCP situation (building from exported screenshots; MCP rate-limited on the free plan)
- What's been built so far, by module/screen
- The immediate next steps
- Any open questions or decisions still pending

Keep it short — overwrite stale info instead of appending endlessly. If HANDOFF.md doesn't exist yet, create it.

## On session start / after compaction
Before doing anything else, read PROJECT.md (the full screen map) and HANDOFF.md (current progress and next steps) to re-orient.

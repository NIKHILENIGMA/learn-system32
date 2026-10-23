# ADR-001: Modular Full-Stack Next.js 15 with Isolated Pure-TS Simulation Engine

- **Status:** Accepted
- **Date:** 2026-10-23

## Context
`learn-system32` is a personal, local-first interactive system design simulator inspired by `sys0.in`. We need fast iteration speed for building the `@xyflow/react` workbench and PostgreSQL persistence while ensuring that the mathematical load simulator and SLA/topology grader remain cleanly testable and decoupled from UI/framework specifics.

## Options Considered
1. **Modular Full-Stack Next.js 15+ (`src/engine/`, `src/modules/`, `src/db/`, `src/app/`) (Chosen):** Single repository with strict boundary isolation so `src/engine/` has zero React, Next.js, or database dependencies.
2. **Nx / Turborepo Multi-Package Monorepo (`packages/sim-engine`, `apps/web`, `apps/api`):** Full workspace separation from day one, adding build orchestration overhead before the MVP is complete.
3. **Frontend-Only SPA with Browser Storage:** Zero backend setup, but lacks structured SQL querying for historical assessment runs and future cloud/multi-user expansion.

## Decision
We chose **Option 1 (Modular Full-Stack Next.js 15+ with PostgreSQL + Drizzle ORM and an isolated `src/engine/` directory)**, paired with zero authentication wall in v1 so the developer can launch straight into learning locally.

## Consequences
- **Positive:** Single `npm run dev` command starts both the UI workbench and API routes; `src/engine/` can be unit-tested cleanly with Vitest and extracted to a workspace package later with zero refactoring.
- **Trade-offs / Future Evolution:** When ready to open the platform to public users or monetize, authentication (`Better Auth` / `Auth.js`) and user-scoped foreign keys (`user_id`) can be added to `module_progress` and `canvas_attempts`.

# Project Task & Feature Index (`docs/tasks/`)

> **How This Directory Works:**
> - This `README.md` is the master index showing the exact order of phases and features—where every feature started, where it ended, and what is next in the pipeline.
> - Each numbered file (`001-*.md`, `002-*.md`, ...) contains the atomic **1–3 file microtask breakdown** generated and executed via **`feature-planner`**.
> - **Never edit 10–12 files at once:** Always open the active `00X-<slug>.md` task file and execute one microtask (`TASK-01`, `TASK-02`...) at a time.

## Master Execution Index

| Task # | Task File | Feature ID | Phase | Priority | Status | Started | Completed | Summary |
|---|---|---|---|---|---|---|---|---|
| `001` | [001-foundation-and-setup.md](./001-foundation-and-setup.md) | `CORE` | Phase 1: Foundation | **P0** | `Completed` | 2026-10-23 | 2026-10-23 | Next.js 15 + Tailwind/shadcn setup, core `src/engine/types.ts` contracts, PostgreSQL + Drizzle ORM schema (`module_progress`, `canvas_attempts`, `assessment_runs`), and DB seed script. |
| `002` | [002-module-registry-and-dashboard.md](./002-module-registry-and-dashboard.md) | `FEAT-01` | Phase 2: MVP Core | **P0** | `Completed` | 2026-10-23 | 2026-10-23 | Auto-discovered `src/modules/<slug>/` registry loader, `/api/modules` endpoint, and `/` progressive Skill-Tree Dashboard with completion badges and SLA high scores. |
| `003` | [003-load-simulation-engine.md](./003-load-simulation-engine.md) | `FEAT-02` | Phase 2: MVP Core | **P0** | `Completed` | 2026-10-23 | 2026-10-23 | Pure TypeScript directed-graph tick simulator (`src/engine/simulator`) with topological RPS propagation, M/M/1 queueing latency, DB read-replica lag, cache hit offload, and Vitest unit tests. |
| `004` | [004-interactive-canvas-workbench.md](./004-interactive-canvas-workbench.md) | `FEAT-03` | Phase 2: MVP Core | **P0** | `Planned` | — | — | `/modules/[slug]` 3-pane workbench, `@xyflow/react` custom hardware nodes with live telemetry badges, animated traffic edges, `Zustand` store, hardware inspector drawer, `dagre` auto-layout, and bottom simulation bar. |
| `005` | [005-sla-and-topology-grader.md](./005-sla-and-topology-grader.md) | `FEAT-04` | Phase 2: MVP Core | **P0** | `Planned` | — | — | Deterministic 10-tick SLA stress grader + structural topology rule evaluator (`src/engine/grader`), `POST /api/modules/[slug]/evaluate` persistence, and right/wrong bottleneck diagnostics UI. |
| `006` | [006-insights-and-initial-modules.md](./006-insights-and-initial-modules.md) | `FEAT-05` | Phase 3: Modules & Insights | **P0** | `Planned` | — | — | Post-completion deep-dive insights & reference architecture comparison UI + two flagship modules in `src/modules/` (`01-single-server-bottleneck` & `02-url-shortener`). |
| `007` | [007-database-schema-lab.md](./007-database-schema-lab.md) | `FEAT-06` | Phase 4: In-Pipeline | **P1** | `In Pipeline` | — | — | Interactive Database Schema & Query Designer (`src/engine/schema-lab`) with visual ER table/index builder and static query cost analyzer. |
| `008` | [008-ai-architecture-mentor.md](./008-ai-architecture-mentor.md) | `FEAT-07` | Phase 4: In-Pipeline | **P1** | `In Pipeline` | — | — | On-demand AI Architecture Mentor review (`POST /api/modules/[slug]/ai-review`) using Vercel AI SDK (`@ai-sdk/google` / OpenAI). |

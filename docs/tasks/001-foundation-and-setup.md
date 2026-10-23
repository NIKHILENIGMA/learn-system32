# Task `001`: Project Foundation, DB Schema & Type Contracts (`CORE`)

- **Feature ID:** `CORE`
- **Phase / Priority:** `Phase 1: Foundation / P0`
- **Status:** `Completed`
- **Started:** `2026-10-23`
- **Completed:** `2026-10-23`

---

## 1. Where This Feature Starts (Baseline & Scope)
- **Goal:** Establish the Next.js 15+ (App Router, React 19, TypeScript) project foundation, pure-TypeScript simulation & grading contracts in `src/engine/types.ts` (including `DEFAULT_NODE_SPECS` for all 10 hardware node categories), PostgreSQL + Drizzle ORM schema (`module_progress`, `canvas_attempts`, `assessment_runs`) with local Docker Compose support, idempotent seed script, and the dark `slate-950` engineering layout shell.
- **Starting Point / Dependencies:** Greenfield blueprint repository (`docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/SIMILAR_PRODUCT.md`, `docs/adr/`). No application code exists yet.
- **Access & Permissions:** Local single-learner platform (`Public` / zero auth wall in v1 per `AGENTS.md`).
- **Business Rules & Edge Cases:**
  - **Strict Engine Isolation (`src/engine/`):** `src/engine/types.ts` must have **zero** imports from React, Next.js, Zustand, or Drizzle ORM so the engine remains 100% portable and unit-testable.
  - **Hardware Spec Defaults (`DEFAULT_NODE_SPECS`):** Every `NodeCategory` (`client`, `load_balancer`, `api_gateway`, `api_server`, `worker`, `redis_cache`, `message_queue`, `postgres_db`, `nosql_db`, `cdn`) must have deterministic baseline specs (`instances`, `maxRpsPerInstance`, `baseLatencyMs`, `monthlyCostPerInstance`, plus category-specific defaults like `cacheHitRatio`, `readReplicaCount`, `rateLimitRps`).
  - **Database Connection Pool Singleton:** `src/db/index.ts` must cache the `pg.Pool` instance on `globalThis` in development to prevent connection exhaustion across Next.js HMR reloads.
  - **Idempotent Seeding:** Running `pnpm db:seed` multiple times must safely upsert `module_progress` rows via `ON CONFLICT (module_slug) DO NOTHING` without overwriting existing learner scores or completed timestamps.

---

## 2. Data Model / State Changes

| Table | Column / Field | Type & Constraints | Index / Relation / Cascade |
|---|---|---|---|
| `module_progress` | `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` | PK |
| `module_progress` | `module_slug` | `varchar(128) NOT NULL UNIQUE` | `UNIQUE(module_slug)` |
| `module_progress` | `status` | `module_progress_status ENUM('not_started','in_progress','completed') NOT NULL DEFAULT 'not_started'` | — |
| `module_progress` | `insights_unlocked` | `boolean NOT NULL DEFAULT false` | — |
| `module_progress` | `best_score_percent` | `integer NOT NULL DEFAULT 0` | `CHECK (0..100)` semantics |
| `module_progress` | `best_p95_latency_ms` | `integer NULL` | — |
| `module_progress` | `lowest_monthly_cost_usd` | `integer NULL` | — |
| `module_progress` | `first_completed_at` | `timestamp with time zone NULL` | — |
| `module_progress` | `updated_at` | `timestamp with time zone NOT NULL DEFAULT now()` | — |
| `canvas_attempts` | `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` | PK |
| `canvas_attempts` | `module_slug` | `varchar(128) NOT NULL` | `FK -> module_progress.module_slug ON DELETE CASCADE`, `INDEX(module_slug, is_active_draft, updated_at)` |
| `canvas_attempts` | `label` | `varchar(160) NOT NULL DEFAULT 'Active Draft'` | — |
| `canvas_attempts` | `nodes_json` | `jsonb NOT NULL` (`CanvasNode[]`) | — |
| `canvas_attempts` | `edges_json` | `jsonb NOT NULL` (`CanvasEdge[]`) | — |
| `canvas_attempts` | `schema_lab_json` | `jsonb NULL` | Nullable P1 Schema Lab payload |
| `canvas_attempts` | `is_active_draft` | `boolean NOT NULL DEFAULT true` | Composite index |
| `canvas_attempts` | `created_at` / `updated_at` | `timestamp with time zone NOT NULL DEFAULT now()` | — |
| `assessment_runs` | `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` | PK |
| `assessment_runs` | `module_slug` | `varchar(128) NOT NULL` | `FK -> module_progress.module_slug ON DELETE CASCADE`, `INDEX(module_slug, created_at)` |
| `assessment_runs` | `attempt_id` | `uuid NULL` | `FK -> canvas_attempts.id ON DELETE SET NULL` |
| `assessment_runs` | `passed` | `boolean NOT NULL` | — |
| `assessment_runs` | `score_percent` | `integer NOT NULL` | — |
| `assessment_runs` | `achieved_read_rps` / `achieved_write_rps` | `integer NOT NULL` | — |
| `assessment_runs` | `p95_latency_ms` | `integer NOT NULL` | — |
| `assessment_runs` | `error_rate_percent` | `numeric(5,2) NOT NULL` | — |
| `assessment_runs` | `estimated_monthly_cost_usd` | `integer NOT NULL` | — |
| `assessment_runs` | `sla_results_json` | `jsonb NOT NULL` (`SLACheckResult[]`) | — |
| `assessment_runs` | `topology_results_json` | `jsonb NOT NULL` (`TopologyCheckResult[]`) | — |
| `assessment_runs` | `ai_mentor_feedback` | `text NULL` | Nullable P1 AI Mentor review |
| `assessment_runs` | `created_at` | `timestamp with time zone NOT NULL DEFAULT now()` | — |

---

## 3. Detailed API Endpoint Contracts
*(No HTTP API endpoints are exposed in Task `001` — `/api/modules` and `/api/modules/[slug]` are built in Task `002`. Task `001` establishes the shared TypeScript and Drizzle ORM contracts used by all downstream endpoints.)*

---

## 4. UI Screens, Components & Edge States

| Screen / Component | Route / Location | State / Hook Used | Loading State | Empty State | Error State |
|---|---|---|---|---|---|
| `RootLayout` | `src/app/layout.tsx` | Server Component | Instant SSR dark `slate-950` shell | — | Next.js root error boundary |
| `FoundationHomeShell` | `src/app/page.tsx` | Server Component (`MODULES_REGISTRY`) | Instant SSR render | Displays "Ready for Module Registry (Task 002)" card if 0 modules registered | — |

---

## 5. Sequential Microtask Plan (Strict 1–3 File Cap per Microtask)

> **Agent Execution Rules:**
> 1. Execute **only ONE microtask at a time**.
> 2. Never edit files outside the **Target Files (Max 1–3)** listed for the active microtask.
> 3. Run the **Verification Check** after each microtask and mark `- [x]` before starting the next microtask.

### `TASK-01`: Next.js Official CLI Scaffolding, Dependencies & Standardized Scripts
- [x] **Completed**
- **Target Files (1–3 files):**
  - `package.json`
  - `tsconfig.json`
  - `next.config.ts`
- **What to Implement:**
  1. Hand over the official `create-next-app` CLI command, dependency installation commands (`@xyflow/react`, `@dagrejs/dagre`, `zustand`, `drizzle-orm`, `pg`, `lucide-react`, `drizzle-kit`, `tsx`, `vitest`, `@types/pg`), and `shadcn` init command to the developer to run in their terminal.
  2. Configure standardized scripts in `package.json` (`dev`, `build`, `start`, `lint`, `typecheck`, `db:generate`, `db:migrate`, `db:push`, `db:studio`, `db:seed`, `docker:up`, `docker:down`, `docker:logs`, `test`, `test:watch`) and verify strict TypeScript config (`noImplicitAny: true`, zero `any`).
- **Verification Check:** Run `pnpm typecheck` and confirm 0 errors.

### `TASK-02`: Local Docker Postgres & Drizzle Kit Config
- [x] **Completed**
- **Target Files (2 files):**
  - `docker-compose.yml`
  - `drizzle.config.ts`
- **What to Implement:** Create `docker-compose.yml` providing a 1-command PostgreSQL 16 Alpine container on port `5432` with persistent volume and healthcheck, and `drizzle.config.ts` pointing to `./src/db/schema.ts` (the developer manages `.env*` files directly per `AGENTS.md`).
- **Verification Check:** Run `pnpm typecheck` and confirm `drizzle.config.ts` compiles cleanly with 0 errors.

### `TASK-03`: Pure TypeScript Engine Contracts & Hardware Preset Catalog
- [x] **Completed**
- **Target Files (1 file):**
  - `src/engine/types.ts`
- **What to Implement:** Implement all pure-TypeScript interfaces required by the simulator, grader, canvas, and module registry (`NodeCategory`, `HardwareSpec`, `NodeConfig`, `CanvasNode`, `CanvasEdge`, `NodeTelemetry`, `EdgeTelemetry`, `SimulationTickInput`, `SimulationTickResult`, `LevelSLAConstraints`, `TopologyRule`, `TopologyCheckResult`, `SLACheckResult`, `AssessmentResult`, `ModuleTier`, `ModuleDifficulty`, `ModuleMetadata`, `ConceptBrief`, `PostCompletionInsights`, `LearningModule`) plus `DEFAULT_NODE_SPECS` for all 10 `NodeCategory` types.
- **Verification Check:** Run `pnpm tsc --noEmit` and confirm 0 errors and zero UI/DB imports in `src/engine/types.ts`.

### `TASK-04`: PostgreSQL Connection Pool & Drizzle ORM Schema
- [x] **Completed**
- **Target Files (2 files):**
  - `src/db/schema.ts`
  - `src/db/index.ts`
- **What to Implement:** Implement `moduleProgressStatusEnum`, `moduleProgress`, `canvasAttempts`, and `assessmentRuns` tables with indexes, relations, and typed JSONB columns in `src/db/schema.ts`. Implement HMR-safe `pg.Pool` + Drizzle client in `src/db/index.ts`.
- **Verification Check:** Run `pnpm tsc --noEmit` and `pnpm db:generate` to verify Drizzle schema compilation and SQL migration generation.

### `TASK-05`: Starter Module Registry Stub & Idempotent Database Seed Script
- [x] **Completed**
- **Target Files (2 files):**
  - `src/modules/index.ts`
  - `src/db/seed.ts`
- **What to Implement:** Create `src/modules/index.ts` exporting `MODULES_REGISTRY: LearningModule[]`, `getAllModules()`, and `getModuleBySlug(slug)`, and create `src/db/seed.ts` that reads `getAllModules()` and idempotently inserts initial rows into `module_progress` (`ON CONFLICT (module_slug) DO NOTHING`).
- **Verification Check:** Run `pnpm tsc --noEmit` with 0 errors.

### `TASK-06`: Dark Engineering Theme, Root App Shell & Utility Helpers
- [x] **Completed**
- **Target Files (3 files):**
  - `src/lib/utils.ts`
  - `src/app/globals.css`
  - `src/app/layout.tsx`
- **What to Implement:** Create `cn()` class merger in `src/lib/utils.ts`, configure Tailwind CSS + dark `slate-950` engineering theme styles in `src/app/globals.css`, and build the dark-mode root layout (`src/app/layout.tsx`) with metadata for `learn-system32`.
- **Verification Check:** Run `pnpm tsc --noEmit` with 0 errors.

### `TASK-07`: Baseline Home Shell, Engine Unit Smoke Test & Completion Sync
- [x] **Completed**
- **Target Files (3 files):**
  - `vitest.config.ts`
  - `src/app/page.tsx`
  - `tests/engine/types.test.ts`
- **What to Implement:** Configure `@/*` path alias in `vitest.config.ts`, build the baseline dark engineering home shell in `src/app/page.tsx` displaying the foundation readiness state and hardware catalog summary, and add Vitest unit tests in `tests/engine/types.test.ts` verifying all 10 `DEFAULT_NODE_SPECS` and factory helpers. Afterwards, sync Section 6 below, `docs/tasks/README.md`, and `docs/PRD.md`.
- **Verification Check:** Run `pnpm test` and `pnpm build` with 0 errors.

---

## 6. Where We Ended & Future Extension Notes *(Filled Upon Completion)*
- **Files Created / Modified:**
  - `package.json`, `tsconfig.json`, `next.config.ts`
  - `docker-compose.yml`, `drizzle.config.ts`, `drizzle/0000_marvelous_daimon_hellstrom.sql`
  - `src/engine/types.ts`
  - `src/db/schema.ts`, `src/db/index.ts`, `src/db/seed.ts`
  - `src/modules/index.ts`
  - `src/lib/utils.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`
  - `vitest.config.ts`, `tests/engine/types.test.ts`
- **Where This Feature Ended:**
  - Next.js 16.4 (App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui) is configured with strict TypeScript (`noImplicitAny: true`, zero `any`) and standardized scripts (`dev`, `build`, `start`, `lint`, `typecheck`, `db:*`, `docker:*`, `test*`).
  - `src/engine/types.ts` defines all pure-TS simulation, grading, and module contracts plus `DEFAULT_NODE_SPECS` for all 10 infrastructure node categories (`client`, `load_balancer`, `api_gateway`, `api_server`, `worker`, `redis_cache`, `message_queue`, `postgres_db`, `nosql_db`, `cdn`), verified by Vitest (`tests/engine/types.test.ts`).
  - `src/db/schema.ts` and `src/db/index.ts` define the `module_progress`, `canvas_attempts`, and `assessment_runs` PostgreSQL tables with initial Drizzle migration generated in `drizzle/` and idempotent seeding in `src/db/seed.ts`.
- **How to Extend in the Future (Next Iterations):**
  - **Task `002` (`002-module-registry-and-dashboard.md` — `FEAT-01`):** Register starter modules in `src/modules/<slug>/index.ts`, implement `GET /api/modules` & `GET /api/modules/[slug]` merging `getAllModules()` with PostgreSQL `module_progress`, and upgrade `src/app/page.tsx` into the interactive Skill-Tree Dashboard with tier filters and SLA high-score badges.

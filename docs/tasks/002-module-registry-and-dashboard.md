# Task `002`: Auto-Discovered Module Registry & Skill-Tree Dashboard (`FEAT-01`)

- **Feature ID:** `FEAT-01`
- **Phase / Priority:** `Phase 2: MVP Core / P0`
- **Status:** `Completed`
- **Started:** `2026-10-23`
- **Completed:** `2026-10-23`

---

## 1. Where This Feature Starts (Baseline & Scope)
- **Goal:** Populate the declarative `src/modules/<slug>/` registry with our initial system design modules (`01-single-server-bottleneck` and `02-url-shortener`), expose `GET /api/modules` and `GET /api/modules/[slug]` merged with PostgreSQL learner progress (with graceful offline fallback), and build the interactive Skill-Tree Dashboard on `/` with Tier/Status filters, search, SLA target badges, and high-score telemetry cards.
- **Starting Point / Dependencies:** Builds on `src/engine/types.ts`, `src/db/schema.ts` (`module_progress`, `canvas_attempts`, `assessment_runs`), and `src/modules/index.ts` created in Task `001`.
- **Access & Permissions:** Local single-learner platform (`Public` / zero auth wall in v1).
- **Business Rules & Edge Cases:**
  - **Self-Paced Open Progression:** All registered modules across Tier 1, Tier 2, and Tier 3 are immediately unlocked and clickable on the dashboard.
  - **Graceful PostgreSQL Fallback:** If PostgreSQL is offline or unreachable during local development or build, the service layer must catch connection errors gracefully, return default `not_started` progress for every module, and set `meta.dbConnected = false` (displaying a clear `"Local Memory Mode (DB Offline)"` badge in the dashboard header instead of crashing).
  - **Insights & Reference Solution Gating:**
    - `GET /api/modules` returns lightweight card summaries (`metadata`, `conceptBrief`, `requirements.sla`, `tags`, and merged `progress`) without `referenceSolution` or `postCompletionInsights` payloads.
    - `GET /api/modules/[slug]` includes `referenceSolution` and `postCompletionInsights` **only** when `progress.insightsUnlocked === true` OR when the learner explicitly passes `?peek=true` (Hint/Peek mode).
  - **Invalid Filter Query Params:** Passing an unknown `tier`, `status`, or `difficulty` query parameter to `GET /api/modules` returns `400 Bad Request` (`VALIDATION_FAILED`) with a descriptive message.
  - **Unknown Module Slug:** Requesting a non-existent `slug` on `GET /api/modules/[slug]` returns `404 Not Found` (`MODULE_NOT_FOUND`).

---

## 2. Data Model / State Changes
*(Uses existing `module_progress`, `canvas_attempts`, and `assessment_runs` tables defined in `src/db/schema.ts` during Task `001`. Introduces typed DTOs in `src/modules/dto.ts`.)*

| DTO / Type (`src/modules/dto.ts`) | Purpose | Key Fields |
|---|---|---|
| `ModuleProgressSummaryDto` | Learner progress per module | `status`, `insightsUnlocked`, `bestScorePercent`, `bestP95LatencyMs`, `lowestMonthlyCostUsd`, `firstCompletedAt`, `updatedAt` |
| `ModuleCardSummaryDto` | Dashboard card item | `metadata`, `problemStatement`, `backOfEnvelope`, `sla`, `allowedNodeTypes`, `topologyRuleCount`, `progress` |
| `ModuleListMetaDto` | Dashboard & list metadata | `totalModules`, `completedCount`, `inProgressCount`, `notStartedCount`, `averageBestScore`, `dbConnected` |
| `ModuleDetailDto` | Full workbench module payload | `metadata`, `conceptBrief`, `requirements`, `starterGraph`, `topologyRules` (id + description), `progress`, `activeDraft`, `recentRuns`, `referenceSolution` (nullable), `postCompletionInsights` (nullable), `dbConnected` |

---

## 3. Detailed API Endpoint Contracts

### 3.1 `GET /api/modules`
- **Auth:** `Local (Public)`
- **Query Params (Optional):**
  - `tier`: `'tier-1-foundations' | 'tier-2-async' | 'tier-3-distributed'`
  - `status`: `'not_started' | 'in_progress' | 'completed'`
  - `difficulty`: `'Beginner' | 'Intermediate' | 'Advanced'`
  - `search`: free-text filter matching `title`, `subtitle`, or `tags`
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "metadata": {
        "slug": "01-single-server-bottleneck",
        "title": "The Single Server Bottleneck",
        "subtitle": "Scale a single-box web app under a 4,000 RPS read/write wave",
        "tier": "tier-1-foundations",
        "order": 1,
        "difficulty": "Beginner",
        "estimatedMinutes": 15,
        "tags": ["Load Balancing", "Horizontal Scaling", "Caching"]
      },
      "problemStatement": "Your startup's monolith runs on a single API server backed by a single PostgreSQL instance...",
      "backOfEnvelope": {
        "readRps": 3500,
        "writeRps": 500,
        "averagePayloadBytes": 2048
      },
      "sla": {
        "targetReadRps": 3500,
        "targetWriteRps": 500,
        "maxP95LatencyMs": 45,
        "maxErrorRatePercent": 0,
        "maxMonthlyBudgetUsd": 850,
        "requireSingleNodeFailover": true,
        "requiredNodeTypes": ["load_balancer", "api_server", "redis_cache", "postgres_db"]
      },
      "topologyRuleCount": 3,
      "progress": {
        "status": "not_started",
        "insightsUnlocked": false,
        "bestScorePercent": 0,
        "bestP95LatencyMs": null,
        "lowestMonthlyCostUsd": null,
        "firstCompletedAt": null,
        "updatedAt": null
      }
    }
  ],
  "meta": {
    "totalModules": 2,
    "filteredCount": 2,
    "completedCount": 0,
    "inProgressCount": 0,
    "notStartedCount": 2,
    "averageBestScore": 0,
    "dbConnected": true
  },
  "timestamp": "2026-10-23T18:55:00.000Z"
}
```
- **Error Responses:**
  - `400 Bad Request` (`VALIDATION_FAILED`): Invalid `tier`, `status`, or `difficulty` query parameter.

### 3.2 `GET /api/modules/[slug]`
- **Auth:** `Local (Public)`
- **Query Params (Optional):** `?peek=true` (Unlocks `referenceSolution` and `postCompletionInsights` in response for Hint/Peek mode even if `insightsUnlocked` is `false`).
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "metadata": { "slug": "01-single-server-bottleneck", "...": "..." },
    "conceptBrief": { "...": "..." },
    "requirements": { "...": "..." },
    "starterGraph": { "nodes": [], "edges": [] },
    "topologyRules": [
      { "id": "client-to-lb", "description": "Client traffic must enter through a Load Balancer before reaching API servers." }
    ],
    "progress": {
      "status": "not_started",
      "insightsUnlocked": false,
      "bestScorePercent": 0,
      "bestP95LatencyMs": null,
      "lowestMonthlyCostUsd": null,
      "firstCompletedAt": null,
      "updatedAt": null
    },
    "activeDraft": null,
    "recentRuns": [],
    "referenceSolution": null,
    "postCompletionInsights": null,
    "dbConnected": true
  },
  "timestamp": "2026-10-23T18:55:00.000Z"
}
```
- **Error Responses:**
  - `404 Not Found` (`MODULE_NOT_FOUND`): No module registered with the requested `slug`.

---

## 4. UI Screens, Components & Edge States

| Screen / Component | Route / Location | State / Hook Used | Loading State | Empty State | Error State |
|---|---|---|---|---|---|
| `DashboardLoading` | `src/app/loading.tsx` | Next.js Suspense boundary | 3 tier header skeletons + 6 shimmer module card skeletons | — | — |
| `SkillTreeExplorer` | `src/components/dashboard/skill-tree-explorer.tsx` | Client filter state (`selectedTier`, `selectedStatus`, `searchQuery`) | Instant hydration from Server Component props | `"No modules match your active filters"` card with `"Reset Filters"` button | Amber `"Local Memory Mode (DB Offline)"` banner if `meta.dbConnected === false` |
| `ModuleCard` | `src/components/dashboard/module-card.tsx` | Stateless presentational component | — | Displays `"No attempts yet"` telemetry placeholder when `status === 'not_started'` | — |

---

## 5. Sequential Microtask Plan (Strict 1–3 File Cap per Microtask)

> **Agent Execution Rules:**
> 1. Execute **only ONE microtask at a time**.
> 2. Never edit files outside the **Target Files (Max 1–3)** listed for the active microtask.
> 3. Run the **Verification Check** after each microtask and mark `- [x]` before starting the next microtask.

### `TASK-01`: Starter Learning Modules & Registry Loader
- [x] **Completed**
- **Target Files (3 files):**
  - `src/modules/01-single-server-bottleneck/index.ts`
  - `src/modules/02-url-shortener/index.ts`
  - `src/modules/index.ts`
- **What to Implement:** Create the two flagship learning modules (`01-single-server-bottleneck` in Tier 1 and `02-url-shortener` in Tier 3) with realistic back-of-the-envelope numbers, SLA constraints, starter React Flow graphs, deterministic `topologyRules`, reference architectures, and deep-dive insights. Register them in `src/modules/index.ts` along with `TIER_METADATA`.
- **Verification Check:** Run `pnpm typecheck` with 0 errors.

### `TASK-02`: Module DTOs, Query Filter Parser & Output Mappers
- [x] **Completed**
- **Target Files (1 file):**
  - `src/modules/dto.ts`
- **What to Implement:** Define strict TypeScript DTOs (`ModuleProgressSummaryDto`, `ModuleCardSummaryDto`, `ModuleListMetaDto`, `ModuleDetailDto`, `ApiSuccessResponse`, `ApiErrorResponse`), query filter validation (`parseModulesListQuery`), and pure mapper functions (`toModuleCardSummaryDto`, `toModuleDetailDto` with insight gating).
- **Verification Check:** Run `pnpm typecheck` with 0 errors.

### `TASK-03`: Module Progress & Detail Service with Graceful DB Fallback
- [x] **Completed**
- **Target Files (1 file):**
  - `src/modules/service.ts`
- **What to Implement:** Implement `listModulesWithProgress(filters)` and `getModuleDetailBySlug(slug, options)` merging `getAllModules()` with PostgreSQL `module_progress`, active `canvas_attempts`, and recent `assessment_runs`, with graceful fallback to `not_started` (`dbConnected: false`) if PostgreSQL is unreachable.
- **Verification Check:** Run `pnpm typecheck` with 0 errors.

### `TASK-04`: Next.js Route Handlers (`GET /api/modules` & `GET /api/modules/[slug]`)
- [x] **Completed**
- **Target Files (2 files):**
  - `src/app/api/modules/route.ts`
  - `src/app/api/modules/[slug]/route.ts`
- **What to Implement:** Implement `GET /api/modules` (supporting `?tier=&status=&difficulty=&search=`) and `GET /api/modules/[slug]` (supporting `?peek=true` via `RouteContext<'/api/modules/[slug]'>`) returning uniform JSON envelopes and `400`/`404` error responses.
- **Verification Check:** Run `pnpm typecheck` with 0 errors.

### `TASK-05`: Skill-Tree Dashboard UI Components (Header Stats, Filters & Module Cards)
- [x] **Completed**
- **Target Files (2 files):**
  - `src/components/dashboard/module-card.tsx`
  - `src/components/dashboard/skill-tree-explorer.tsx`
- **What to Implement:** Build `<ModuleCard />` (status badge, difficulty badge, SLA target pills, learner best score / P95 / cost telemetry, tags, and `/modules/[slug]` CTA) and `<SkillTreeExplorer />` (platform stats bar, DB connection badge, Tier + Status filter pills, search input, Tier 1/2/3 skill-tree sections, and empty filter reset CTA).
- **Verification Check:** Run `pnpm typecheck` with 0 errors.

### `TASK-06`: Mount Skill-Tree Dashboard on `/`, Loading Skeletons & Unit Verification
- [x] **Completed**
- **Target Files (3 files):**
  - `src/app/loading.tsx`
  - `src/app/page.tsx`
  - `tests/engine/module-registry.test.ts`
- **What to Implement:** Add shimmer loading skeletons in `src/app/loading.tsx`, update `src/app/page.tsx` to load modules via `listModulesWithProgress()` and render `<SkillTreeExplorer />`, and write Vitest unit tests in `tests/engine/module-registry.test.ts` covering module discovery, tier sorting, topology rule execution, query validation, and DTO insight gating. Sync Section 6 below, `docs/tasks/README.md`, and `docs/PRD.md`.
- **Verification Check:** Run `pnpm test`, `pnpm typecheck`, and `pnpm build` with 0 errors.

---

## 6. Where We Ended & Future Extension Notes *(Filled Upon Completion)*
- **Files Created / Modified:**
  - `src/modules/01-single-server-bottleneck/index.ts`, `src/modules/02-url-shortener/index.ts`, `src/modules/index.ts`
  - `src/modules/dto.ts`, `src/modules/service.ts`
  - `src/app/api/modules/route.ts`, `src/app/api/modules/[slug]/route.ts`
  - `src/components/dashboard/module-card.tsx`, `src/components/dashboard/skill-tree-explorer.tsx`
  - `src/app/loading.tsx`, `src/app/page.tsx`
  - `tests/engine/module-registry.test.ts`
- **Where This Feature Ended:**
  - Two flagship learning modules (`01-single-server-bottleneck` in Tier 1 and `02-url-shortener` in Tier 3) are registered in `src/modules/index.ts` with complete SLA envelopes, starter graphs, topology rules, reference solutions, and production insights.
  - `GET /api/modules` (`?tier=&status=&difficulty=&search=`) and `GET /api/modules/[slug]` (`?peek=true`) return typed `{ success, data, meta, timestamp }` envelopes merged with PostgreSQL `module_progress`, active `canvas_attempts`, and recent `assessment_runs`, falling back gracefully to `not_started` (`dbConnected: false`) if PostgreSQL is offline.
  - `/` renders the progressive `<SkillTreeExplorer />` dashboard with Partial Prerendering (`src/app/loading.tsx` skeleton boundary), Tier/Status filter pills, search input, DB connection status indicator, SLA target cards, and high-score telemetry badges.
- **How to Extend in the Future (Next Iterations):**
  - **Adding New Modules Anytime:** Create `src/modules/<slug>/index.ts` exporting a `LearningModule` and append it to `MODULES_REGISTRY` in `src/modules/index.ts` — it will automatically appear on `/` and `/api/modules`.
  - **Task `003` (`003-load-simulation-engine.md` — `FEAT-02`):** Implement `src/engine/simulator/` to propagate Read/Write RPS across `CanvasNode[]` and `CanvasEdge[]` graphs for any module loaded via `getModuleDetailBySlug(slug)`.

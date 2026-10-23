# Task `004`: Interactive System Design Canvas Workbench (`FEAT-03`)

- **Feature ID:** `FEAT-03`
- **Phase / Priority:** `Phase 2: MVP Core / P0`
- **Status:** `Completed`
- **Started:** `2026-10-23`
- **Completed:** `2026-10-23`

---

## 1. Where This Feature Starts (Baseline & Scope)
- **Goal:** Build the full-screen 3-pane engineering workbench at `/modules/[slug]` using `@xyflow/react`, `Zustand`, and `@dagrejs/dagre`. The workbench provides an interactive canvas where learners can add/connect hardware nodes, watch real-time animated traffic edges and telemetry badges driven by the tick simulator (`src/engine/simulator`), inspect and tune specs (instances, cache hit ratio, replicas, rate limits), auto-layout messy graphs with Dagre, and auto-save drafts to PostgreSQL.
- **Starting Point / Dependencies:** Builds on `src/engine/types.ts` (Task `001`), declarative modules in `src/modules/` (Task `002`), and the pure-TS directed-graph tick simulator `src/engine/simulator/` (Task `003`).
- **Access & Permissions:** Local single-learner platform (`Public` / zero auth wall).
- **Business Rules & Edge Cases:**
  - **Auto-Discovery & Restricted Node Types:** Each module specifies `allowedNodeTypes?: NodeCategory[]`. The palette and node inspector only permit adding/configuring allowed node types for that challenge.
  - **Simulation Loop & Zustand Store Separation:** Live tick simulation telemetry updates frequently (every 1s during Play). To maintain 60 FPS canvas performance, telemetry is decoupled from React Flow node positioning objects and updated reactively without full canvas rebuilds.
  - **Draft Persistence & Local Memory Fallback:** Canvas state (`nodes`, `edges`) is debounced (1.5s) and saved to `PUT /api/modules/[slug]/draft`. If PostgreSQL is offline, drafts fallback to browser `localStorage` without UI disruption.
  - **Dagre Auto-Layout:** Recomputes node coordinates (`dagre.graphlib.Graph`) left-to-right (`rankdir: 'LR'`) so complex architectures snap into clean engineering diagrams with one click.
  - **Topology Rule Checklist:** The left drawer actively evaluates `module.topologyRules` against current canvas `nodes` and `edges` on every graph modification, providing instant feedback on missing nodes or broken links.

---

## 2. Data Model / State Changes

| State Slice / Endpoint | Location | Type & Scope | Purpose |
|---|---|---|---|
| `WorkbenchStore` | `src/store/use-workbench-store.ts` | Client Zustand Store | Canvas nodes, edges, selectedNodeId, simulation state (isPlaying, speed, tick, multiplier), live telemetry, dirty state |
| `PUT /api/modules/[slug]/draft` | `src/app/api/modules/[slug]/draft/route.ts` | Route Handler | Saves/upserts active draft `nodes_json`, `edges_json` in PostgreSQL `canvas_attempts` |
| `POST /api/modules/[slug]/reset` | `src/app/api/modules/[slug]/reset/route.ts` | Route Handler | Resets active draft in `canvas_attempts` to module `starterGraph` |

---

## 3. Detailed API Endpoint Contracts

### 3.1 `PUT /api/modules/[slug]/draft`
- **Request Body:**
```json
{
  "nodes": [...],
  "edges": [...]
}
```
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": { "updatedAt": "2026-10-23T20:25:00.000Z" },
  "timestamp": "2026-10-23T20:25:00.000Z"
}
```

### 3.2 `POST /api/modules/[slug]/reset`
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": { "starterGraph": { "nodes": [...], "edges": [...] } },
  "timestamp": "2026-10-23T20:25:00.000Z"
}
```

---

## 4. UI Screens, Components & Edge States

| Component | Location | Role & Edge States |
|---|---|---|
| `WorkbenchCanvas` | `src/components/canvas/workbench-canvas.tsx` | Center pane `@xyflow/react` infinite canvas, background engineering grid, controls |
| `HardwareNode` | `src/components/canvas/hardware-node.tsx` | Custom React Flow node with telemetry badge, utilization bar, and health color |
| `AnimatedTrafficEdge` | `src/components/canvas/animated-traffic-edge.tsx` | Custom edge with dynamic stroke-width and animation speed scaling with RPS load |
| `NodePalette` | `src/components/canvas/node-palette.tsx` | Top-left floating palette filtered by `allowedNodeTypes` |
| `SimControlBar` | `src/components/canvas/sim-control-bar.tsx` | Bottom floating toolbar: Play/Pause, Step 1 Tick, Multiplier (1x/5x/10x), Auto-Layout, Reset |
| `WorkbenchLeftDrawer` | `src/components/canvas/workbench-left-drawer.tsx` | Collapsible Left 360px: Problem brief, Back-of-envelope, SLA targets, live topology checklist |
| `WorkbenchRightDrawer` | `src/components/canvas/workbench-right-drawer.tsx` | Collapsible Right 380px: Selected node inspector (instances, replicas, hit ratio, cost) + Unlocked Insights |

---

## 5. Sequential Microtask Plan (Strict 1–3 File Cap per Microtask)

### `TASK-01`: Canvas Draft Auto-Save & Reset Route Handlers
- [x] **Completed**
- **Target Files (2 files):**
  - `src/app/api/modules/[slug]/draft/route.ts`
  - `src/app/api/modules/[slug]/reset/route.ts`
- **What to Implement:** Create `PUT /api/modules/[slug]/draft` to upsert active draft in `canvas_attempts` and set progress to `in_progress`. Create `POST /api/modules/[slug]/reset` to restore `starterGraph`. Include graceful fallback when PostgreSQL is offline.
- **Verification Check:** Run `pnpm typecheck` with 0 errors.

### `TASK-02`: Zustand Workbench Store & Dagre Layout Helper
- [x] **Completed**
- **Target Files (2 files):**
  - `src/lib/dagre-layout.ts`
  - `src/store/use-workbench-store.ts`
- **What to Implement:** Build Dagre LR auto-layout helper calculating clean node coordinates. Build Zustand `useWorkbenchStore` managing nodes, edges, selection, tick timer loop (`setInterval` driving `simulateTick`), multiplier, and debounced draft auto-save.
- **Verification Check:** Run `pnpm typecheck` with 0 errors.

### `TASK-03`: Custom React Flow Hardware Node & Animated Traffic Edge
- [x] **Completed**
- **Target Files (2 files):**
  - `src/components/canvas/hardware-node.tsx`
  - `src/components/canvas/animated-traffic-edge.tsx`
- **What to Implement:** Build custom `HardwareNode` displaying icon, title, horizontal instance count badge, utilization progress bar, live RPS/P95 telemetry, and overload/crashed glow. Build `AnimatedTrafficEdge` scaling stroke width and dash animation speed to traffic volume.
- **Verification Check:** Run `pnpm typecheck` with 0 errors.

### `TASK-04`: Center Canvas, Floating Node Palette & Simulation Control Bar
- [x] **Completed**
- **Target Files (3 files):**
  - `src/components/canvas/node-palette.tsx`
  - `src/components/canvas/sim-control-bar.tsx`
  - `src/components/canvas/workbench-canvas.tsx`
- **What to Implement:** Build `NodePalette` with allowed node categories and click-to-add action. Build floating `SimControlBar` with Play/Pause, Step 1 Tick, 1x/5x/10x slider, Auto-Layout, and Reset. Assemble center `WorkbenchCanvas` integrating `@xyflow/react`.
- **Verification Check:** Run `pnpm typecheck` with 0 errors.

### `TASK-05`: Workbench Drawers (Requirements Checklist & Hardware Inspector)
- [x] **Completed**
- **Target Files (2 files):**
  - `src/components/canvas/workbench-left-drawer.tsx`
  - `src/components/canvas/workbench-right-drawer.tsx`
- **What to Implement:** Build `WorkbenchLeftDrawer` (Problem statement, Back-of-Envelope, SLA targets, and real-time live topology checklist). Build `WorkbenchRightDrawer` (Hardware Inspector for tuning instances, cache hit ratio, read replicas, sharding, and rate limits + Unlocked Insights tab).
- **Verification Check:** Run `pnpm typecheck` with 0 errors.

### `TASK-06`: Mount Workbench at `/modules/[slug]`, Loading Skeletons & Verification
- [x] **Completed**
- **Target Files (3 files):**
  - `src/app/modules/[slug]/loading.tsx`
  - `src/app/modules/[slug]/page.tsx`
  - `tests/engine/workbench.test.ts`
- **What to Implement:** Build `src/app/modules/[slug]/loading.tsx` shimmer skeleton, build `src/app/modules/[slug]/page.tsx` fetching module details and mounting the 3-pane workbench, and write Vitest unit tests for Dagre layout and store simulation state. Run full test, typecheck, and build verification, then sync docs.
- **Verification Check:** Run `pnpm test`, `pnpm typecheck`, and `pnpm build` with 0 errors.

---

## 6. Where We Ended & Future Extension Notes *(Filled Upon Completion)*
- **Files Created / Modified:**
  - `src/app/api/modules/[slug]/draft/route.ts`
  - `src/app/api/modules/[slug]/reset/route.ts`
  - `src/lib/dagre-layout.ts`
  - `src/store/use-workbench-store.ts`
  - `src/components/canvas/hardware-node.tsx`
  - `src/components/canvas/animated-traffic-edge.tsx`
  - `src/components/canvas/node-palette.tsx`
  - `src/components/canvas/sim-control-bar.tsx`
  - `src/components/canvas/workbench-canvas.tsx`
  - `src/components/canvas/workbench-left-drawer.tsx`
  - `src/components/canvas/workbench-right-drawer.tsx`
  - `src/app/modules/[slug]/loading.tsx`
  - `src/app/modules/[slug]/page.tsx`
  - `tests/engine/workbench.test.ts`
- **Where This Feature Ended:**
  - `/modules/[slug]` is live with the full 3-pane engineering workbench:
    - **Left Drawer:** Live topology checklist (evaluating structural rules reactively on canvas change) and SLA target cards.
    - **Center Pane:** `@xyflow/react` infinite canvas with custom `HardwareNode` telemetry badges (utilization bar, health glows, live RPS/P95), `AnimatedTrafficEdge` scaling stroke-width and animation speed to load, floating top-left `NodePalette`, and bottom `SimControlBar` (Play/Pause, Step 1 Tick, 1x/5x/10x, Dagre auto-layout, and reset).
    - **Right Drawer:** `HardwareNode` Inspector (tuning instance counts, cache hit ratio, database read replicas, sharding, and rate limits) + Unlocked Insights tab.
    - **Persistence:** Debounced auto-saving to `PUT /api/modules/[slug]/draft` with local fallback.
  - Verified with 15 passing Vitest tests, 0 TypeScript errors, and production Next.js build.
- **How to Extend in the Future (Next Iterations):**
  - **Task `005` (`005-sla-and-topology-grader.md` — `FEAT-04`):** Connect the top header's `"Evaluate Design"` button to `POST /api/modules/[slug]/evaluate` to run the 10-tick SLA stress grader, evaluate failover checks, record `assessment_runs`, and unlock post-completion insights upon passing!

# Task `003`: Directed-Graph Tick Load Simulator (`FEAT-02`)

- **Feature ID:** `FEAT-02`
- **Phase / Priority:** `Phase 2: MVP Core / P0`
- **Status:** `Completed`
- **Started:** `2026-10-23`
- **Completed:** `2026-10-23`

---

## 1. Where This Feature Starts (Baseline & Scope)
- **Goal:** Build the deterministic, pure-TypeScript directed-graph tick load simulator in `src/engine/simulator/` that propagates Read/Write RPS across all 10 infrastructure node categories, models M/M/1 queueing latency, CDN & Redis cache-aside read offloading (both parallel and serial topologies), database read-replica write tax & replication lag, sustained overload (`CRASHED` after >3 ticks), and cyclic/disconnected graph safety.
- **Starting Point / Dependencies:** Builds on `src/engine/types.ts` (Task `001`) and the starter modules in `src/modules/` (Task `002`).
- **Access & Permissions:** Pure TypeScript engine module (`src/engine/simulator/`) with zero UI, Next.js, or database dependencies.
- **Business Rules & Edge Cases:**
  - **Strict Pure-TS Isolation:** Zero imports from React, Next.js, Zustand, or Drizzle ORM; zero `any` types.
  - **Parallel & Serial Cache-Aside Support:**
    - *Parallel Wiring (`api_server -> redis_cache` AND `api_server -> postgres_db/nosql_db`):* `api_server` sends `100%` of surviving Read RPS to `redis_cache`. `redis_cache` absorbs `cacheHitRatio` (default `0.85`), and the sibling database receives only the cache-miss Read RPS `(1 - effectiveCacheHitRatio)` plus `100%` of surviving Write RPS.
    - *Serial Wiring (`api_server -> redis_cache -> postgres_db/nosql_db`):* `redis_cache` forwards only `(1 - cacheHitRatio)` of surviving Read RPS + `100%` of surviving Write RPS along its outgoing edges to the database.
  - **Database Read Replicas, Write Tax, Sharding & Cost:**
    - Each Read Replica (`readReplicaCount`) adds `+100%` of single-instance capacity to **Read** capacity (`readCapacity = baseCapacity * (1 + readReplicaCount)`).
    - Each Read Replica imposes a `12%` replication write tax on primary write load (`effectiveWriteLoad = incomingWriteRps * (1 + 0.12 * readReplicaCount)`) and computes `replicationLagMs` based on write utilization.
    - Each Read Replica adds `0.5 * monthlyCostPerInstance` to monthly infrastructure cost.
    - Enabling `shardingEnabled: true` on `postgres_db` scales read and write capacity by `2x`.
  - **M/M/1 Non-Linear Queueing Latency & `CRASHED` State:**
    - When `utilization <= 0.70`, latency stays near `baseLatencyMs`.
    - When `0.70 < utilization <= 1.0`, M/M/1 queueing multiplier scales latency non-linearly (`DEGRADED` status when `utilization > 0.70`).
    - When `utilization > 1.0`, excess requests are dropped (`droppedRps = effectiveLoad - totalCapacity`), status becomes `OVERLOADED`, and if overloaded for `> 3` consecutive ticks (`overloadStreaks[nodeId] > 3`), status transitions to `CRASHED` (dropping 100% of excess and applying severe latency penalty).
  - **Cycle & Disconnected Sink Safety:**
    - Cyclic edges (`A -> B -> A`) are guarded by a per-path visited-node set and `MAX_GRAPH_HOPS = 16`.
    - If traffic reaches a routing/compute node (`client`, `cdn`, `api_gateway`, `load_balancer`, `api_server`, `message_queue`) that has **no** outgoing edges to a terminal sink (`postgres_db`, `nosql_db`, `worker`, or `redis_cache`), its unpersisted/unhandled traffic is counted toward `overallDroppedRps`.

---

## 2. Data Model / State Changes
*(Uses `SimulationTickInput`, `SimulationTickResult`, `NodeTelemetry`, and `EdgeTelemetry` from `src/engine/types.ts`. No database schema changes.)*

| Function / Module | File | Input | Output |
|---|---|---|---|
| `computeNodeCapacityAndLoad` | `src/engine/simulator/math.ts` | `NodeConfig`, `incomingReadRps`, `incomingWriteRps` | `{ totalCapacity, effectiveLoad, utilization, droppedRps, survivedReadRps, survivedWriteRps, replicationLagMs, bottleneckReason }` |
| `computeNodeLatencyAndStatus` | `src/engine/simulator/math.ts` | `baseLatencyMs`, `utilization`, `overloadStreak` | `{ p95LatencyMs, status }` |
| `computeNodeMonthlyCost` | `src/engine/simulator/math.ts` | `NodeConfig` | `number` (USD/month including read replicas) |
| `simulateTick` | `src/engine/simulator/propagate.ts` | `SimulationTickInput` | `SimulationTickResult` |
| `simulateMultiTickRun` | `src/engine/simulator/propagate.ts` | `Omit<SimulationTickInput, 'tick'>, tickCount` | `SimulationTickResult[]` |

---

## 3. Detailed API Endpoint Contracts
*(No HTTP endpoints in Task `003` — the simulator runs in-browser at 60 FPS via Zustand in Task `004` and server-side in `POST /api/modules/[slug]/evaluate` in Task `005`.)*

---

## 4. UI Screens, Components & Edge States
*(Pure TypeScript Engine task — UI canvas telemetry badges and animated edges are wired in Task `004`.)*

---

## 5. Sequential Microtask Plan (Strict 1–3 File Cap per Microtask)

> **Agent Execution Rules:**
> 1. Execute **only ONE microtask at a time**.
> 2. Never edit files outside the **Target Files (Max 1–3)** listed for the active microtask.
> 3. Run the **Verification Check** after each microtask and mark `- [x]` before starting the next microtask.

### `TASK-01`: Node Capacity, M/M/1 Queueing Latency, Replication Lag & Cost Math
- [x] **Completed**
- **Target Files (1 file):**
  - `src/engine/simulator/math.ts`
- **What to Implement:** Implement deterministic math functions for node capacity, `api_gateway` rate limiting, database read-replica capacity/write-tax/replication-lag, `shardingEnabled` scaling, M/M/1 queueing latency curve (`<= 0.7` healthy, `0.7..1.0` degraded queueing, `> 1.0` overloaded/crashed after 3 ticks), and monthly infrastructure cost calculation.
- **Verification Check:** Run `pnpm typecheck` with 0 errors.

### `TASK-02`: Bounded Topological Graph Traversal & Traffic Propagation Engine
- [x] **Completed**
- **Target Files (2 files):**
  - `src/engine/simulator/propagate.ts`
  - `src/engine/simulator/index.ts`
- **What to Implement:** Implement `simulateTick` and `simulateMultiTickRun` with cycle-safe topological wave propagation, CDN edge read offload, parallel & serial Redis cache-aside read offload, load-balancer splitting, dead-end sink drop detection, and cache-weighted end-to-end P95 latency calculation. Re-export all simulator APIs from `src/engine/simulator/index.ts`.
- **Verification Check:** Run `pnpm typecheck` with 0 errors.

### `TASK-03`: Comprehensive Simulator Unit Test Suite & Completion Sync
- [x] **Completed**
- **Target Files (1 file):**
  - `tests/engine/simulator.test.ts`
- **What to Implement:** Add Vitest unit tests verifying: (1) `01-single-server-bottleneck` starter vs. reference solution metrics, (2) `02-url-shortener` CDN + Redis multi-layer read offload, (3) parallel vs. serial cache-aside parity, (4) DB read replicas write tax, replication lag, and 0.5x cost, (5) `OVERLOADED` -> `CRASHED` transition after >3 consecutive ticks, and (6) cycle detection & dead-end traffic drop handling. Sync Section 6 below, `docs/tasks/README.md`, and `docs/PRD.md`.
- **Verification Check:** Run `pnpm test`, `pnpm typecheck`, and `pnpm build` with 0 errors.

---

## 6. Where We Ended & Future Extension Notes *(Filled Upon Completion)*
- **Files Created / Modified:**
  - `src/engine/simulator/math.ts`
  - `src/engine/simulator/propagate.ts`
  - `src/engine/simulator/index.ts`
  - `tests/engine/simulator.test.ts`
- **Where This Feature Ended:**
  - Pure-TypeScript directed-graph tick load simulator (`simulateTick`, `simulateMultiTickRun`) is live in `src/engine/simulator/` with zero UI/DB dependencies and zero `any` types.
  - Supports all 10 `NodeCategory` types, `1x | 5x | 10x` traffic multipliers, CDN edge read offload, both Parallel (`API -> Redis` + `API -> DB`) and Serial (`API -> Redis -> DB`) cache-aside read offload, async `message_queue -> worker` write routing, database `readReplicaCount` (`+100%` read capacity, `+12%` primary write tax, `replicationLagMs`, `+0.5x` cost), `shardingEnabled` `2x` scaling, M/M/1 queueing latency curve (`HEALTHY` <= 70%, `DEGRADED` 70–100%, `OVERLOADED` > 100%, `CRASHED` after >3 consecutive ticks), and cycle-safe wave traversal.
  - Verified by 6 Vitest unit test suites in `tests/engine/simulator.test.ts` (13 total tests passing across the repo).
- **How to Extend in the Future (Next Iterations):**
  - **Task `004` (`004-interactive-canvas-workbench.md` — `FEAT-03`):** Wire `simulateTick` into the Zustand workbench store (`src/store/use-workbench-store.ts`) to drive live React Flow node telemetry badges, animated traffic edges, hardware inspector controls, and the bottom simulation bar (`Play/Pause`, `Step 1 Tick`, `1x | 5x | 10x`).
  - **Task `005` (`005-sla-and-topology-grader.md` — `FEAT-04`):** Call `simulateMultiTickRun` (10 ticks + single-node failover check) inside `src/engine/grader/` to evaluate learner architectures against `LevelSLAConstraints` and `topologyRules`.

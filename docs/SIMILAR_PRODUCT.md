# Interactive System Design & Database Scaling Simulator

## 1. Overview & Vision
An interactive, simulation-driven learning platform inspired by `sys0.in` designed to teach backend system design, multi-server scaling, and relational/NoSQL database modeling from foundational concepts to elite distributed systems. 

Instead of passive reading, users solve progressive engineering challenges by:
1. Architecting infrastructure on an interactive node-based canvas and subjecting it to simulated real-time traffic loads (RPS) to identify bottlenecks, cascading failures, and SLA violations.
2. Designing normalized/denormalized database schemas and indexing strategies to handle specific read/write query patterns under high concurrency.

---

## 2. Architecture Decision Record (ADR) for Agent Evaluation
The system must maintain a strict separation between the **Simulation/Validation Engine** (pure TypeScript), the **Persistence Layer** (PostgreSQL + Drizzle ORM), and the **Presentation/Canvas Layer** (Next.js App Router).

* **Option A (Recommended for MVP Speed): Modular Full-Stack Next.js**
  * `src/engine/`: Zero-dependency pure TypeScript package containing the directed-graph load simulator and SQL schema validator.
  * `src/db/`: Drizzle ORM schema, migrations, and seed data for progressive modules.
  * `src/app/`: Next.js 15+ (React 19) App Router handling the React Flow UI, Server Actions for state persistence, and Route Handlers for AI architecture reviews.
* **Option B (Scale-Out / Sandbox Ready): Nx Monorepo**
  * `packages/sim-engine`: Shared TypeScript calculation engine.
  * `apps/web`: Next.js frontend.
  * `apps/api`: NestJS backend for heavy background grading, WebSockets, and future containerized SQL/Redis benchmark sandboxes.

*Instruction for Agent:* Default to **Option A** with strict directory isolation inside `src/engine/` so it can be extracted into an Nx workspace package at any time with zero refactoring.

---

## 3. Core Functional Modules

### Module 1: The Directed-Graph Load Simulation Engine (`src/engine/simulator`)
A deterministic, tick-based mathematical engine that takes a graph of infrastructure nodes and edges, injects traffic at entry nodes (`Client`), and calculates real-time system metrics.

* **Supported Node Types:**
  * **Entry:** `Client` (generates configurable Read RPS and Write RPS, payload size, and traffic spikes).
  * **Routing & Edge:** `CDN` (static hit ratio), `APIGateway` (rate limiting, auth overhead), `LoadBalancer` (Round-Robin, Least Connections, Consistent Hashing).
  * **Compute:** `APIServer`, `WorkerNode` (configurable vCPU/RAM tiers, max concurrent requests, base processing latency).
  * **Caching:** `RedisCache` (configurable memory, eviction policy, TTL, cache-aside vs. write-through hit ratio).
  * **Messaging & Async:** `MessageQueue` / `Kafka` (buffer capacity, partition count, consumer lag calculation, backpressure).
  * **Storage:** `PostgreSQL`, `NoSQLKeyValue`, `ObjectStorage` (max IOPS, connection pool limit, read replica count, replication lag, sharding key efficiency).
* **Simulation Mechanics (Per Tick):**
  * **Traffic Propagation:** Traverse the graph topologically from `Client` nodes. Handle cyclic graphs or unrouted traffic gracefully.
  * **Utilization Formula:** `utilization = incoming_load / max_capacity`.
  * **Latency Curve (Non-Linear Degradation):** When `utilization <= 0.7`, latency remains near `base_latency`. Between `0.7` and `1.0`, apply an exponential queueing multiplier (M/M/1 queue approximation). Above `1.0`, mark node status as `OVERLOADED` (or `CRASHED` if sustained for >3 ticks) and drop excess requests (`HTTP 503` / `504`).
  * **Database Specifics:** Distinguish between Read RPS and Write RPS. Writing to a Primary DB with 3 Read Replicas must incur a replication write tax and calculate replication lag under heavy write load.

### Module 2: Interactive System Design Canvas (`src/components/canvas`)
Built on `@xyflow/react` (React Flow) and backed by a `Zustand` store.

* **Custom Hardware Nodes:** Each node displays live telemetry badges during simulation:
  * Incoming Read/Write RPS (`12.4k r/s | 1.2k w/s`).
  * Utilization progress bar (Green <70%, Amber 70–95%, Red >95%).
  * Current P95 Latency (`ms`) and Error Rate (`%`).
  * Quick-inspector drawer to upgrade vertical hardware tiers, add horizontal replicas, or configure node properties (e.g., cache hit ratio, sharding keys).
* **Animated Traffic Edges:** Edge stroke width and animation speed dynamically scale with the volume of traffic flowing through the connection. Edges turn red when dropping packets or hitting connection limits.
* **Simulation Control Bar:** Play, Pause, Step Forward (1 tick), Traffic Multiplier Slider (`1x`, `5x`, `10x` chaos spike), and an Auto-Layout button (using `dagre` or `elkjs`).

### Module 3: Interactive Database Schema & Query Designer (`src/engine/schema-lab`)
A dedicated workspace for data modeling challenges (e.g., designing an e-commerce catalog, course platform, or high-throughput ledger).

* **Visual ER & Table Builder:** Users create tables, define columns, data types, Primary Keys, Foreign Keys, Unique constraints, and Composite Indexes.
* **Workload Evaluator:** Each database challenge defines a set of required queries (e.g., *"Fetch user feed sorted by `created_at` for 50k concurrent users"*) along with target table row counts (e.g., `100,000,000 rows`).
* **Static AST & Cost Analyzer:** Evaluates the user's schema against the target queries:
  * Detects missing indexes (flags full table scans `Seq Scan` on large tables).
  * Detects N+1 relationship traps, missing foreign keys, or over-indexing write-heavy tables.
  * Outputs estimated query cost and pass/fail assertions for each requirement.

### Module 4: Progressive Learning Path & SLA Grader (`src/engine/grader`)
Challenges are organized into a structured, progressive skill tree from foundational to elite.

* **Tier 1 — Foundations (Single Server to Horizontal Scale):**
  * *Task 1.1:* The Single Server Bottleneck (1 Client -> 1 API -> 1 DB under 2,000 RPS).
  * *Task 1.2:* Horizontal Compute & Load Balancing (Scaling stateless API servers to handle 15,000 RPS).
  * *Task 1.3:* Offloading Reads with Redis Caching (Surviving a 50,000 Read RPS viral spike).
  * *Task 1.4:* Database Read Replicas & Replication Lag.
* **Tier 2 — Asynchronous & High-Write Systems:**
  * *Task 2.1:* Smoothing Write Spikes with Message Queues & Background Workers.
  * *Task 2.2:* Rate Limiting & API Gateway Protection against DDoS/noisy neighbors.
  * *Task 2.3:* Database Sharding & Partitioning (Fixing hot-partition bottlenecks).
* **Tier 3 — Elite Distributed Systems & Real-World Labs:**
  * *Task 3.1:* URL Shortener (Bitly) — 100k Read RPS, collision-free writes, low-latency redirects.
  * *Task 3.2:* High-Concurrency Event/Ticket Booking — Preventing double-booking under flash-sale load with distributed locks and seat-hold queues.
  * *Task 3.3:* Celebrity Fan-Out Feed (Instagram/X) — Hybrid push/pull architecture.
  * *Task 3.4:* Multi-Region Active-Active Failover.

* **Automated SLA Grader:**
  To pass a level, the user's architecture must run for a 10-tick stress test and satisfy all level constraints:
  * `Total Throughput >= Target RPS`
  * `Overall P95 Latency <= Max Allowed ms`
  * `Error Rate == 0%`
  * `Monthly Infrastructure Cost <= Budget Limit ($)`
  * `Chaos Check:` Survives simulated failure of any single compute node (if High Availability is required).

---

## 4. Core TypeScript Data Contracts

```typescript
// src/engine/types.ts

export type NodeCategory = 
  | 'client' 
  | 'load_balancer' 
  | 'api_gateway'
  | 'api_server' 
  | 'worker' 
  | 'redis_cache' 
  | 'message_queue' 
  | 'postgres_db' 
  | 'nosql_db' 
  | 'cdn';

export interface HardwareSpec {
  instances: number;          // Horizontal scaling count (1 to N)
  maxRpsPerInstance: number;  // Capacity before degradation
  baseLatencyMs: number;      // Processing time at low load
  monthlyCostPerInstance: number;
}

export interface NodeConfig {
  id: string;
  type: NodeCategory;
  label: string;
  spec: HardwareSpec;
  // Specific behavioral configs
  cacheHitRatio?: number;     // 0.0 to 1.0 (for Cache/CDN)
  readReplicaCount?: number;  // For Databases
  shardingEnabled?: boolean;
  rateLimitRps?: number;      // For API Gateway
}

export interface NodeTelemetry {
  nodeId: string;
  incomingReadRps: number;
  incomingWriteRps: number;
  effectiveUtilization: number; // 0.0 to 1.0+
  p95LatencyMs: number;
  droppedRps: number;
  status: 'HEALTHY' | 'DEGRADED' | 'OVERLOADED' | 'CRASHED';
  bottleneckReason?: string;
}

export interface LevelSLAConstraints {
  targetReadRps: number;
  targetWriteRps: number;
  maxP95LatencyMs: number;
  maxErrorRatePercent: number;
  maxMonthlyBudgetUsd: number;
  requireSingleNodeFailover: boolean;
  requiredNodeTypes?: NodeCategory[];
}
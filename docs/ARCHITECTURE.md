# System Architecture: learn-system32

## 1. High-Level Architecture Diagram

```mermaid
flowchart LR
  subgraph Modules["Declarative Module Registry (agy-authored)"]
    ModFiles["src/modules/<slug>/index.ts\n(Requirements, Starter Graph, SLA Rules, Insights)"]
  end

  subgraph UI["Presentation & Workbench Layer (Next.js 15 App Router)"]
    Dashboard["/ (Skill-Tree Dashboard)"]
    Workbench["/modules/[slug] (3-Pane Canvas Workbench)"]
    Canvas["@xyflow/react Canvas + Hardware Nodes"]
    Store["Zustand Workbench & Telemetry Store"]
  end

  subgraph Engine["Pure TypeScript Engine (src/engine/ — Zero UI/DB Deps)"]
    Simulator["Directed-Graph Tick Simulator\n(src/engine/simulator)"]
    Grader["SLA & Topology Grader\n(src/engine/grader)"]
    SchemaLab["DB Schema & Query Cost Lab\n(src/engine/schema-lab — P1)"]
  end

  subgraph Persistence["API & Persistence Layer"]
    RouteHandlers["Next.js Route Handlers / Server Actions"]
    Drizzle["Drizzle ORM (src/db/)"]
    Postgres[("PostgreSQL\n(Progress, Saved Canvases, Assessment Runs)")]
  end

  ModFiles --> Dashboard
  ModFiles --> Workbench
  Workbench --> Canvas <--> Store
  Store <--> Simulator
  Store --> Grader
  Workbench --> RouteHandlers --> Drizzle --> Postgres
  RouteHandlers --> Grader
```

---

## 2. Core Data Model & Schema Specifications

### 2.1 Entity Relationship Diagram (`erDiagram`)

```mermaid
erDiagram
  MODULE_PROGRESS ||--o{ CANVAS_ATTEMPTS : saves
  MODULE_PROGRESS ||--o{ ASSESSMENT_RUNS : records

  MODULE_PROGRESS {
    uuid id PK
    string module_slug UK "Matches src/modules/<slug>"
    string status "not_started | in_progress | completed"
    boolean insights_unlocked
    int best_score_percent
    int best_p95_latency_ms
    int lowest_monthly_cost_usd
    timestamp first_completed_at
    timestamp updated_at
  }

  CANVAS_ATTEMPTS {
    uuid id PK
    string module_slug FK
    string label "e.g. Auto-save or Manual Snapshot"
    jsonb nodes_json "React Flow NodeConfig[]"
    jsonb edges_json "React Flow Edge[]"
    jsonb schema_lab_json "Nullable P1 DB Schema Lab state"
    boolean is_active_draft
    timestamp created_at
    timestamp updated_at
  }

  ASSESSMENT_RUNS {
    uuid id PK
    string module_slug FK
    uuid attempt_id FK
    boolean passed
    int score_percent
    int achieved_read_rps
    int achieved_write_rps
    int p95_latency_ms
    numeric error_rate_percent
    int estimated_monthly_cost_usd
    jsonb sla_results_json "Detailed pass/fail per SLA constraint"
    jsonb topology_results_json "Detailed pass/fail per structural rule"
    text ai_mentor_feedback "Nullable P1 AI review markdown"
    timestamp created_at
  }
```

### 2.2 Table Specifications, Indexes, Enums & Constraints

| Table | Enums / Check Constraints | Unique & Composite Indexes | Foreign Key & Cascade Rules | Audit Columns |
|---|---|---|---|---|
| `module_progress` | `status`: `('not_started', 'in_progress', 'completed')`, `best_score_percent BETWEEN 0 AND 100` | `UNIQUE(module_slug)` | — | `first_completed_at` (nullable), `updated_at` |
| `canvas_attempts` | `is_active_draft`: `boolean` | `INDEX(module_slug, is_active_draft, updated_at DESC)` | `module_slug -> module_progress.module_slug ON DELETE CASCADE` | `created_at`, `updated_at` |
| `assessment_runs` | `passed`: `boolean`, `score_percent BETWEEN 0 AND 100` | `INDEX(module_slug, created_at DESC)` | `module_slug -> module_progress.module_slug ON DELETE CASCADE`, `attempt_id -> canvas_attempts.id ON DELETE SET NULL` | `created_at` |

### 2.3 Declarative Module Contract (`src/modules/<slug>/index.ts`)
Every module created by `agy` in `src/modules/<slug>/` adheres to the following pure-TypeScript contract (`src/engine/types.ts`):
- **`metadata`**: `slug`, `title`, `subtitle`, `tier` (`'tier-1-foundations' | 'tier-2-async' | 'tier-3-distributed'`), `order`, `difficulty` (`'Beginner' | 'Intermediate' | 'Advanced'`), `estimatedMinutes`, `tags`.
- **`conceptBrief`**: Problem context, back-of-the-envelope numbers (Read RPS, Write RPS, payload size, storage growth), and key mental models.
- **`requirements`**: Functional requirements list, non-functional requirements list, and `sla: LevelSLAConstraints`.
- **`starterGraph`**: Initial `nodes: CanvasNode[]` and `edges: CanvasEdge[]` plus `allowedNodeTypes?: NodeCategory[]`.
- **`topologyRules`**: Array of deterministic structural validation rules (`id`, `description`, `validate(nodes, edges) => { passed: boolean; reason?: string }`).
- **`referenceSolution`**: Optimal `nodes`, `edges`, and step-by-step explanation of why the reference architecture passes all SLAs.
- **`postCompletionInsights`**: Deep-dive architectural sections (`title`, `markdownContent`, `realWorldExamples`, `commonAntiPatterns`, `interviewTakeaways`).

---

## 3. High-Level API Endpoints Summary

| Feature ID | Method | Path | Query Params (Optional) | Auth | Summary Description |
|---|---|---|---|---|---|
| `FEAT-01` | `GET` | `/api/modules` | `?tier=&status=` | Local (None) | Lists all auto-discovered `src/modules/` merged with PostgreSQL `module_progress`. |
| `FEAT-01` | `GET` | `/api/modules/[slug]` | None | Local (None) | Returns full module definition, active draft canvas from `canvas_attempts`, and recent `assessment_runs`. |
| `FEAT-03` | `PUT` | `/api/modules/[slug]/draft` | None | Local (None) | Upserts the learner's active React Flow canvas (`nodes_json`, `edges_json`) and sets progress to `in_progress`. |
| `FEAT-03` | `POST` | `/api/modules/[slug]/reset` | None | Local (None) | Resets the active draft canvas back to the module's `starterGraph`. |
| `FEAT-04` | `POST` | `/api/modules/[slug]/evaluate` | None | Local (None) | Runs the deterministic 10-tick stress simulator + topology grader, records an `assessment_runs` row, and unlocks `postCompletionInsights` if `passed === true`. |
| `FEAT-07` | `POST` | `/api/modules/[slug]/ai-review` | None | Local (None) | *(P1)* Streams an AI Architecture Mentor critique using Vercel AI SDK (`@ai-sdk/google` / OpenAI). |

---

## 4. Frontend Layout Shell, Route Summary & Navigation Flow

### 4.1 App Layout Shell & Theme Strategy
- **Primary Layout Shell:**
  - **Dashboard (`/`)**: Top header bar (platform stats, completed modules count, tier filter) + progressive skill-tree grid organized by Tier 1, Tier 2, and Tier 3.
  - **Interactive Workbench (`/modules/[slug]`)**: Full-viewport (`100dvh`) 3-pane engineering workbench:
    - **Top Workbench Header:** Back to Dashboard link, Module Title & Difficulty Badge, live Monthly Cost vs. Budget counter, and `Evaluate My Design` primary CTA.
    - **Left Collapsible Drawer (340px):** Tabs for `Concept & Requirements`, `SLA & Topology Checklist`, and `Assessment History`.
    - **Center Interactive Canvas (`flex-1`):** `@xyflow/react` infinite canvas with floating Top-Left Hardware Node Palette and floating Bottom Simulation Control Bar (`Play/Pause`, `Step 1 Tick`, `Traffic Multiplier: 1x | 5x | 10x`, `Auto-Layout`).
    - **Right Collapsible Drawer (380px):** Tabs for `Node Hardware Inspector` (instances, tier, cache hit ratio, read replicas, sharding) and `Post-Completion Insights & Reference Architecture` (unlocked upon passing or via Hint toggle).
- **Theme & Styling:** Dark engineering theme (`slate-950` canvas grid, emerald/amber/rose status telemetry badges) built with **Tailwind CSS** and **shadcn/ui** components.

### 4.2 High-Level Screen & Route Inventory

| Feature ID | Screen / Route | Access Level | State / Data Strategy | Summary Purpose |
|---|---|---|---|---|
| `FEAT-01` | `/` | Local (Public) | Next.js Server Component + Drizzle query | Progressive system design skill tree, module cards, completion badges, and SLA high scores. |
| `FEAT-03` / `04` / `05` | `/modules/[slug]` | Local (Public) | Hybrid SSR initial load + `Zustand` live workbench store | Interactive React Flow architecture simulator, hardware inspector, SLA assessment grader, and unlocked deep-dive insights. |

### 4.3 Page Navigation & User Flow Diagram

```mermaid
flowchart TD
  Dashboard["/ (Skill-Tree Dashboard)"] -->|"Select Module (e.g. URL Shortener)"| Workbench["/modules/[slug] (3-Pane Workbench)"]
  Workbench -->|"Read Concept & SLA Targets"| LeftDrawer["Left Drawer: Requirements & Checklist"]
  Workbench -->|"Drag Nodes & Connect Edges"| Canvas["Center Canvas: @xyflow/react"]
  Canvas -->|"Select Node"| Inspector["Right Drawer: Hardware Spec Inspector"]
  Canvas -->|"Play / 5x Spike"| SimBar["Bottom Bar: Real-Time Tick Simulation"]
  Workbench -->|"Click 'Evaluate My Design'"| GraderModal["10-Tick SLA & Topology Assessment Run"]
  GraderModal -->|"Failed SLA / Missing Rule"| BottleneckFeedback["Actionable Bottleneck & Topology Hints"]
  BottleneckFeedback --> Canvas
  GraderModal -->|"Passed All Checks!"| InsightsTab["Right Drawer: Unlocked Deep-Dive Insights & Reference Solution Diff"]
```

---

## 5. Critical Execution Flow (`sequenceDiagram`)

```mermaid
sequenceDiagram
  actor Learner
  participant Canvas as Workbench UI (Zustand + React Flow)
  participant Sim as Tick Simulator (src/engine/simulator)
  participant API as POST /api/modules/[slug]/evaluate
  participant Grader as SLA & Topology Grader (src/engine/grader)
  participant DB as PostgreSQL (Drizzle ORM)

  Learner->>Canvas: Drag nodes (LB, API, Redis, Postgres) & configure specs
  Canvas->>Sim: Run live tick simulation (1x / 5x / 10x RPS)
  Sim-->>Canvas: Return NodeTelemetry[] (utilization, P95 latency, dropped RPS)
  Learner->>Canvas: Click "Evaluate My Design"
  Canvas->>API: Submit { nodes, edges }
  API->>Grader: evaluateModuleDesign(moduleDef, nodes, edges)
  Grader->>Sim: Execute 10-tick stress test + single-node failover check
  Grader-->>API: Return AssessmentResult (passed, SLA breakdown, topology checks)
  API->>DB: Save canvas_attempts & assessment_runs + update module_progress
  DB-->>API: Persisted record
  API-->>Canvas: Return AssessmentResult + unlock postCompletionInsights
```

---

## 6. Technology Stack Matrix & Folder Layout

| Layer | Chosen Technology | Rationale |
|---|---|---|
| **Project Scope** | Mode C — Application Code Only (Modular Full-Stack Next.js) | Local-first personal learning platform without auth walls or DevOps bloat, ready for future cloud deployment. |
| **Frontend Framework & UI** | Next.js 15+ (App Router, React 19, TypeScript) + Tailwind CSS + shadcn/ui | Unified full-stack TypeScript workflow with rich dark-mode engineering UI primitives. |
| **Interactive Canvas & Layout** | `@xyflow/react` (React Flow v12) + `@dagrejs/dagre` + `lucide-react` | Industry-standard node-graph canvas with custom hardware node badges, animated traffic edges, and auto-layout. |
| **State Management** | `Zustand` | High-frequency tick simulation updates without full React tree re-renders; clean separation of canvas state and simulation telemetry. |
| **Simulation & Grading Engine** | Pure TypeScript (`src/engine/`) | Zero dependency on React or Next.js so it can be unit-tested in isolation and extracted into an Nx package anytime. |
| **Database & ORM** | PostgreSQL + Drizzle ORM (`drizzle-orm`, `drizzle-kit`, `pg`) | Type-safe SQL queries and `JSONB` storage for React Flow graphs and assessment telemetry snapshots. |
| **AI Integration (P1)** | Vercel AI SDK (`ai`, `@ai-sdk/google`) | Clean streaming architecture critiques for the P1 AI Mentor feature. |
| **Testing & Verification** | Vitest (Unit tests for `src/engine/simulator` & `src/engine/grader`) + Drizzle DB Seed | Balanced verification ensuring deterministic math and grading rules are 100% reliable. |

```text
learn-system32/
├── docs/
│   ├── PRD.md                           # Product vision & Master Feature Registry
│   ├── ARCHITECTURE.md                  # System diagram, DB schema, APIs & UI navigation
│   ├── SIMILAR_PRODUCT.md               # Reference specification (sys0.in inspiration)
│   ├── adr/                             # Architecture Decision Records
│   └── tasks/                           # Master Task Index & microtask specs
├── src/
│   ├── engine/                          # Pure TypeScript Engine (Zero React/Next/DB imports)
│   │   ├── types.ts                     # Core HardwareSpec, NodeConfig, NodeTelemetry, LearningModule types
│   │   ├── simulator/                   # Topological traffic propagation & M/M/1 latency calculator
│   │   ├── grader/                      # 10-tick SLA stress evaluator & structural topology rule checker
│   │   └── schema-lab/                  # (P1) DB schema AST & query cost analyzer
│   ├── modules/                         # Auto-discovered learning modules authored by agy
│   │   ├── index.ts                     # Central module registry loader & sorter
│   │   ├── 01-single-server-bottleneck/ # Foundational module 1
│   │   │   └── index.ts
│   │   └── 02-url-shortener/            # Real-world system design module (Bitly-style URL Shortener)
│   │       └── index.ts
│   ├── db/                              # PostgreSQL + Drizzle ORM layer
│   │   ├── index.ts                     # Database connection pool
│   │   ├── schema.ts                    # module_progress, canvas_attempts, assessment_runs tables
│   │   └── seed.ts                      # Syncs initial module_progress rows from src/modules/
│   ├── store/                           # Client state
│   │   └── use-workbench-store.ts       # Zustand store for React Flow graph, active tick & telemetry
│   ├── components/
│   │   ├── ui/                          # shadcn/ui primitives
│   │   ├── dashboard/                   # Skill-tree cards, tier filters, progress stats
│   │   └── canvas/                      # HardwareNode, AnimatedTrafficEdge, NodeInspector, SimControlBar
│   └── app/
│       ├── layout.tsx                   # Root dark engineering theme layout
│       ├── page.tsx                     # / (Skill-Tree Dashboard)
│       ├── modules/[slug]/page.tsx      # /modules/[slug] (Interactive Workbench)
│       └── api/modules/                 # Route handlers for saving drafts & running assessments
├── tests/
│   └── engine/                          # Vitest unit tests for simulator & grader
├── AGENTS.md                            # Agent workflow rules & module authoring guide
├── .env.example                         # Environment variable template
├── drizzle.config.ts                    # Drizzle Kit configuration
└── package.json
```

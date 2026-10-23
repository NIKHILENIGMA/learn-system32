/**
 * Pure TypeScript Core Engine Contracts & Hardware Preset Catalog.
 *
 * ARCHITECTURAL BOUNDARY:
 * This file must remain 100% free of React, Next.js, Zustand, or Drizzle ORM imports
 * so `src/engine/` stays portable and deterministically unit-testable in isolation.
 */

export const NODE_CATEGORIES = [
  "client",
  "load_balancer",
  "api_gateway",
  "api_server",
  "worker",
  "redis_cache",
  "message_queue",
  "postgres_db",
  "nosql_db",
  "cdn",
] as const;

export type NodeCategory = (typeof NODE_CATEGORIES)[number];

export interface HardwareSpec {
  /** Horizontal scaling instance count (1 to N) */
  instances: number;
  /** Maximum sustainable requests/sec per instance before overload (>100% utilization) */
  maxRpsPerInstance: number;
  /** Baseline processing latency in milliseconds when utilization <= 70% */
  baseLatencyMs: number;
  /** Estimated infrastructure cost in USD per month per instance */
  monthlyCostPerInstance: number;
}

export interface NodeConfig {
  id: string;
  type: NodeCategory;
  label: string;
  spec: HardwareSpec;
  /** 0.0 to 1.0 cache hit offload ratio (for `redis_cache` and `cdn`) */
  cacheHitRatio?: number;
  /** Number of read replicas attached to a database primary (`postgres_db` / `nosql_db`) */
  readReplicaCount?: number;
  /** Whether horizontal partitioning/sharding is enabled (`postgres_db` / `nosql_db`) */
  shardingEnabled?: boolean;
  /** Maximum allowed incoming RPS before throttling (`api_gateway`) */
  rateLimitRps?: number;
}

export interface CanvasNodePosition {
  x: number;
  y: number;
}

export interface CanvasNode {
  id: string;
  type: NodeCategory;
  position: CanvasNodePosition;
  data: NodeConfig;
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export type NodeHealthStatus =
  | "HEALTHY"
  | "DEGRADED"
  | "OVERLOADED"
  | "CRASHED";

export interface NodeTelemetry {
  nodeId: string;
  incomingReadRps: number;
  incomingWriteRps: number;
  /** Ratio of effective load to total capacity (0.0 to 1.0+) */
  effectiveUtilization: number;
  p95LatencyMs: number;
  droppedRps: number;
  status: NodeHealthStatus;
  bottleneckReason?: string;
  /** Estimated replication lag in milliseconds for databases with read replicas under write load */
  replicationLagMs?: number;
}

export interface EdgeTelemetry {
  edgeId: string;
  sourceId: string;
  targetId: string;
  readRps: number;
  writeRps: number;
  droppedRps: number;
  isOverloaded: boolean;
}

export type TrafficMultiplier = 1 | 5 | 10;

export interface SimulationTickInput {
  tick: number;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  targetReadRps: number;
  targetWriteRps: number;
  trafficMultiplier?: TrafficMultiplier;
  /** Tracks consecutive overloaded ticks per nodeId to trigger CRASHED state (>3 ticks) */
  previousOverloadStreaks?: Record<string, number>;
}

export interface SimulationTickResult {
  tick: number;
  nodeTelemetry: Record<string, NodeTelemetry>;
  edgeTelemetry: Record<string, EdgeTelemetry>;
  overallReadRps: number;
  overallWriteRps: number;
  overallDroppedRps: number;
  overallP95LatencyMs: number;
  overallErrorRatePercent: number;
  estimatedMonthlyCostUsd: number;
  overloadStreaks: Record<string, number>;
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

export interface TopologyRuleValidationResult {
  passed: boolean;
  reason?: string;
}

export interface TopologyRule {
  id: string;
  description: string;
  validate: (
    nodes: CanvasNode[],
    edges: CanvasEdge[],
  ) => TopologyRuleValidationResult;
}

export interface SLACheckResult {
  id:
    | "throughput"
    | "p95_latency"
    | "error_rate"
    | "monthly_budget"
    | "single_node_failover"
    | "required_node_types";
  label: string;
  passed: boolean;
  expected: string;
  actual: string;
  reason?: string;
}

export interface TopologyCheckResult {
  ruleId: string;
  description: string;
  passed: boolean;
  reason?: string;
}

export interface AssessmentResult {
  passed: boolean;
  scorePercent: number;
  achievedReadRps: number;
  achievedWriteRps: number;
  p95LatencyMs: number;
  errorRatePercent: number;
  estimatedMonthlyCostUsd: number;
  slaResults: SLACheckResult[];
  topologyResults: TopologyCheckResult[];
  bottleneckDiagnostics: string[];
}

export type ModuleTier =
  | "tier-1-foundations"
  | "tier-2-async"
  | "tier-3-distributed";

export type ModuleDifficulty = "Beginner" | "Intermediate" | "Advanced";

export interface ModuleMetadata {
  slug: string;
  title: string;
  subtitle: string;
  tier: ModuleTier;
  order: number;
  difficulty: ModuleDifficulty;
  estimatedMinutes: number;
  tags: string[];
}

export interface ConceptBrief {
  problemStatement: string;
  backOfEnvelope: {
    readRps: number;
    writeRps: number;
    averagePayloadBytes: number;
    dailyStorageGrowthGb?: number;
  };
  mentalModels: string[];
}

export interface ModuleRequirements {
  functional: string[];
  nonFunctional: string[];
  sla: LevelSLAConstraints;
}

export interface StarterGraph {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  allowedNodeTypes?: NodeCategory[];
}

export interface ReferenceSolution {
  summary: string;
  whyItWorks: string[];
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export interface InsightSection {
  title: string;
  markdownContent: string;
}

export interface PostCompletionInsights {
  architecturalDeepDive: InsightSection[];
  realWorldExamples: string[];
  commonAntiPatterns: string[];
  interviewTakeaways: string[];
}

export interface LearningModule {
  metadata: ModuleMetadata;
  conceptBrief: ConceptBrief;
  requirements: ModuleRequirements;
  starterGraph: StarterGraph;
  topologyRules: TopologyRule[];
  referenceSolution: ReferenceSolution;
  postCompletionInsights: PostCompletionInsights;
}

export interface NodeCategoryCatalogEntry {
  type: NodeCategory;
  defaultLabel: string;
  categoryGroup: "entry" | "edge" | "compute" | "caching" | "messaging" | "storage";
  description: string;
  defaultSpec: HardwareSpec;
  defaultBehavior?: Pick<
    NodeConfig,
    "cacheHitRatio" | "readReplicaCount" | "shardingEnabled" | "rateLimitRps"
  >;
}

/**
 * Deterministic baseline hardware presets for all 10 infrastructure node categories.
 */
export const DEFAULT_NODE_SPECS: Readonly<
  Record<NodeCategory, NodeCategoryCatalogEntry>
> = {
  client: {
    type: "client",
    defaultLabel: "Client Traffic Generator",
    categoryGroup: "entry",
    description: "Injects Read RPS and Write RPS into connected edge or compute nodes.",
    defaultSpec: {
      instances: 1,
      maxRpsPerInstance: 1_000_000,
      baseLatencyMs: 1,
      monthlyCostPerInstance: 0,
    },
  },
  cdn: {
    type: "cdn",
    defaultLabel: "Global CDN Edge",
    categoryGroup: "edge",
    description: "Caches static/read-heavy assets at the edge and offloads origin read traffic.",
    defaultSpec: {
      instances: 1,
      maxRpsPerInstance: 100_000,
      baseLatencyMs: 5,
      monthlyCostPerInstance: 80,
    },
    defaultBehavior: {
      cacheHitRatio: 0.8,
    },
  },
  api_gateway: {
    type: "api_gateway",
    defaultLabel: "API Gateway",
    categoryGroup: "edge",
    description: "Enforces rate limits, authentication, and request routing at the perimeter.",
    defaultSpec: {
      instances: 1,
      maxRpsPerInstance: 25_000,
      baseLatencyMs: 4,
      monthlyCostPerInstance: 90,
    },
    defaultBehavior: {
      rateLimitRps: 25_000,
    },
  },
  load_balancer: {
    type: "load_balancer",
    defaultLabel: "L7 Load Balancer",
    categoryGroup: "edge",
    description: "Distributes incoming traffic evenly across downstream stateless compute instances.",
    defaultSpec: {
      instances: 1,
      maxRpsPerInstance: 50_000,
      baseLatencyMs: 2,
      monthlyCostPerInstance: 60,
    },
  },
  api_server: {
    type: "api_server",
    defaultLabel: "Stateless API Server",
    categoryGroup: "compute",
    description: "Executes synchronous business logic and queries downstream caches or databases.",
    defaultSpec: {
      instances: 1,
      maxRpsPerInstance: 2_500,
      baseLatencyMs: 12,
      monthlyCostPerInstance: 120,
    },
  },
  worker: {
    type: "worker",
    defaultLabel: "Background Worker",
    categoryGroup: "compute",
    description: "Consumes asynchronous jobs from a message queue to smooth heavy write workloads.",
    defaultSpec: {
      instances: 1,
      maxRpsPerInstance: 2_000,
      baseLatencyMs: 20,
      monthlyCostPerInstance: 100,
    },
  },
  redis_cache: {
    type: "redis_cache",
    defaultLabel: "Redis In-Memory Cache",
    categoryGroup: "caching",
    description: "Sub-millisecond key-value cache that absorbs read spikes via cache-aside hits.",
    defaultSpec: {
      instances: 1,
      maxRpsPerInstance: 50_000,
      baseLatencyMs: 2,
      monthlyCostPerInstance: 150,
    },
    defaultBehavior: {
      cacheHitRatio: 0.85,
    },
  },
  message_queue: {
    type: "message_queue",
    defaultLabel: "Kafka / Message Queue",
    categoryGroup: "messaging",
    description: "Buffers high-velocity write bursts and decouples producers from worker consumers.",
    defaultSpec: {
      instances: 1,
      maxRpsPerInstance: 40_000,
      baseLatencyMs: 4,
      monthlyCostPerInstance: 180,
    },
  },
  postgres_db: {
    type: "postgres_db",
    defaultLabel: "PostgreSQL Primary",
    categoryGroup: "storage",
    description: "ACID relational database supporting read replicas and horizontal sharding.",
    defaultSpec: {
      instances: 1,
      maxRpsPerInstance: 1_500,
      baseLatencyMs: 18,
      monthlyCostPerInstance: 280,
    },
    defaultBehavior: {
      readReplicaCount: 0,
      shardingEnabled: false,
    },
  },
  nosql_db: {
    type: "nosql_db",
    defaultLabel: "NoSQL Key-Value Store",
    categoryGroup: "storage",
    description: "High-throughput partitioned key-value/document store optimized for scale-out writes.",
    defaultSpec: {
      instances: 1,
      maxRpsPerInstance: 8_000,
      baseLatencyMs: 8,
      monthlyCostPerInstance: 320,
    },
    defaultBehavior: {
      readReplicaCount: 0,
      shardingEnabled: true,
    },
  },
};

/**
 * Creates a fresh `NodeConfig` populated with the deterministic defaults for `type`.
 */
export function createDefaultNodeConfig(
  type: NodeCategory,
  id: string,
  customLabel?: string,
): NodeConfig {
  const preset = DEFAULT_NODE_SPECS[type];
  return {
    id,
    type,
    label: customLabel ?? preset.defaultLabel,
    spec: { ...preset.defaultSpec },
    ...(preset.defaultBehavior ? { ...preset.defaultBehavior } : {}),
  };
}

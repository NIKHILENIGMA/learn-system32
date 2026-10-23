import {
  createDefaultNodeConfig,
  type CanvasEdge,
  type CanvasNode,
  type LearningModule,
} from "@/engine/types";

function hasDirectOrIndirectEdge(
  edges: CanvasEdge[],
  fromIds: Set<string>,
  toIds: Set<string>,
): boolean {
  return edges.some(
    (edge) => fromIds.has(edge.source) && toIds.has(edge.target),
  );
}

function getNodeIdsByType(
  nodes: CanvasNode[],
  type: CanvasNode["type"],
): Set<string> {
  return new Set(
    nodes.filter((node) => node.type === type).map((node) => node.id),
  );
}

export const singleServerBottleneckModule: LearningModule = {
  metadata: {
    slug: "01-single-server-bottleneck",
    title: "The Single Server Bottleneck",
    subtitle:
      "Transform a fragile single-box monolith into a resilient, horizontally scaled architecture surviving 4,000 RPS.",
    tier: "tier-1-foundations",
    order: 1,
    difficulty: "Beginner",
    estimatedMinutes: 15,
    tags: [
      "Load Balancing",
      "Horizontal Scaling",
      "Redis Cache",
      "High Availability",
    ],
  },
  conceptBrief: {
    problemStatement:
      "Your startup launched on a single Stateless API Server (2,500 RPS capacity) talking directly to a single PostgreSQL Primary (1,500 RPS capacity). Traffic has surged to 3,500 Read RPS and 500 Write RPS. Both the compute layer and database are overloaded, dropping requests and causing cascading P95 latency spikes.",
    backOfEnvelope: {
      readRps: 3_500,
      writeRps: 500,
      averagePayloadBytes: 2_048,
      dailyStorageGrowthGb: 4.3,
    },
    mentalModels: [
      "Vertical vs. Horizontal Scaling: A single API server caps out at 2,500 RPS and represents a Single Point of Failure (SPOF). Adding an L7 Load Balancer in front of multiple stateless API instances eliminates compute SPOF.",
      "Cache-Aside Read Offload: PostgreSQL Primary caps out at 1,500 RPS. Placing a Redis Cache (85% hit ratio) between API Servers and PostgreSQL offloads ~2,975 Read RPS, leaving only ~525 Read RPS + 500 Write RPS hitting the database.",
      "M/M/1 Queueing Knee: Infrastructure latency stays flat until ~70% utilization, then degrades exponentially as utilization approaches 100%.",
    ],
  },
  requirements: {
    functional: [
      "Serve 3,500 Read RPS and 500 Write RPS from Client traffic without dropping packets.",
      "Route client traffic through an L7 Load Balancer to horizontally scaled API Servers.",
      "Offload repetitive read queries with an in-memory Redis Cache before querying PostgreSQL.",
    ],
    nonFunctional: [
      "Maintain end-to-end P95 latency at or below 45ms.",
      "Maintain 0% error/drop rate across a 10-tick sustained traffic run.",
      "Survive the failure of any single compute instance (require >= 2 API Server instances).",
      "Keep total monthly infrastructure cost at or below $850/month.",
    ],
    sla: {
      targetReadRps: 3_500,
      targetWriteRps: 500,
      maxP95LatencyMs: 45,
      maxErrorRatePercent: 0,
      maxMonthlyBudgetUsd: 850,
      requireSingleNodeFailover: true,
      requiredNodeTypes: [
        "client",
        "load_balancer",
        "api_server",
        "redis_cache",
        "postgres_db",
      ],
    },
  },
  starterGraph: {
    allowedNodeTypes: [
      "client",
      "load_balancer",
      "api_server",
      "redis_cache",
      "postgres_db",
    ],
    nodes: [
      {
        id: "client-1",
        type: "client",
        position: { x: 80, y: 200 },
        data: createDefaultNodeConfig("client", "client-1", "Web & Mobile Clients"),
      },
      {
        id: "api-1",
        type: "api_server",
        position: { x: 400, y: 200 },
        data: createDefaultNodeConfig("api_server", "api-1", "Monolith API Server"),
      },
      {
        id: "pg-1",
        type: "postgres_db",
        position: { x: 740, y: 200 },
        data: createDefaultNodeConfig("postgres_db", "pg-1", "PostgreSQL Primary"),
      },
    ],
    edges: [
      {
        id: "e-client-api",
        source: "client-1",
        target: "api-1",
        label: "4.0k RPS",
      },
      {
        id: "e-api-pg",
        source: "api-1",
        target: "pg-1",
        label: "SQL Queries",
      },
    ],
  },
  topologyRules: [
    {
      id: "rule-client-to-lb",
      description:
        "Client traffic must pass through an L7 Load Balancer before reaching API Servers.",
      validate: (nodes, edges) => {
        const clientIds = getNodeIdsByType(nodes, "client");
        const lbIds = getNodeIdsByType(nodes, "load_balancer");
        const apiIds = getNodeIdsByType(nodes, "api_server");

        if (lbIds.size === 0) {
          return {
            passed: false,
            reason:
              "Missing Load Balancer node. Add an L7 Load Balancer between Client and API Server.",
          };
        }
        if (!hasDirectOrIndirectEdge(edges, clientIds, lbIds)) {
          return {
            passed: false,
            reason: "Client node is not connected to the Load Balancer.",
          };
        }
        if (!hasDirectOrIndirectEdge(edges, lbIds, apiIds)) {
          return {
            passed: false,
            reason:
              "Load Balancer must route traffic to at least one API Server node.",
          };
        }
        return { passed: true };
      },
    },
    {
      id: "rule-redundant-api-compute",
      description:
        "API Server tier must have at least 2 total instances across the fleet to survive single-node failover.",
      validate: (nodes) => {
        const totalApiInstances = nodes
          .filter((node) => node.type === "api_server")
          .reduce((sum, node) => sum + node.data.spec.instances, 0);

        if (totalApiInstances < 2) {
          return {
            passed: false,
            reason: `API Server fleet only has ${totalApiInstances} instance(s). Scale to at least 2 instances for high availability and 4,000 RPS headroom.`,
          };
        }
        return { passed: true };
      },
    },
    {
      id: "rule-redis-read-offload",
      description:
        "API Servers must connect to both a Redis Cache (for read offload) and PostgreSQL Primary.",
      validate: (nodes, edges) => {
        const apiIds = getNodeIdsByType(nodes, "api_server");
        const redisIds = getNodeIdsByType(nodes, "redis_cache");
        const pgIds = getNodeIdsByType(nodes, "postgres_db");

        if (redisIds.size === 0) {
          return {
            passed: false,
            reason:
              "Missing Redis Cache node. PostgreSQL Primary (1,500 RPS max) cannot absorb 3,500 Read RPS + 500 Write RPS alone.",
          };
        }
        if (!hasDirectOrIndirectEdge(edges, apiIds, redisIds)) {
          return {
            passed: false,
            reason: "Connect your API Server to the Redis Cache node.",
          };
        }
        if (!hasDirectOrIndirectEdge(edges, apiIds, pgIds)) {
          return {
            passed: false,
            reason: "Connect your API Server to the PostgreSQL Primary node.",
          };
        }
        return { passed: true };
      },
    },
  ],
  referenceSolution: {
    summary:
      "Place an L7 Load Balancer in front of a 3-instance Stateless API Server pool (7,500 RPS total capacity; 5,000 RPS during N-1 failover), and connect the API tier to a Redis Cache (85% hit ratio) + PostgreSQL Primary.",
    whyItWorks: [
      "3 API Server instances ($360/mo) provide 5,000 RPS capacity even when 1 instance fails during the Single-Node Failover check, keeping utilization at 53% (well below the 70% M/M/1 queueing threshold).",
      "Redis Cache ($150/mo) with an 85% hit ratio serves 2,975 Read RPS in 2ms, sending only 525 cache-miss Read RPS + 500 Write RPS (1,025 RPS total = 68% utilization) to PostgreSQL Primary ($280/mo).",
      "Total monthly cost is $850/mo ($60 LB + $360 API + $150 Redis + $280 Postgres), meeting the $850 budget with 0% dropped requests.",
    ],
    nodes: [
      {
        id: "client-1",
        type: "client",
        position: { x: 60, y: 220 },
        data: createDefaultNodeConfig("client", "client-1", "Web & Mobile Clients"),
      },
      {
        id: "lb-1",
        type: "load_balancer",
        position: { x: 310, y: 220 },
        data: createDefaultNodeConfig("load_balancer", "lb-1", "L7 Load Balancer"),
      },
      {
        id: "api-1",
        type: "api_server",
        position: { x: 560, y: 220 },
        data: {
          ...createDefaultNodeConfig("api_server", "api-1", "Stateless API Pool"),
          spec: {
            ...createDefaultNodeConfig("api_server", "api-1").spec,
            instances: 3,
          },
        },
      },
      {
        id: "redis-1",
        type: "redis_cache",
        position: { x: 840, y: 110 },
        data: createDefaultNodeConfig("redis_cache", "redis-1", "Redis Cache-Aside"),
      },
      {
        id: "pg-1",
        type: "postgres_db",
        position: { x: 840, y: 330 },
        data: createDefaultNodeConfig("postgres_db", "pg-1", "PostgreSQL Primary"),
      },
    ],
    edges: [
      { id: "e-client-lb", source: "client-1", target: "lb-1" },
      { id: "e-lb-api", source: "lb-1", target: "api-1" },
      { id: "e-api-redis", source: "api-1", target: "redis-1" },
      { id: "e-api-pg", source: "api-1", target: "pg-1" },
    ],
  },
  postCompletionInsights: {
    architecturalDeepDive: [
      {
        title: "Why Latency Explodes Above 70% Utilization (Kingman's & M/M/1 Queueing)",
        markdownContent:
          "In a queueing system, response time follows `T = S / (1 - ρ)` where `S` is base service time and `ρ` is utilization. At 50% utilization, queueing doubles service time; at 90% utilization, queueing multiplies latency by 10x. Provisioning compute and databases so steady-state and N-1 failover utilization stay below 70% prevents tail-latency cascades.",
      },
      {
        title: "Stateless Compute vs. Stateful Storage",
        markdownContent:
          "Scaling API servers horizontally from 1 to 3 instances is trivial when session state lives in JWTs or shared Redis rather than local memory. Databases, however, hold durable state—making cache-aside offloading with Redis the cheapest first lever before introducing read replicas or sharding.",
      },
    ],
    realWorldExamples: [
      "Stack Overflow famously served hundreds of millions of page views using a small fleet of stateless web servers backed by aggressive Redis caching in front of SQL Server.",
      "GitHub and Basecamp rely on cache-aside key-value lookups to keep relational primary write/read IOPS below the queueing knee.",
    ],
    commonAntiPatterns: [
      "Scaling only the API Server tier to 4+ instances without caching: this simply funnels 4,000 RPS faster into PostgreSQL, crashing the database connection pool.",
      "Provisioning exactly 2 API Servers for 4,000 RPS (2,500 RPS each): while 5,000 RPS passes steady state, losing 1 instance drops capacity to 2,500 RPS and fails the Single-Node Failover check.",
    ],
    interviewTakeaways: [
      "Always separate Read RPS from Write RPS in your back-of-the-envelope math before choosing caching vs. sharding.",
      "Explicitly design for N-1 redundancy: if 1 instance needs to handle X RPS, N instances must handle total load when 1 node is down (`(N - 1) * capacity >= peak_load`).",
    ],
  },
};

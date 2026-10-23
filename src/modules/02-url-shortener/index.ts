import {
  createDefaultNodeConfig,
  type CanvasEdge,
  type CanvasNode,
  type LearningModule,
} from "@/engine/types";

function hasDirectEdge(
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

export const urlShortenerModule: LearningModule = {
  metadata: {
    slug: "02-url-shortener",
    title: "High-Scale URL Shortener (Bitly)",
    subtitle:
      "Design a read-heavy 50,000 Read RPS / 2,500 Write RPS redirect architecture with CDN edge offload, Redis caching, and database read replicas.",
    tier: "tier-3-distributed",
    order: 1,
    difficulty: "Intermediate",
    estimatedMinutes: 25,
    tags: [
      "CDN Edge",
      "Read Replicas",
      "Base62 Hashing",
      "Cache Stampede",
      "100:20 Read/Write Ratio",
    ],
  },
  conceptBrief: {
    problemStatement:
      "You are architecting a global URL shortener handling 50,000 Redirect Read RPS (`GET /{shortCode}` -> `301/302 Redirect`) and 2,500 Link Creation Write RPS (`POST /api/v1/urls`). Every redirect must resolve with ultra-low P95 latency (<= 35ms) while link creation writes remain durable and collision-free.",
    backOfEnvelope: {
      readRps: 50_000,
      writeRps: 2_500,
      averagePayloadBytes: 512,
      dailyStorageGrowthGb: 110,
    },
    mentalModels: [
      "20:1 Read-to-Write Asymmetry: Redirects dominate traffic. Offloading hot short-links at the CDN edge (80% hit ratio) and Redis Cache (85% hit ratio on origin misses) collapses 50,000 Read RPS down to ~1,500 DB Read RPS.",
      "Base62 Counter vs. Random Hash: A 7-character Base62 key (`[0-9a-zA-Z]^7`) yields 3.52 trillion unique codes. Using distributed snowflaked/range-allocated counters avoids database unique-check read-before-write roundtrips.",
      "Read Replicas & Replication Write Tax: Adding PostgreSQL Read Replicas scales read throughput, but every replica incurs a replication write tax on primary writes.",
    ],
  },
  requirements: {
    functional: [
      "Serve 50,000 Read RPS (short-link redirects) and 2,500 Write RPS (new short-link creation).",
      "Place a CDN Edge layer or Load-Balanced API tier with Redis Cache to absorb hot redirect lookups.",
      "Persist short-code mappings in a scaled database layer (PostgreSQL with Read Replicas/Sharding or NoSQL Key-Value store).",
    ],
    nonFunctional: [
      "Keep end-to-end P95 latency <= 35ms.",
      "Achieve 0% dropped requests across a 10-tick stress test.",
      "Survive Single-Node Failover on the compute tier.",
      "Stay within a $2,200/month infrastructure budget.",
    ],
    sla: {
      targetReadRps: 50_000,
      targetWriteRps: 2_500,
      maxP95LatencyMs: 35,
      maxErrorRatePercent: 0,
      maxMonthlyBudgetUsd: 2_200,
      requireSingleNodeFailover: true,
      requiredNodeTypes: [
        "client",
        "cdn",
        "load_balancer",
        "api_server",
        "redis_cache",
      ],
    },
  },
  starterGraph: {
    allowedNodeTypes: [
      "client",
      "cdn",
      "api_gateway",
      "load_balancer",
      "api_server",
      "redis_cache",
      "postgres_db",
      "nosql_db",
    ],
    nodes: [
      {
        id: "client-1",
        type: "client",
        position: { x: 60, y: 220 },
        data: createDefaultNodeConfig("client", "client-1", "Global Redirect Traffic"),
      },
      {
        id: "lb-1",
        type: "load_balancer",
        position: { x: 340, y: 220 },
        data: createDefaultNodeConfig("load_balancer", "lb-1", "Ingress Load Balancer"),
      },
      {
        id: "api-1",
        type: "api_server",
        position: { x: 620, y: 220 },
        data: {
          ...createDefaultNodeConfig("api_server", "api-1", "Redirect & Shorten API"),
          spec: {
            ...createDefaultNodeConfig("api_server", "api-1").spec,
            instances: 2,
          },
        },
      },
      {
        id: "pg-1",
        type: "postgres_db",
        position: { x: 920, y: 220 },
        data: createDefaultNodeConfig("postgres_db", "pg-1", "URL Mapping DB"),
      },
    ],
    edges: [
      { id: "e-client-lb", source: "client-1", target: "lb-1" },
      { id: "e-lb-api", source: "lb-1", target: "api-1" },
      { id: "e-api-pg", source: "api-1", target: "pg-1" },
    ],
  },
  topologyRules: [
    {
      id: "rule-cdn-edge-offload",
      description:
        "Client traffic must pass through a Global CDN Edge node to offload viral redirect reads before hitting origin.",
      validate: (nodes, edges) => {
        const clientIds = getNodeIdsByType(nodes, "client");
        const cdnIds = getNodeIdsByType(nodes, "cdn");

        if (cdnIds.size === 0) {
          return {
            passed: false,
            reason:
              "Missing CDN node. Sending all 50,000 Read RPS directly to origin compute exceeds budget and latency targets.",
          };
        }
        if (!hasDirectEdge(edges, clientIds, cdnIds)) {
          return {
            passed: false,
            reason: "Connect the Client node directly to the Global CDN Edge.",
          };
        }
        return { passed: true };
      },
    },
    {
      id: "rule-redis-origin-cache",
      description:
        "Origin API Servers must query a Redis In-Memory Cache to absorb CDN cache misses.",
      validate: (nodes, edges) => {
        const apiIds = getNodeIdsByType(nodes, "api_server");
        const redisIds = getNodeIdsByType(nodes, "redis_cache");

        if (redisIds.size === 0 || !hasDirectEdge(edges, apiIds, redisIds)) {
          return {
            passed: false,
            reason:
              "API Servers must connect to a Redis Cache node to prevent CDN cache misses (10,000 Read RPS) from overwhelming the database.",
          };
        }
        return { passed: true };
      },
    },
    {
      id: "rule-durable-url-storage",
      description:
        "API Servers must persist URL mappings in a scaled database (NoSQL Key-Value store or PostgreSQL with Read Replicas / Sharding).",
      validate: (nodes, edges) => {
        const apiIds = getNodeIdsByType(nodes, "api_server");
        const dbIds = new Set([
          ...getNodeIdsByType(nodes, "postgres_db"),
          ...getNodeIdsByType(nodes, "nosql_db"),
        ]);

        if (dbIds.size === 0 || !hasDirectEdge(edges, apiIds, dbIds)) {
          return {
            passed: false,
            reason:
              "API Servers must connect to a PostgreSQL or NoSQL database for durable link storage.",
          };
        }
        return { passed: true };
      },
    },
  ],
  referenceSolution: {
    summary:
      "Route Client traffic through a Global CDN (80% read hit ratio) -> L7 Load Balancer -> 7 Stateless API Server instances -> Redis Cache (85% hit ratio) + Partitioned NoSQL Key-Value Store (or Sharded Postgres with Read Replicas).",
    whyItWorks: [
      "Global CDN ($80/mo) serves 80% of 50,000 Read RPS (40,000 Read RPS) at the edge in 5ms, forwarding only 10,000 Read RPS + 2,500 Write RPS (12,500 RPS total) to origin.",
      "7 Stateless API Server instances ($840/mo) provide 17,500 RPS capacity (15,000 RPS during N-1 failover), keeping compute utilization at 71% under failover.",
      "Redis Cache ($150/mo) absorbs 85% of the remaining 10,000 Read RPS, leaving only 1,500 Read RPS + 2,500 Write RPS (4,000 RPS) for the NoSQL Key-Value Store ($320/mo, 8,000 RPS capacity).",
    ],
    nodes: [
      {
        id: "client-1",
        type: "client",
        position: { x: 40, y: 220 },
        data: createDefaultNodeConfig("client", "client-1", "Global Redirect Traffic"),
      },
      {
        id: "cdn-1",
        type: "cdn",
        position: { x: 260, y: 220 },
        data: createDefaultNodeConfig("cdn", "cdn-1", "Global CDN Edge"),
      },
      {
        id: "lb-1",
        type: "load_balancer",
        position: { x: 480, y: 220 },
        data: createDefaultNodeConfig("load_balancer", "lb-1", "Ingress Load Balancer"),
      },
      {
        id: "api-1",
        type: "api_server",
        position: { x: 700, y: 220 },
        data: {
          ...createDefaultNodeConfig("api_server", "api-1", "Redirect & Shorten Pool"),
          spec: {
            ...createDefaultNodeConfig("api_server", "api-1").spec,
            instances: 7,
          },
        },
      },
      {
        id: "redis-1",
        type: "redis_cache",
        position: { x: 960, y: 110 },
        data: createDefaultNodeConfig("redis_cache", "redis-1", "Hot Shortcode Redis"),
      },
      {
        id: "nosql-1",
        type: "nosql_db",
        position: { x: 960, y: 330 },
        data: createDefaultNodeConfig("nosql_db", "nosql-1", "Partitioned URL Store"),
      },
    ],
    edges: [
      { id: "e-client-cdn", source: "client-1", target: "cdn-1" },
      { id: "e-cdn-lb", source: "cdn-1", target: "lb-1" },
      { id: "e-lb-api", source: "lb-1", target: "api-1" },
      { id: "e-api-redis", source: "api-1", target: "redis-1" },
      { id: "e-api-nosql", source: "api-1", target: "nosql-1" },
    ],
  },
  postCompletionInsights: {
    architecturalDeepDive: [
      {
        title: "301 Permanent vs. 302 Temporary Redirect Trade-offs",
        markdownContent:
          "Returning `HTTP 301` lets browsers and CDNs cache the destination URL aggressively (maximizing CDN offload and minimizing origin RPS), whereas `HTTP 302` forces requests through your analytics pipeline when real-time click tracking is required. Production shorteners often emit async click events at the CDN/edge worker layer.",
      },
      {
        title: "Collision-Free Short Code Generation at 2,500 Write RPS",
        markdownContent:
          "Generating random 7-char strings and running `SELECT ... WHERE code = ?` before `INSERT` doubles database write IOPS and suffers from birthday-paradox collisions at scale. Instead, allocate pre-generated key ranges via a Range Allocator (ZooKeeper/etcd) or encode a 64-bit Snowflake ID in Base62.",
      },
    ],
    realWorldExamples: [
      "Bitly and Dub.co execute edge redirects via Cloudflare Workers / Edge caches backed by Redis and partitioned storage.",
      "Twitter's `t.co` link wrapper uses distributed ID generation (Snowflake) to guarantee unique short URLs without cross-shard locking.",
    ],
    commonAntiPatterns: [
      "Using an unsharded single PostgreSQL Primary for 2,500 Write RPS + 10,000 uncached Read RPS: even with Read Replicas, synchronous replication lag and primary write IOPS saturate a single instance.",
      "Forgetting negative caching (Bloom filters / short TTL `404` cache entries): malicious bots scanning random short codes will bypass Redis and hammer your database.",
    ],
    interviewTakeaways: [
      "Quantify multi-layer cache hit ratios: 80% CDN offload + 85% Redis offload reduces origin DB read load by `1 - (0.20 * 0.15) = 97%`.",
      "Always discuss `301` vs. `302` caching semantics and Base62 Snowflake IDs vs. MD5 truncation in a URL shortener interview.",
    ],
  },
};

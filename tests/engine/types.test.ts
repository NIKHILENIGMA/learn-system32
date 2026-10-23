import { describe, expect, it } from "vitest";
import {
  createDefaultNodeConfig,
  DEFAULT_NODE_SPECS,
  NODE_CATEGORIES,
} from "@/engine/types";

describe("Core Engine Types & Hardware Preset Catalog (src/engine/types.ts)", () => {
  it("defines all 10 required infrastructure node categories", () => {
    expect(NODE_CATEGORIES).toHaveLength(10);
    expect(NODE_CATEGORIES).toEqual([
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
    ]);
  });

  it("provides valid positive capacity and latency presets for every NodeCategory", () => {
    for (const category of NODE_CATEGORIES) {
      const entry = DEFAULT_NODE_SPECS[category];
      expect(entry.type).toBe(category);
      expect(entry.defaultLabel.length).toBeGreaterThan(0);
      expect(entry.defaultSpec.instances).toBeGreaterThanOrEqual(1);
      expect(entry.defaultSpec.maxRpsPerInstance).toBeGreaterThan(0);
      expect(entry.defaultSpec.baseLatencyMs).toBeGreaterThan(0);
      expect(entry.defaultSpec.monthlyCostPerInstance).toBeGreaterThanOrEqual(0);
    }
  });

  it("creates isolated NodeConfig instances with behavioral defaults via createDefaultNodeConfig", () => {
    const redisNode = createDefaultNodeConfig(
      "redis_cache",
      "redis-1",
      "Session Cache",
    );
    expect(redisNode.id).toBe("redis-1");
    expect(redisNode.type).toBe("redis_cache");
    expect(redisNode.label).toBe("Session Cache");
    expect(redisNode.cacheHitRatio).toBe(0.85);

    // Mutating returned spec must not mutate DEFAULT_NODE_SPECS
    redisNode.spec.instances = 4;
    expect(DEFAULT_NODE_SPECS.redis_cache.defaultSpec.instances).toBe(1);

    const postgresNode = createDefaultNodeConfig("postgres_db", "pg-primary");
    expect(postgresNode.readReplicaCount).toBe(0);
    expect(postgresNode.shardingEnabled).toBe(false);
  });
});

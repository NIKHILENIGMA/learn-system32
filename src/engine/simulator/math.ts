import type {
  CanvasNode,
  NodeConfig,
  NodeHealthStatus,
} from "@/engine/types";

export const UTILIZATION_DEGRADED_THRESHOLD = 0.7;
export const UTILIZATION_OVERLOAD_THRESHOLD = 1.0;
export const CRASH_OVERLOAD_STREAK_THRESHOLD = 3;
export const REPLICA_WRITE_TAX_PER_REPLICA = 0.12;
export const REPLICA_COST_MULTIPLIER = 0.5;
export const SHARDING_CAPACITY_MULTIPLIER = 2;

export interface NodeCapacityEvaluation {
  totalCapacityRps: number;
  effectiveLoadRps: number;
  utilization: number;
  survivedReadRps: number;
  survivedWriteRps: number;
  droppedRps: number;
  replicationLagMs?: number;
  bottleneckReason?: string;
}

export interface NodeLatencyEvaluation {
  p95LatencyMs: number;
  status: NodeHealthStatus;
}

function isDatabaseNode(type: NodeConfig["type"]): boolean {
  return type === "postgres_db" || type === "nosql_db";
}

/**
 * Evaluates a node's effective capacity, utilization, survived/dropped Read & Write RPS,
 * and database replication write tax / lag for a single simulation tick.
 */
export function computeNodeCapacityAndLoad(
  nodeConfig: NodeConfig,
  incomingReadRps: number,
  incomingWriteRps: number,
  nextOverloadStreak: number,
): NodeCapacityEvaluation {
  const safeReadRps = Math.max(0, incomingReadRps);
  const safeWriteRps = Math.max(0, incomingWriteRps);
  const totalIncomingRps = safeReadRps + safeWriteRps;

  const instances = Math.max(1, Math.floor(nodeConfig.spec.instances));
  const maxRpsPerInstance = Math.max(1, nodeConfig.spec.maxRpsPerInstance);
  const baseFleetCapacity = instances * maxRpsPerInstance;

  if (isDatabaseNode(nodeConfig.type)) {
    const replicas = Math.max(0, Math.floor(nodeConfig.readReplicaCount ?? 0));
    const shardMultiplier = nodeConfig.shardingEnabled
      ? SHARDING_CAPACITY_MULTIPLIER
      : 1;

    const primaryWriteCapacity = baseFleetCapacity * shardMultiplier;
    const clusterReadCapacity =
      baseFleetCapacity * (1 + replicas) * shardMultiplier;

    const effectiveWriteLoad =
      safeWriteRps * (1 + REPLICA_WRITE_TAX_PER_REPLICA * replicas);

    const writeUtilization = effectiveWriteLoad / primaryWriteCapacity;
    const combinedUtilization =
      (safeReadRps + effectiveWriteLoad) / clusterReadCapacity;
    const utilization = Math.max(writeUtilization, combinedUtilization);

    let replicationLagMs: number | undefined;
    if (replicas > 0) {
      if (safeWriteRps === 0) {
        replicationLagMs = 0;
      } else if (writeUtilization <= UTILIZATION_DEGRADED_THRESHOLD) {
        replicationLagMs = Math.round(
          4 + writeUtilization * 12 + replicas * 2,
        );
      } else {
        const clampedWriteUtil = Math.min(0.96, writeUtilization);
        replicationLagMs = Math.round(
          (14 + replicas * 4) / Math.max(0.04, 1 - clampedWriteUtil),
        );
      }
    }

    const isCrashed =
      utilization > UTILIZATION_OVERLOAD_THRESHOLD &&
      nextOverloadStreak > CRASH_OVERLOAD_STREAK_THRESHOLD;

    if (isCrashed) {
      return {
        totalCapacityRps: clusterReadCapacity,
        effectiveLoadRps: safeReadRps + effectiveWriteLoad,
        utilization,
        survivedReadRps: 0,
        survivedWriteRps: 0,
        droppedRps: totalIncomingRps,
        replicationLagMs,
        bottleneckReason: `${nodeConfig.label} crashed after ${nextOverloadStreak} consecutive overloaded ticks (${Math.round(utilization * 100)}% load).`,
      };
    }

    if (utilization > UTILIZATION_OVERLOAD_THRESHOLD && totalIncomingRps > 0) {
      const survivalRatio = 1 / utilization;
      const survivedReadRps = safeReadRps * survivalRatio;
      const survivedWriteRps = safeWriteRps * survivalRatio;
      const droppedRps = Math.max(
        0,
        totalIncomingRps - (survivedReadRps + survivedWriteRps),
      );

      const primaryWriteOverloaded = writeUtilization >= combinedUtilization;
      const bottleneckReason = primaryWriteOverloaded
        ? `${nodeConfig.label} primary write capacity overloaded at ${Math.round(writeUtilization * 100)}% (including ${replicas * 12}% replica write tax) — enable Sharding or buffer writes with a Message Queue.`
        : `${nodeConfig.label} overloaded at ${Math.round(utilization * 100)}% capacity — add a Redis Cache, Read Replicas, or enable Sharding.`;

      return {
        totalCapacityRps: clusterReadCapacity,
        effectiveLoadRps: safeReadRps + effectiveWriteLoad,
        utilization,
        survivedReadRps,
        survivedWriteRps,
        droppedRps,
        replicationLagMs,
        bottleneckReason,
      };
    }

    const bottleneckReason =
      utilization > UTILIZATION_DEGRADED_THRESHOLD
        ? `${nodeConfig.label} running in M/M/1 queueing zone (${Math.round(utilization * 100)}% utilization > 70% knee).`
        : undefined;

    return {
      totalCapacityRps: clusterReadCapacity,
      effectiveLoadRps: safeReadRps + effectiveWriteLoad,
      utilization,
      survivedReadRps: safeReadRps,
      survivedWriteRps: safeWriteRps,
      droppedRps: 0,
      replicationLagMs,
      bottleneckReason,
    };
  }

  // Non-database node capacity (including API Gateway rate limiting)
  const effectiveCapacityRps =
    nodeConfig.type === "api_gateway" &&
    typeof nodeConfig.rateLimitRps === "number" &&
    nodeConfig.rateLimitRps > 0
      ? Math.min(baseFleetCapacity, nodeConfig.rateLimitRps)
      : baseFleetCapacity;

  const utilization = totalIncomingRps / effectiveCapacityRps;

  const isCrashed =
    utilization > UTILIZATION_OVERLOAD_THRESHOLD &&
    nextOverloadStreak > CRASH_OVERLOAD_STREAK_THRESHOLD;

  if (isCrashed) {
    return {
      totalCapacityRps: effectiveCapacityRps,
      effectiveLoadRps: totalIncomingRps,
      utilization,
      survivedReadRps: 0,
      survivedWriteRps: 0,
      droppedRps: totalIncomingRps,
      bottleneckReason: `${nodeConfig.label} crashed after ${nextOverloadStreak} consecutive overloaded ticks (${Math.round(utilization * 100)}% load).`,
    };
  }

  if (utilization > UTILIZATION_OVERLOAD_THRESHOLD && totalIncomingRps > 0) {
    const survivalRatio = effectiveCapacityRps / totalIncomingRps;
    const survivedReadRps = safeReadRps * survivalRatio;
    const survivedWriteRps = safeWriteRps * survivalRatio;
    const droppedRps = Math.max(0, totalIncomingRps - effectiveCapacityRps);

    const isRateLimited =
      nodeConfig.type === "api_gateway" &&
      typeof nodeConfig.rateLimitRps === "number" &&
      nodeConfig.rateLimitRps < baseFleetCapacity;

    const bottleneckReason = isRateLimited
      ? `${nodeConfig.label} rate limiter throttled ${Math.round(droppedRps)} RPS above ${nodeConfig.rateLimitRps} RPS cap.`
      : `${nodeConfig.label} overloaded at ${Math.round(utilization * 100)}% capacity (${Math.round(totalIncomingRps)} RPS > ${Math.round(effectiveCapacityRps)} RPS) — scale instances horizontally.`;

    return {
      totalCapacityRps: effectiveCapacityRps,
      effectiveLoadRps: totalIncomingRps,
      utilization,
      survivedReadRps,
      survivedWriteRps,
      droppedRps,
      bottleneckReason,
    };
  }

  const bottleneckReason =
    utilization > UTILIZATION_DEGRADED_THRESHOLD
      ? `${nodeConfig.label} experiencing M/M/1 queueing latency degradation at ${Math.round(utilization * 100)}% utilization.`
      : undefined;

  return {
    totalCapacityRps: effectiveCapacityRps,
    effectiveLoadRps: totalIncomingRps,
    utilization,
    survivedReadRps: safeReadRps,
    survivedWriteRps: safeWriteRps,
    droppedRps: 0,
    bottleneckReason,
  };
}

/**
 * Computes P95 latency (ms) and health status using an M/M/1 non-linear queueing model:
 * - <= 70% utilization: flat `baseLatencyMs` (`HEALTHY`)
 * - 70% to 100% utilization: exponential M/M/1 queueing curve up to 4x (`DEGRADED`)
 * - > 100% utilization: severe overload latency (`OVERLOADED` or `CRASHED` if streak > 3)
 */
export function computeNodeLatencyAndStatus(
  baseLatencyMs: number,
  utilization: number,
  nextOverloadStreak: number,
): NodeLatencyEvaluation {
  const safeBaseMs = Math.max(1, baseLatencyMs);

  if (utilization > UTILIZATION_OVERLOAD_THRESHOLD) {
    if (nextOverloadStreak > CRASH_OVERLOAD_STREAK_THRESHOLD) {
      return {
        p95LatencyMs: Math.round(safeBaseMs * 25),
        status: "CRASHED",
      };
    }
    const overloadFactor = 5 + Math.min(10, (utilization - 1) * 10);
    return {
      p95LatencyMs: Math.round(safeBaseMs * overloadFactor),
      status: "OVERLOADED",
    };
  }

  if (utilization > UTILIZATION_DEGRADED_THRESHOLD) {
    const normalizedQueueZone =
      (utilization - UTILIZATION_DEGRADED_THRESHOLD) /
      (UTILIZATION_OVERLOAD_THRESHOLD - UTILIZATION_DEGRADED_THRESHOLD);
    const mm1Multiplier = 1 / Math.max(0.25, 1 - 0.75 * normalizedQueueZone);
    return {
      p95LatencyMs: Math.round(safeBaseMs * mm1Multiplier),
      status: "DEGRADED",
    };
  }

  return {
    p95LatencyMs: Math.round(safeBaseMs),
    status: "HEALTHY",
  };
}

/**
 * Computes monthly infrastructure cost in USD for a single node configuration,
 * including `0.5x` instance cost per attached database read replica.
 */
export function computeNodeMonthlyCost(nodeConfig: NodeConfig): number {
  const instances = Math.max(1, Math.floor(nodeConfig.spec.instances));
  const unitCost = Math.max(0, nodeConfig.spec.monthlyCostPerInstance);
  const baseCost = instances * unitCost;

  if (isDatabaseNode(nodeConfig.type)) {
    const replicas = Math.max(0, Math.floor(nodeConfig.readReplicaCount ?? 0));
    const replicaCost = replicas * REPLICA_COST_MULTIPLIER * unitCost;
    return Math.round(baseCost + replicaCost);
  }

  return Math.round(baseCost);
}

export function computeTotalMonthlyCost(nodes: CanvasNode[]): number {
  return nodes.reduce(
    (sum, node) => sum + computeNodeMonthlyCost(node.data),
    0,
  );
}

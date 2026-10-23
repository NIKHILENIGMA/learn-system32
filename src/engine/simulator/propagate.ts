import type {
  CanvasEdge,
  CanvasNode,
  EdgeTelemetry,
  NodeTelemetry,
  SimulationTickInput,
  SimulationTickResult,
} from "@/engine/types";
import {
  computeNodeCapacityAndLoad,
  computeNodeLatencyAndStatus,
  computeTotalMonthlyCost,
  UTILIZATION_OVERLOAD_THRESHOLD,
} from "./math";

export const MAX_GRAPH_HOPS = 16;
const DEFAULT_CDN_HIT_RATIO = 0.8;
const DEFAULT_REDIS_HIT_RATIO = 0.85;

interface WavePacket {
  nodeId: string;
  readRps: number;
  writeRps: number;
  hop: number;
  visitedNodeIds: ReadonlySet<string>;
}

function clampRatio(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, value));
}

function isStorageSinkType(type: CanvasNode["type"]): boolean {
  return type === "postgres_db" || type === "nosql_db";
}

function isValidTerminalSink(type: CanvasNode["type"]): boolean {
  return (
    type === "postgres_db" ||
    type === "nosql_db" ||
    type === "redis_cache" ||
    type === "worker"
  );
}

/**
 * Runs a single deterministic simulation tick across the directed infrastructure graph.
 *
 * Supports:
 * - Multi-client traffic injection & `1x | 5x | 10x` spike multipliers
 * - CDN edge read offload (`cacheHitRatio`)
 * - Both Parallel (`API -> Redis` + `API -> DB`) and Serial (`API -> Redis -> DB`) cache-aside read offload
 * - Async `message_queue -> worker -> db` write buffering
 * - Cycle-safe bounded wave traversal (`MAX_GRAPH_HOPS`)
 * - Dead-end / disconnected sink packet drop detection
 */
export function simulateTick(input: SimulationTickInput): SimulationTickResult {
  const multiplier = input.trafficMultiplier ?? 1;
  const totalTargetReadRps = Math.max(0, input.targetReadRps) * multiplier;
  const totalTargetWriteRps = Math.max(0, input.targetWriteRps) * multiplier;
  const totalInjectedRps = totalTargetReadRps + totalTargetWriteRps;

  const nodesById = new Map<string, CanvasNode>();
  for (const node of input.nodes) {
    nodesById.set(node.id, node);
  }

  const outgoingEdgesByNode = new Map<string, CanvasEdge[]>();
  for (const edge of input.edges) {
    if (!nodesById.has(edge.source) || !nodesById.has(edge.target)) {
      continue;
    }
    const existing = outgoingEdgesByNode.get(edge.source) ?? [];
    existing.push(edge);
    outgoingEdgesByNode.set(edge.source, existing);
  }

  const incomingReadByNode = new Map<string, number>();
  const incomingWriteByNode = new Map<string, number>();
  const unroutedDropsByNode = new Map<string, number>();

  const edgeReadById = new Map<string, number>();
  const edgeWriteById = new Map<string, number>();

  for (const node of input.nodes) {
    incomingReadByNode.set(node.id, 0);
    incomingWriteByNode.set(node.id, 0);
    unroutedDropsByNode.set(node.id, 0);
  }
  for (const edge of input.edges) {
    edgeReadById.set(edge.id, 0);
    edgeWriteById.set(edge.id, 0);
  }

  const clientNodes = input.nodes.filter((node) => node.type === "client");
  const queue: WavePacket[] = [];

  if (clientNodes.length > 0 && totalInjectedRps > 0) {
    const readPerClient = totalTargetReadRps / clientNodes.length;
    const writePerClient = totalTargetWriteRps / clientNodes.length;
    for (const client of clientNodes) {
      queue.push({
        nodeId: client.id,
        readRps: readPerClient,
        writeRps: writePerClient,
        hop: 0,
        visitedNodeIds: new Set([client.id]),
      });
    }
  }

  // First pass: accumulate incoming traffic via bounded cycle-safe wave propagation
  // To ensure node capacity throttles downstream edges accurately, we process in topological waves.
  // Because wave packets can arrive from multiple upstream branches, we group pending packets by nodeId per wave.
  let currentWave: WavePacket[] = queue;

  for (
    let hop = 0;
    hop < MAX_GRAPH_HOPS && currentWave.length > 0;
    hop += 1
  ) {
    // Merge packets targeting the same node within this hop
    const mergedByNode = new Map<
      string,
      { readRps: number; writeRps: number; visitedNodeIds: Set<string> }
    >();

    for (const pkt of currentWave) {
      const existing = mergedByNode.get(pkt.nodeId);
      if (existing) {
        existing.readRps += pkt.readRps;
        existing.writeRps += pkt.writeRps;
        for (const id of pkt.visitedNodeIds) {
          existing.visitedNodeIds.add(id);
        }
      } else {
        mergedByNode.set(pkt.nodeId, {
          readRps: pkt.readRps,
          writeRps: pkt.writeRps,
          visitedNodeIds: new Set(pkt.visitedNodeIds),
        });
      }
    }

    const nextWave: WavePacket[] = [];

    for (const [nodeId, packet] of mergedByNode.entries()) {
      const node = nodesById.get(nodeId);
      if (!node) continue;

      const prevRead = incomingReadByNode.get(nodeId) ?? 0;
      const prevWrite = incomingWriteByNode.get(nodeId) ?? 0;
      const cumulativeRead = prevRead + packet.readRps;
      const cumulativeWrite = prevWrite + packet.writeRps;

      incomingReadByNode.set(nodeId, cumulativeRead);
      incomingWriteByNode.set(nodeId, cumulativeWrite);

      // Compute how much of this incremental packet survives node capacity
      const prevStreak = input.previousOverloadStreaks?.[nodeId] ?? 0;
      const prevEval = computeNodeCapacityAndLoad(
        node.data,
        prevRead,
        prevWrite,
        prevStreak + 1,
      );
      const currEval = computeNodeCapacityAndLoad(
        node.data,
        cumulativeRead,
        cumulativeWrite,
        prevStreak + 1,
      );

      const deltaSurvivedRead = Math.max(
        0,
        currEval.survivedReadRps - prevEval.survivedReadRps,
      );
      const deltaSurvivedWrite = Math.max(
        0,
        currEval.survivedWriteRps - prevEval.survivedWriteRps,
      );

      if (deltaSurvivedRead + deltaSurvivedWrite <= 0) {
        continue;
      }

      // Filter outgoing edges to avoid cycles on the current path
      const rawOutgoing = outgoingEdgesByNode.get(nodeId) ?? [];
      const validOutgoing = rawOutgoing.filter(
        (edge) => !packet.visitedNodeIds.has(edge.target),
      );

      if (validOutgoing.length === 0) {
        if (!isValidTerminalSink(node.type)) {
          unroutedDropsByNode.set(
            nodeId,
            (unroutedDropsByNode.get(nodeId) ?? 0) +
              deltaSurvivedRead +
              deltaSurvivedWrite,
          );
        } else if (node.type === "redis_cache" && deltaSurvivedWrite > 0) {
          // A standalone Redis cache with no downstream DB cannot durably persist writes unless parallel DB exists
          // (Parallel DB receives writes directly from API Server, so Redis receives 0 Write RPS in parallel mode)
          unroutedDropsByNode.set(
            nodeId,
            (unroutedDropsByNode.get(nodeId) ?? 0) + deltaSurvivedWrite,
          );
        }
        continue;
      }

      // Determine category-specific forwarding
      if (node.type === "cdn") {
        const hitRatio = clampRatio(
          node.data.cacheHitRatio,
          DEFAULT_CDN_HIT_RATIO,
        );
        const forwardedRead = deltaSurvivedRead * (1 - hitRatio);
        const forwardedWrite = deltaSurvivedWrite;
        const perEdgeRead = forwardedRead / validOutgoing.length;
        const perEdgeWrite = forwardedWrite / validOutgoing.length;

        for (const edge of validOutgoing) {
          edgeReadById.set(
            edge.id,
            (edgeReadById.get(edge.id) ?? 0) + perEdgeRead,
          );
          edgeWriteById.set(
            edge.id,
            (edgeWriteById.get(edge.id) ?? 0) + perEdgeWrite,
          );
          const nextVisited = new Set(packet.visitedNodeIds);
          nextVisited.add(edge.target);
          nextWave.push({
            nodeId: edge.target,
            readRps: perEdgeRead,
            writeRps: perEdgeWrite,
            hop: hop + 1,
            visitedNodeIds: nextVisited,
          });
        }
        continue;
      }

      if (node.type === "redis_cache") {
        // Serial Cache-Aside (`API -> Redis -> DB`): Redis offloads `cacheHitRatio` of reads and forwards misses + writes
        const hitRatio = clampRatio(
          node.data.cacheHitRatio,
          DEFAULT_REDIS_HIT_RATIO,
        );
        const forwardedRead = deltaSurvivedRead * (1 - hitRatio);
        const forwardedWrite = deltaSurvivedWrite;
        const perEdgeRead = forwardedRead / validOutgoing.length;
        const perEdgeWrite = forwardedWrite / validOutgoing.length;

        for (const edge of validOutgoing) {
          edgeReadById.set(
            edge.id,
            (edgeReadById.get(edge.id) ?? 0) + perEdgeRead,
          );
          edgeWriteById.set(
            edge.id,
            (edgeWriteById.get(edge.id) ?? 0) + perEdgeWrite,
          );
          const nextVisited = new Set(packet.visitedNodeIds);
          nextVisited.add(edge.target);
          nextWave.push({
            nodeId: edge.target,
            readRps: perEdgeRead,
            writeRps: perEdgeWrite,
            hop: hop + 1,
            visitedNodeIds: nextVisited,
          });
        }
        continue;
      }

      if (node.type === "api_server") {
        const redisEdges = validOutgoing.filter(
          (edge) => nodesById.get(edge.target)?.type === "redis_cache",
        );
        const queueEdges = validOutgoing.filter(
          (edge) => nodesById.get(edge.target)?.type === "message_queue",
        );
        const storageEdges = validOutgoing.filter((edge) => {
          const targetType = nodesById.get(edge.target)?.type;
          return targetType ? isStorageSinkType(targetType) : false;
        });
        const otherEdges = validOutgoing.filter((edge) => {
          const targetType = nodesById.get(edge.target)?.type;
          return (
            targetType !== "redis_cache" &&
            targetType !== "message_queue" &&
            (!targetType || !isStorageSinkType(targetType))
          );
        });

        // Parallel Cache-Aside (`API -> Redis` AND `API -> Storage`):
        if (redisEdges.length > 0 && storageEdges.length > 0) {
          // 1. Send 100% of Read RPS to Redis Cache nodes
          const readPerRedis = deltaSurvivedRead / redisEdges.length;
          let totalEffectiveRedisHitRatio = 0;

          for (const edge of redisEdges) {
            const redisNode = nodesById.get(edge.target);
            const configuredHit = clampRatio(
              redisNode?.data.cacheHitRatio,
              DEFAULT_REDIS_HIT_RATIO,
            );
            // If Redis itself is overloaded, scale down effective hit ratio proportionally
            const redisCap = redisNode
              ? Math.max(
                  1,
                  redisNode.data.spec.instances *
                    redisNode.data.spec.maxRpsPerInstance,
                )
              : 1;
            const redisSurvival = Math.min(1, redisCap / Math.max(1, readPerRedis));
            totalEffectiveRedisHitRatio += configuredHit * redisSurvival;

            edgeReadById.set(
              edge.id,
              (edgeReadById.get(edge.id) ?? 0) + readPerRedis,
            );
            const nextVisited = new Set(packet.visitedNodeIds);
            nextVisited.add(edge.target);
            nextWave.push({
              nodeId: edge.target,
              readRps: readPerRedis,
              writeRps: 0,
              hop: hop + 1,
              visitedNodeIds: nextVisited,
            });
          }

          const avgRedisHitRatio =
            totalEffectiveRedisHitRatio / redisEdges.length;
          const cacheMissReadRps = deltaSurvivedRead * (1 - avgRedisHitRatio);

          // 2. Route cache-miss Read RPS to Storage, and Write RPS to Queue (if present) or Storage
          const readPerStorage = cacheMissReadRps / storageEdges.length;
          const writeTargetEdges =
            queueEdges.length > 0 ? queueEdges : storageEdges;
          const writePerTarget = deltaSurvivedWrite / writeTargetEdges.length;

          for (const edge of storageEdges) {
            const writeForThisEdge =
              queueEdges.length === 0 ? writePerTarget : 0;
            edgeReadById.set(
              edge.id,
              (edgeReadById.get(edge.id) ?? 0) + readPerStorage,
            );
            edgeWriteById.set(
              edge.id,
              (edgeWriteById.get(edge.id) ?? 0) + writeForThisEdge,
            );
            const nextVisited = new Set(packet.visitedNodeIds);
            nextVisited.add(edge.target);
            nextWave.push({
              nodeId: edge.target,
              readRps: readPerStorage,
              writeRps: writeForThisEdge,
              hop: hop + 1,
              visitedNodeIds: nextVisited,
            });
          }

          for (const edge of queueEdges) {
            edgeWriteById.set(
              edge.id,
              (edgeWriteById.get(edge.id) ?? 0) + writePerTarget,
            );
            const nextVisited = new Set(packet.visitedNodeIds);
            nextVisited.add(edge.target);
            nextWave.push({
              nodeId: edge.target,
              readRps: 0,
              writeRps: writePerTarget,
              hop: hop + 1,
              visitedNodeIds: nextVisited,
            });
          }
          continue;
        }

        // If API Server connects to Storage + Message Queue (without Redis):
        // Reads go to Storage, Writes go to Message Queue
        if (
          storageEdges.length > 0 &&
          queueEdges.length > 0 &&
          otherEdges.length === 0
        ) {
          const readPerStorage = deltaSurvivedRead / storageEdges.length;
          const writePerQueue = deltaSurvivedWrite / queueEdges.length;

          for (const edge of storageEdges) {
            edgeReadById.set(
              edge.id,
              (edgeReadById.get(edge.id) ?? 0) + readPerStorage,
            );
            const nextVisited = new Set(packet.visitedNodeIds);
            nextVisited.add(edge.target);
            nextWave.push({
              nodeId: edge.target,
              readRps: readPerStorage,
              writeRps: 0,
              hop: hop + 1,
              visitedNodeIds: nextVisited,
            });
          }

          for (const edge of queueEdges) {
            edgeWriteById.set(
              edge.id,
              (edgeWriteById.get(edge.id) ?? 0) + writePerQueue,
            );
            const nextVisited = new Set(packet.visitedNodeIds);
            nextVisited.add(edge.target);
            nextWave.push({
              nodeId: edge.target,
              readRps: 0,
              writeRps: writePerQueue,
              hop: hop + 1,
              visitedNodeIds: nextVisited,
            });
          }
          continue;
        }
      }

      // Default even load splitting across all valid outgoing edges (e.g., Client, LoadBalancer, API Gateway, MessageQueue, Worker)
      const perEdgeRead = deltaSurvivedRead / validOutgoing.length;
      const perEdgeWrite = deltaSurvivedWrite / validOutgoing.length;

      for (const edge of validOutgoing) {
        edgeReadById.set(
          edge.id,
          (edgeReadById.get(edge.id) ?? 0) + perEdgeRead,
        );
        edgeWriteById.set(
          edge.id,
          (edgeWriteById.get(edge.id) ?? 0) + perEdgeWrite,
        );
        const nextVisited = new Set(packet.visitedNodeIds);
        nextVisited.add(edge.target);
        nextWave.push({
          nodeId: edge.target,
          readRps: perEdgeRead,
          writeRps: perEdgeWrite,
          hop: hop + 1,
          visitedNodeIds: nextVisited,
        });
      }
    }

    currentWave = nextWave;
  }

  // Final pass: build NodeTelemetry, EdgeTelemetry, overloadStreaks, and system-wide SLA aggregates
  const nodeTelemetry: Record<string, NodeTelemetry> = {};
  const overloadStreaks: Record<string, number> = {};

  let totalCapacityDroppedRps = 0;
  let totalUnroutedDroppedRps = 0;
  let flowWeightedBaseLatencyMs = 0;
  let maxPathQueueingPenaltyMs = 0;

  for (const node of input.nodes) {
    const inRead = incomingReadByNode.get(node.id) ?? 0;
    const inWrite = incomingWriteByNode.get(node.id) ?? 0;
    const unroutedDrop = unroutedDropsByNode.get(node.id) ?? 0;
    const prevStreak = input.previousOverloadStreaks?.[node.id] ?? 0;

    // Preview capacity to check if overloaded on this tick
    const previewEval = computeNodeCapacityAndLoad(
      node.data,
      inRead,
      inWrite,
      prevStreak + 1,
    );
    const isOverloadedThisTick =
      previewEval.utilization > UTILIZATION_OVERLOAD_THRESHOLD;
    const nextStreak = isOverloadedThisTick ? prevStreak + 1 : 0;
    overloadStreaks[node.id] = nextStreak;

    const capacityEval = computeNodeCapacityAndLoad(
      node.data,
      inRead,
      inWrite,
      nextStreak,
    );
    const latencyEval = computeNodeLatencyAndStatus(
      node.data.spec.baseLatencyMs,
      capacityEval.utilization,
      nextStreak,
    );

    const totalNodeDroppedRps = capacityEval.droppedRps + unroutedDrop;
    totalCapacityDroppedRps += capacityEval.droppedRps;
    totalUnroutedDroppedRps += unroutedDrop;

    const bottleneckReason =
      capacityEval.bottleneckReason ??
      (unroutedDrop > 0
        ? `${node.data.label} has no downstream connection to handle ${Math.round(unroutedDrop)} RPS.`
        : undefined);

    nodeTelemetry[node.id] = {
      nodeId: node.id,
      incomingReadRps: Math.round(inRead),
      incomingWriteRps: Math.round(inWrite),
      effectiveUtilization: Number(capacityEval.utilization.toFixed(3)),
      p95LatencyMs: latencyEval.p95LatencyMs,
      droppedRps: Math.round(totalNodeDroppedRps),
      status: latencyEval.status,
      ...(bottleneckReason ? { bottleneckReason } : {}),
      ...(capacityEval.replicationLagMs !== undefined
        ? { replicationLagMs: capacityEval.replicationLagMs }
        : {}),
    };

    if (totalInjectedRps > 0) {
      const nodeTrafficShare = Math.min(
        1,
        (inRead + inWrite) / totalInjectedRps,
      );
      flowWeightedBaseLatencyMs +=
        nodeTrafficShare * node.data.spec.baseLatencyMs;

      // Any active node handling >= 5% of total requests impacts tail P95 when degraded/overloaded
      if (nodeTrafficShare >= 0.05) {
        const queueingPenalty = Math.max(
          0,
          latencyEval.p95LatencyMs - node.data.spec.baseLatencyMs,
        );
        if (queueingPenalty > maxPathQueueingPenaltyMs) {
          maxPathQueueingPenaltyMs = queueingPenalty;
        }
      }
    }
  }

  // If no client node was present, all injected traffic is dropped
  if (clientNodes.length === 0 && totalInjectedRps > 0) {
    totalUnroutedDroppedRps = totalInjectedRps;
  }

  const edgeTelemetry: Record<string, EdgeTelemetry> = {};
  for (const edge of input.edges) {
    const eRead = edgeReadById.get(edge.id) ?? 0;
    const eWrite = edgeWriteById.get(edge.id) ?? 0;
    const targetTelemetry = nodeTelemetry[edge.target];
    const targetDropped = targetTelemetry?.droppedRps ?? 0;
    const isOverloaded =
      targetTelemetry?.status === "OVERLOADED" ||
      targetTelemetry?.status === "CRASHED";

    edgeTelemetry[edge.id] = {
      edgeId: edge.id,
      sourceId: edge.source,
      targetId: edge.target,
      readRps: Math.round(eRead),
      writeRps: Math.round(eWrite),
      droppedRps: isOverloaded ? targetDropped : 0,
      isOverloaded,
    };
  }

  const rawTotalDropped = Math.min(
    totalInjectedRps,
    totalCapacityDroppedRps + totalUnroutedDroppedRps,
  );
  const overallDroppedRps = Math.round(rawTotalDropped);

  const survivalFraction =
    totalInjectedRps > 0
      ? Math.max(0, (totalInjectedRps - rawTotalDropped) / totalInjectedRps)
      : 1;

  const overallReadRps = Math.round(totalTargetReadRps * survivalFraction);
  const overallWriteRps = Math.round(totalTargetWriteRps * survivalFraction);

  const overallErrorRatePercent =
    totalInjectedRps > 0
      ? Number(((rawTotalDropped / totalInjectedRps) * 100).toFixed(2))
      : 0;

  const overallP95LatencyMs =
    totalInjectedRps > 0 && clientNodes.length > 0
      ? Math.max(
          1,
          Math.round(flowWeightedBaseLatencyMs + maxPathQueueingPenaltyMs),
        )
      : 0;

  const estimatedMonthlyCostUsd = computeTotalMonthlyCost(input.nodes);

  return {
    tick: input.tick,
    nodeTelemetry,
    edgeTelemetry,
    overallReadRps,
    overallWriteRps,
    overallDroppedRps,
    overallP95LatencyMs,
    overallErrorRatePercent,
    estimatedMonthlyCostUsd,
    overloadStreaks,
  };
}

/**
 * Executes a multi-tick simulation sequence (e.g., 10-tick SLA stress test),
 * propagating `overloadStreaks` across consecutive ticks so sustained overload (>3 ticks)
 * triggers `CRASHED` node status.
 */
export function simulateMultiTickRun(
  baseInput: Omit<SimulationTickInput, "tick" | "previousOverloadStreaks">,
  tickCount: number = 10,
): SimulationTickResult[] {
  const safeTickCount = Math.max(1, Math.floor(tickCount));
  const results: SimulationTickResult[] = [];
  let currentStreaks: Record<string, number> = {};

  for (let tick = 1; tick <= safeTickCount; tick += 1) {
    const tickResult = simulateTick({
      ...baseInput,
      tick,
      previousOverloadStreaks: currentStreaks,
    });
    results.push(tickResult);
    currentStreaks = tickResult.overloadStreaks;
  }

  return results;
}

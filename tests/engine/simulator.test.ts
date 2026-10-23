import { describe, expect, it } from "vitest";
import {
  computeNodeMonthlyCost,
  simulateMultiTickRun,
  simulateTick,
} from "@/engine/simulator";
import { createDefaultNodeConfig, type CanvasNode } from "@/engine/types";
import { getModuleBySlug } from "@/modules";

describe("Directed-Graph Tick Load Simulator (FEAT-02)", () => {
  it("flags bottlenecks on 01-single-server-bottleneck starterGraph and passes all SLA metrics on referenceSolution", () => {
    const mod = getModuleBySlug("01-single-server-bottleneck");
    expect(mod).toBeDefined();
    if (!mod) return;

    const starterTick = simulateTick({
      tick: 1,
      nodes: mod.starterGraph.nodes,
      edges: mod.starterGraph.edges,
      targetReadRps: mod.requirements.sla.targetReadRps,
      targetWriteRps: mod.requirements.sla.targetWriteRps,
    });

    expect(starterTick.overallDroppedRps).toBeGreaterThan(0);
    expect(starterTick.overallErrorRatePercent).toBeGreaterThan(0);
    expect(starterTick.nodeTelemetry["api-1"]?.status).toBe("OVERLOADED");
    expect(starterTick.nodeTelemetry["pg-1"]?.status).toBe("OVERLOADED");
    expect(starterTick.overallP95LatencyMs).toBeGreaterThan(
      mod.requirements.sla.maxP95LatencyMs,
    );

    const refTick = simulateTick({
      tick: 1,
      nodes: mod.referenceSolution.nodes,
      edges: mod.referenceSolution.edges,
      targetReadRps: mod.requirements.sla.targetReadRps,
      targetWriteRps: mod.requirements.sla.targetWriteRps,
    });

    expect(refTick.overallDroppedRps).toBe(0);
    expect(refTick.overallErrorRatePercent).toBe(0);
    expect(refTick.overallReadRps).toBe(3_500);
    expect(refTick.overallWriteRps).toBe(500);
    expect(refTick.overallP95LatencyMs).toBeLessThanOrEqual(
      mod.requirements.sla.maxP95LatencyMs,
    );
    expect(refTick.estimatedMonthlyCostUsd).toBe(850);
    expect(refTick.nodeTelemetry["pg-1"]?.incomingReadRps).toBe(525);
    expect(refTick.nodeTelemetry["pg-1"]?.incomingWriteRps).toBe(500);
  });

  it("models multi-layer CDN + Redis read offload accurately on 02-url-shortener referenceSolution", () => {
    const mod = getModuleBySlug("02-url-shortener");
    expect(mod).toBeDefined();
    if (!mod) return;

    const refTick = simulateTick({
      tick: 1,
      nodes: mod.referenceSolution.nodes,
      edges: mod.referenceSolution.edges,
      targetReadRps: mod.requirements.sla.targetReadRps,
      targetWriteRps: mod.requirements.sla.targetWriteRps,
    });

    // 50,000 Read RPS -> CDN (80% hit) -> 10,000 Read RPS at LB & API -> Redis (85% hit) -> 1,500 Read RPS at NoSQL DB
    expect(refTick.nodeTelemetry["cdn-1"]?.incomingReadRps).toBe(50_000);
    expect(refTick.nodeTelemetry["lb-1"]?.incomingReadRps).toBe(10_000);
    expect(refTick.nodeTelemetry["lb-1"]?.incomingWriteRps).toBe(2_500);
    expect(refTick.nodeTelemetry["redis-1"]?.incomingReadRps).toBe(10_000);
    expect(refTick.nodeTelemetry["nosql-1"]?.incomingReadRps).toBe(1_500);
    expect(refTick.nodeTelemetry["nosql-1"]?.incomingWriteRps).toBe(2_500);
    expect(refTick.overallDroppedRps).toBe(0);
    expect(refTick.overallP95LatencyMs).toBeLessThanOrEqual(
      mod.requirements.sla.maxP95LatencyMs,
    );
  });

  it("produces identical database Read/Write offload for Parallel (API -> Redis + API -> DB) and Serial (API -> Redis -> DB) cache-aside wiring", () => {
    const nodes: CanvasNode[] = [
      {
        id: "client-1",
        type: "client",
        position: { x: 0, y: 0 },
        data: createDefaultNodeConfig("client", "client-1"),
      },
      {
        id: "api-1",
        type: "api_server",
        position: { x: 200, y: 0 },
        data: {
          ...createDefaultNodeConfig("api_server", "api-1"),
          spec: {
            ...createDefaultNodeConfig("api_server", "api-1").spec,
            instances: 2,
          },
        },
      },
      {
        id: "redis-1",
        type: "redis_cache",
        position: { x: 400, y: -80 },
        data: createDefaultNodeConfig("redis_cache", "redis-1"),
      },
      {
        id: "pg-1",
        type: "postgres_db",
        position: { x: 400, y: 80 },
        data: createDefaultNodeConfig("postgres_db", "pg-1"),
      },
    ];

    const parallelTick = simulateTick({
      tick: 1,
      nodes,
      edges: [
        { id: "e1", source: "client-1", target: "api-1" },
        { id: "e2", source: "api-1", target: "redis-1" },
        { id: "e3", source: "api-1", target: "pg-1" },
      ],
      targetReadRps: 2_000,
      targetWriteRps: 400,
    });

    const serialTick = simulateTick({
      tick: 1,
      nodes,
      edges: [
        { id: "e1", source: "client-1", target: "api-1" },
        { id: "e2", source: "api-1", target: "redis-1" },
        { id: "e3", source: "redis-1", target: "pg-1" },
      ],
      targetReadRps: 2_000,
      targetWriteRps: 400,
    });

    // 2,000 Read * (1 - 0.85) = 300 Read RPS + 400 Write RPS at Postgres in both layouts
    expect(parallelTick.nodeTelemetry["pg-1"]?.incomingReadRps).toBe(300);
    expect(parallelTick.nodeTelemetry["pg-1"]?.incomingWriteRps).toBe(400);
    expect(serialTick.nodeTelemetry["pg-1"]?.incomingReadRps).toBe(300);
    expect(serialTick.nodeTelemetry["pg-1"]?.incomingWriteRps).toBe(400);
  });

  it("calculates database Read Replica capacity, replication write tax, replicationLagMs, and 0.5x replica cost", () => {
    const pgWithReplicas = createDefaultNodeConfig("postgres_db", "pg-rep");
    pgWithReplicas.readReplicaCount = 2;

    // Base cost is $280; 2 replicas add 2 * 0.5 * $280 = $280 -> $560 total
    expect(computeNodeMonthlyCost(pgWithReplicas)).toBe(560);

    const nodes: CanvasNode[] = [
      {
        id: "client-1",
        type: "client",
        position: { x: 0, y: 0 },
        data: createDefaultNodeConfig("client", "client-1"),
      },
      {
        id: "pg-rep",
        type: "postgres_db",
        position: { x: 300, y: 0 },
        data: pgWithReplicas,
      },
    ];

    // Without replicas, 3,000 Read RPS + 500 Write RPS = 3,500 RPS would overload 1,500 RPS Postgres.
    // With 2 read replicas, read capacity scales to 1,500 * 3 = 4,500 RPS, while 500 Write RPS incurs 24% write tax (620 effective write load).
    const tick = simulateTick({
      tick: 1,
      nodes,
      edges: [{ id: "e1", source: "client-1", target: "pg-rep" }],
      targetReadRps: 3_000,
      targetWriteRps: 500,
    });

    const pgTelemetry = tick.nodeTelemetry["pg-rep"];
    expect(pgTelemetry).toBeDefined();
    expect(pgTelemetry?.droppedRps).toBe(0);
    expect(pgTelemetry?.replicationLagMs).toBeGreaterThan(0);
  });

  it("transitions an overloaded node from OVERLOADED (ticks 1-3) to CRASHED on tick 4 during a multi-tick run", () => {
    const mod = getModuleBySlug("01-single-server-bottleneck");
    expect(mod).toBeDefined();
    if (!mod) return;

    const ticks = simulateMultiTickRun(
      {
        nodes: mod.starterGraph.nodes,
        edges: mod.starterGraph.edges,
        targetReadRps: 3_500,
        targetWriteRps: 500,
      },
      5,
    );

    expect(ticks).toHaveLength(5);
    expect(ticks[0]?.nodeTelemetry["api-1"]?.status).toBe("OVERLOADED");
    expect(ticks[1]?.nodeTelemetry["api-1"]?.status).toBe("OVERLOADED");
    expect(ticks[2]?.nodeTelemetry["api-1"]?.status).toBe("OVERLOADED");
    expect(ticks[3]?.nodeTelemetry["api-1"]?.status).toBe("CRASHED");
    expect(ticks[4]?.nodeTelemetry["api-1"]?.status).toBe("CRASHED");
  });

  it("guards against cyclic graphs and counts dead-end unrouted traffic as dropped", () => {
    const nodes: CanvasNode[] = [
      {
        id: "client-1",
        type: "client",
        position: { x: 0, y: 0 },
        data: createDefaultNodeConfig("client", "client-1"),
      },
      {
        id: "api-1",
        type: "api_server",
        position: { x: 200, y: 0 },
        data: createDefaultNodeConfig("api_server", "api-1"),
      },
      {
        id: "api-2",
        type: "api_server",
        position: { x: 400, y: 0 },
        data: createDefaultNodeConfig("api_server", "api-2"),
      },
    ];

    // Cyclic loop api-1 <-> api-2 with no terminal storage node
    const tick = simulateTick({
      tick: 1,
      nodes,
      edges: [
        { id: "e1", source: "client-1", target: "api-1" },
        { id: "e2", source: "api-1", target: "api-2" },
        { id: "e3", source: "api-2", target: "api-1" },
      ],
      targetReadRps: 1_000,
      targetWriteRps: 200,
    });

    // Terminates cleanly and marks all 1,200 RPS as dropped because api-2 has no non-cyclic terminal sink
    expect(tick.overallDroppedRps).toBe(1_200);
    expect(tick.overallErrorRatePercent).toBe(100);
  });
});

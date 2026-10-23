import { create } from "zustand";
import { simulateTick } from "@/engine/simulator";
import {
  createDefaultNodeConfig,
  type CanvasEdge,
  type CanvasNode,
  type EdgeTelemetry,
  type HardwareSpec,
  type LearningModule,
  type NodeCategory,
  type NodeConfig,
  type NodeTelemetry,
  type SimulationTickResult,
  type TopologyCheckResult,
  type TrafficMultiplier,
} from "@/engine/types";
import { getLayoutedGraph } from "@/lib/dagre-layout";

export interface WorkbenchState {
  moduleSlug: string;
  moduleDef: LearningModule | null;

  // React Flow graph state
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  selectedNodeId: string | null;

  // Simulation controls & telemetry
  isPlaying: boolean;
  currentTick: number;
  trafficMultiplier: TrafficMultiplier;
  nodeTelemetry: Record<string, NodeTelemetry>;
  edgeTelemetry: Record<string, EdgeTelemetry>;
  latestTickResult: SimulationTickResult | null;
  overloadStreaks: Record<string, number>;

  // Real-time evaluated topology checks
  topologyResults: TopologyCheckResult[];

  // Draft persistence state
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;

  // Actions
  initWorkbench: (
    moduleDef: LearningModule,
    initialNodes?: CanvasNode[],
    initialEdges?: CanvasEdge[],
  ) => void;
  setNodes: (nodes: CanvasNode[]) => void;
  setEdges: (edges: CanvasEdge[]) => void;
  selectNode: (nodeId: string | null) => void;

  addNode: (type: NodeCategory, customPosition?: { x: number; y: number }) => void;
  removeNode: (nodeId: string) => void;
  addEdge: (sourceId: string, targetId: string) => void;
  removeEdge: (edgeId: string) => void;

  updateNodeSpec: (nodeId: string, partial: Partial<HardwareSpec>) => void;
  updateNodeBehavior: (
    nodeId: string,
    partial: Pick<
      NodeConfig,
      "cacheHitRatio" | "readReplicaCount" | "shardingEnabled" | "rateLimitRps"
    >,
  ) => void;

  stepSimulation: () => void;
  setIsPlaying: (playing: boolean) => void;
  setTrafficMultiplier: (multiplier: TrafficMultiplier) => void;

  autoLayoutGraph: () => void;
  resetGraph: () => Promise<void>;
  saveDraftNow: () => Promise<void>;
}

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

function evaluateTopology(
  moduleDef: LearningModule | null,
  nodes: CanvasNode[],
  edges: CanvasEdge[],
): TopologyCheckResult[] {
  if (!moduleDef) return [];
  return moduleDef.topologyRules.map((rule) => {
    const res = rule.validate(nodes, edges);
    return {
      ruleId: rule.id,
      description: rule.description,
      passed: res.passed,
      reason: res.reason,
    };
  });
}

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  moduleSlug: "",
  moduleDef: null,

  nodes: [],
  edges: [],
  selectedNodeId: null,

  isPlaying: false,
  currentTick: 0,
  trafficMultiplier: 1,
  nodeTelemetry: {},
  edgeTelemetry: {},
  latestTickResult: null,
  overloadStreaks: {},

  topologyResults: [],

  isDirty: false,
  isSaving: false,
  lastSavedAt: null,

  initWorkbench: (moduleDef, initialNodes, initialEdges) => {
    const nodes = initialNodes ?? moduleDef.starterGraph.nodes;
    const edges = initialEdges ?? moduleDef.starterGraph.edges;

    const initialTick = simulateTick({
      tick: 1,
      nodes,
      edges,
      targetReadRps: moduleDef.requirements.sla.targetReadRps,
      targetWriteRps: moduleDef.requirements.sla.targetWriteRps,
      trafficMultiplier: 1,
    });

    const topologyResults = evaluateTopology(moduleDef, nodes, edges);

    set({
      moduleSlug: moduleDef.metadata.slug,
      moduleDef,
      nodes,
      edges,
      selectedNodeId: null,
      isPlaying: false,
      currentTick: 1,
      trafficMultiplier: 1,
      nodeTelemetry: initialTick.nodeTelemetry,
      edgeTelemetry: initialTick.edgeTelemetry,
      latestTickResult: initialTick,
      overloadStreaks: initialTick.overloadStreaks,
      topologyResults,
      isDirty: false,
      isSaving: false,
      lastSavedAt: null,
    });
  },

  setNodes: (nodes) => {
    const { moduleDef, edges } = get();
    const topologyResults = evaluateTopology(moduleDef, nodes, edges);
    set({ nodes, isDirty: true, topologyResults });
  },

  setEdges: (edges) => {
    const { moduleDef, nodes } = get();
    const topologyResults = evaluateTopology(moduleDef, nodes, edges);
    set({ edges, isDirty: true, topologyResults });
  },

  selectNode: (nodeId) => {
    set({ selectedNodeId: nodeId });
  },

  addNode: (type, customPosition) => {
    const { nodes, moduleDef } = get();
    const typeCount = nodes.filter((n) => n.type === type).length + 1;
    const newId = `${type}-${Date.now().toString().slice(-4)}`;

    const position = customPosition ?? {
      x: 180 + (nodes.length % 5) * 60,
      y: 120 + (nodes.length % 5) * 50,
    };

    const newNode: CanvasNode = {
      id: newId,
      type,
      position,
      data: createDefaultNodeConfig(
        type,
        newId,
        `${type.replace("_", " ").toUpperCase()} #${typeCount}`,
      ),
    };

    const nextNodes = [...nodes, newNode];
    const topologyResults = evaluateTopology(moduleDef, nextNodes, get().edges);

    set({
      nodes: nextNodes,
      selectedNodeId: newId,
      isDirty: true,
      topologyResults,
    });
    get().stepSimulation();
  },

  removeNode: (nodeId) => {
    const { nodes, edges, selectedNodeId, moduleDef } = get();
    const nextNodes = nodes.filter((n) => n.id !== nodeId);
    const nextEdges = edges.filter(
      (e) => e.source !== nodeId && e.target !== nodeId,
    );

    const topologyResults = evaluateTopology(moduleDef, nextNodes, nextEdges);

    set({
      nodes: nextNodes,
      edges: nextEdges,
      selectedNodeId: selectedNodeId === nodeId ? null : selectedNodeId,
      isDirty: true,
      topologyResults,
    });
    get().stepSimulation();
  },

  addEdge: (sourceId, targetId) => {
    if (sourceId === targetId) return;
    const { edges, moduleDef, nodes } = get();
    const exists = edges.some(
      (e) => e.source === sourceId && e.target === targetId,
    );
    if (exists) return;

    const newEdge: CanvasEdge = {
      id: `e-${sourceId}-${targetId}`,
      source: sourceId,
      target: targetId,
    };

    const nextEdges = [...edges, newEdge];
    const topologyResults = evaluateTopology(moduleDef, nodes, nextEdges);

    set({ edges: nextEdges, isDirty: true, topologyResults });
    get().stepSimulation();
  },

  removeEdge: (edgeId) => {
    const { edges, moduleDef, nodes } = get();
    const nextEdges = edges.filter((e) => e.id !== edgeId);
    const topologyResults = evaluateTopology(moduleDef, nodes, nextEdges);

    set({ edges: nextEdges, isDirty: true, topologyResults });
    get().stepSimulation();
  },

  updateNodeSpec: (nodeId, partial) => {
    const { nodes } = get();
    const nextNodes = nodes.map((node) => {
      if (node.id !== nodeId) return node;
      return {
        ...node,
        data: {
          ...node.data,
          spec: {
            ...node.data.spec,
            ...partial,
          },
        },
      };
    });

    set({ nodes: nextNodes, isDirty: true });
    get().stepSimulation();
  },

  updateNodeBehavior: (nodeId, partial) => {
    const { nodes } = get();
    const nextNodes = nodes.map((node) => {
      if (node.id !== nodeId) return node;
      return {
        ...node,
        data: {
          ...node.data,
          ...partial,
        },
      };
    });

    set({ nodes: nextNodes, isDirty: true });
    get().stepSimulation();
  },

  stepSimulation: () => {
    const {
      nodes,
      edges,
      moduleDef,
      currentTick,
      trafficMultiplier,
      overloadStreaks,
    } = get();

    if (!moduleDef) return;

    const nextTickNum = currentTick + 1;
    const tickResult = simulateTick({
      tick: nextTickNum,
      nodes,
      edges,
      targetReadRps: moduleDef.requirements.sla.targetReadRps,
      targetWriteRps: moduleDef.requirements.sla.targetWriteRps,
      trafficMultiplier,
      previousOverloadStreaks: overloadStreaks,
    });

    set({
      currentTick: nextTickNum,
      nodeTelemetry: tickResult.nodeTelemetry,
      edgeTelemetry: tickResult.edgeTelemetry,
      latestTickResult: tickResult,
      overloadStreaks: tickResult.overloadStreaks,
    });

    // Schedule debounced auto-save
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      void get().saveDraftNow();
    }, 1500);
  },

  setIsPlaying: (playing) => {
    set({ isPlaying: playing });
  },

  setTrafficMultiplier: (multiplier) => {
    set({ trafficMultiplier: multiplier });
    get().stepSimulation();
  },

  autoLayoutGraph: () => {
    const { nodes, edges } = get();
    const layoutedNodes = getLayoutedGraph(nodes, edges);
    set({ nodes: layoutedNodes, isDirty: true });
  },

  resetGraph: () => {
    const { moduleSlug, moduleDef } = get();
    if (!moduleDef) return Promise.resolve();

    const starterNodes = moduleDef.starterGraph.nodes;
    const starterEdges = moduleDef.starterGraph.edges;

    const initialTick = simulateTick({
      tick: 1,
      nodes: starterNodes,
      edges: starterEdges,
      targetReadRps: moduleDef.requirements.sla.targetReadRps,
      targetWriteRps: moduleDef.requirements.sla.targetWriteRps,
      trafficMultiplier: 1,
    });

    const topologyResults = evaluateTopology(
      moduleDef,
      starterNodes,
      starterEdges,
    );

    set({
      nodes: starterNodes,
      edges: starterEdges,
      selectedNodeId: null,
      isPlaying: false,
      currentTick: 1,
      trafficMultiplier: 1,
      nodeTelemetry: initialTick.nodeTelemetry,
      edgeTelemetry: initialTick.edgeTelemetry,
      latestTickResult: initialTick,
      overloadStreaks: initialTick.overloadStreaks,
      topologyResults,
      isDirty: false,
    });

    // Notify backend
    return fetch(`/api/modules/${moduleSlug}/reset`, {
      method: "POST",
    })
      .then(() => undefined)
      .catch(() => undefined);
  },

  saveDraftNow: async () => {
    const { moduleSlug, nodes, edges, isDirty } = get();
    if (!moduleSlug || !isDirty) return;

    set({ isSaving: true });
    try {
      await fetch(`/api/modules/${moduleSlug}/draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, edges }),
      });
      set({
        isSaving: false,
        isDirty: false,
        lastSavedAt: new Date().toLocaleTimeString(),
      });
    } catch {
      // Local fallback: save to localStorage
      try {
        localStorage.setItem(
          `draft-${moduleSlug}`,
          JSON.stringify({ nodes, edges, savedAt: new Date().toISOString() }),
        );
      } catch {
        // Ignore quota errors
      }
      set({
        isSaving: false,
        isDirty: false,
        lastSavedAt: `${new Date().toLocaleTimeString()} (local)`,
      });
    }
  },
}));

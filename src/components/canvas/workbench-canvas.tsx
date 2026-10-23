"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { CanvasEdge, CanvasNode } from "@/engine/types";
import { useWorkbenchStore } from "@/store/use-workbench-store";
import { AnimatedTrafficEdge } from "./animated-traffic-edge";
import { HardwareNode, type HardwareNodeData } from "./hardware-node";
import { NodePalette } from "./node-palette";
import { SimControlBar } from "./sim-control-bar";

const nodeTypes: NodeTypes = {
  hardware: HardwareNode,
};

const edgeTypes = {
  default: AnimatedTrafficEdge,
  animated: AnimatedTrafficEdge,
};

export function WorkbenchCanvas() {
  const nodes = useWorkbenchStore((state) => state.nodes);
  const edges = useWorkbenchStore((state) => state.edges);
  const setNodes = useWorkbenchStore((state) => state.setNodes);
  const setEdges = useWorkbenchStore((state) => state.setEdges);
  const addEdge = useWorkbenchStore((state) => state.addEdge);
  const selectNode = useWorkbenchStore((state) => state.selectNode);

  const isPlaying = useWorkbenchStore((state) => state.isPlaying);
  const stepSimulation = useWorkbenchStore((state) => state.stepSimulation);

  // Simulation tick loop when Play is active
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      stepSimulation();
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, stepSimulation]);

  // Convert pure CanvasNode[] to ReactFlow Node<HardwareNodeData>[]
  const flowNodes: Node<HardwareNodeData>[] = useMemo(() => {
    return nodes.map((node) => ({
      id: node.id,
      type: "hardware",
      position: node.position,
      data: node.data as HardwareNodeData,
    }));
  }, [nodes]);

  // Convert pure CanvasEdge[] to ReactFlow Edge[]
  const flowEdges: Edge[] = useMemo(() => {
    return edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: "animated",
      animated: true,
    }));
  }, [edges]);

  const onNodesChange = useCallback(
    (changes: NodeChange<Node<HardwareNodeData>>[]) => {
      const updatedFlowNodes = applyNodeChanges(changes, flowNodes);
      const nextCanvasNodes: CanvasNode[] = updatedFlowNodes.map((fn) => ({
        id: fn.id,
        type: fn.data.type,
        position: fn.position,
        data: fn.data,
      }));
      setNodes(nextCanvasNodes);
    },
    [flowNodes, setNodes],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      const updatedFlowEdges = applyEdgeChanges(changes, flowEdges);
      const nextCanvasEdges: CanvasEdge[] = updatedFlowEdges.map((fe) => ({
        id: fe.id,
        source: fe.source,
        target: fe.target,
      }));
      setEdges(nextCanvasEdges);
    },
    [flowEdges, setEdges],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        addEdge(connection.source, connection.target);
      }
    },
    [addEdge],
  );

  return (
    <div className="relative h-full w-full bg-slate-950 overflow-hidden select-none">
      <NodePalette />

      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={() => selectNode(null)}
        fitView
        minZoom={0.2}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
        className="bg-engineering-grid"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#334155"
        />
        <Controls
          showInteractive={false}
          className="!bottom-24 !left-4 !border-slate-800 !bg-slate-950/90 !text-slate-300 [&>button]:!border-slate-800 [&>button]:!bg-slate-900 [&>button]:!fill-slate-300"
        />
        <MiniMap
          nodeColor="#10b981"
          maskColor="rgba(2, 6, 23, 0.75)"
          className="!bottom-24 !right-4 !border !border-slate-800 !bg-slate-950 !rounded-xl !overflow-hidden hidden sm:block"
        />
      </ReactFlow>

      <SimControlBar />
    </div>
  );
}

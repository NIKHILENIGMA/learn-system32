import dagre from "@dagrejs/dagre";
import type { CanvasEdge, CanvasNode } from "@/engine/types";

export const NODE_WIDTH = 260;
export const NODE_HEIGHT = 140;

export interface LayoutOptions {
  direction?: "LR" | "TB";
  nodeWidth?: number;
  nodeHeight?: number;
}

/**
 * Calculates hierarchical node positions using Dagre without mutating the input nodes array.
 */
export function getLayoutedGraph(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  options: LayoutOptions = {},
): CanvasNode[] {
  const direction = options.direction ?? "LR";
  const nodeWidth = options.nodeWidth ?? NODE_WIDTH;
  const nodeHeight = options.nodeHeight ?? NODE_HEIGHT;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 50,
    ranksep: 90,
    marginx: 40,
    marginy: 40,
  });

  for (const node of nodes) {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  }

  for (const edge of edges) {
    dagreGraph.setEdge(edge.source, edge.target);
  }

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    if (!nodeWithPosition) {
      return node;
    }

    return {
      ...node,
      position: {
        x: Math.round(nodeWithPosition.x - nodeWidth / 2),
        y: Math.round(nodeWithPosition.y - nodeHeight / 2),
      },
    };
  });
}

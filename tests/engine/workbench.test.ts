import { describe, expect, it } from "vitest";
import { getLayoutedGraph } from "@/lib/dagre-layout";
import { getModuleBySlug } from "@/modules";
import { useWorkbenchStore } from "@/store/use-workbench-store";

describe("Interactive Workbench & Dagre Layout (FEAT-03)", () => {
  it("computes left-to-right hierarchical coordinates via getLayoutedGraph", () => {
    const mod = getModuleBySlug("01-single-server-bottleneck");
    expect(mod).toBeDefined();
    if (!mod) return;

    const layoutedNodes = getLayoutedGraph(
      mod.referenceSolution.nodes,
      mod.referenceSolution.edges,
    );

    expect(layoutedNodes).toHaveLength(mod.referenceSolution.nodes.length);

    const clientNode = layoutedNodes.find((n) => n.type === "client");
    const lbNode = layoutedNodes.find((n) => n.type === "load_balancer");
    const apiNode = layoutedNodes.find((n) => n.type === "api_server");
    const pgNode = layoutedNodes.find((n) => n.type === "postgres_db");

    expect(clientNode).toBeDefined();
    expect(lbNode).toBeDefined();
    expect(apiNode).toBeDefined();
    expect(pgNode).toBeDefined();

    if (clientNode && lbNode && apiNode && pgNode) {
      // In LR layout: client.x < lb.x < api.x < pg.x
      expect(clientNode.position.x).toBeLessThan(lbNode.position.x);
      expect(lbNode.position.x).toBeLessThan(apiNode.position.x);
      expect(apiNode.position.x).toBeLessThan(pgNode.position.x);
    }
  });

  it("initializes workbench store and allows adding, connecting, and updating hardware nodes", () => {
    const mod = getModuleBySlug("01-single-server-bottleneck");
    expect(mod).toBeDefined();
    if (!mod) return;

    const store = useWorkbenchStore.getState();
    store.initWorkbench(mod);

    expect(useWorkbenchStore.getState().moduleSlug).toBe("01-single-server-bottleneck");
    expect(useWorkbenchStore.getState().nodes.length).toBe(
      mod.starterGraph.nodes.length,
    );

    // Starter graph has failing topology rules
    expect(
      useWorkbenchStore.getState().topologyResults.some((r) => !r.passed),
    ).toBe(true);

    // Add an L7 Load Balancer
    useWorkbenchStore.getState().addNode("load_balancer", { x: 250, y: 150 });
    const updatedNodes = useWorkbenchStore.getState().nodes;
    const lb = updatedNodes.find((n) => n.type === "load_balancer");
    expect(lb).toBeDefined();

    // Scale API instances
    const api = updatedNodes.find((n) => n.type === "api_server");
    expect(api).toBeDefined();
    if (api) {
      useWorkbenchStore.getState().updateNodeSpec(api.id, { instances: 3 });
      const currentApi = useWorkbenchStore
        .getState()
        .nodes.find((n) => n.id === api.id);
      expect(currentApi?.data.spec.instances).toBe(3);
    }

    // Step simulation
    const prevTick = useWorkbenchStore.getState().currentTick;
    useWorkbenchStore.getState().stepSimulation();
    expect(useWorkbenchStore.getState().currentTick).toBe(prevTick + 1);
  });
});

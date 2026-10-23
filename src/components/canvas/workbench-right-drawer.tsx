"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Database,
  DollarSign,
  HardDrive,
  Info,
  Layers,
  Sliders,
  Trash2,
  Zap,
} from "lucide-react";
import { computeNodeMonthlyCost } from "@/engine/simulator";
import { cn, formatCompactRps, formatUsdMonthly } from "@/lib/utils";
import { useWorkbenchStore } from "@/store/use-workbench-store";

export function WorkbenchRightDrawer() {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"inspector" | "insights">("inspector");

  const nodes = useWorkbenchStore((state) => state.nodes);
  const selectedNodeId = useWorkbenchStore((state) => state.selectedNodeId);
  const nodeTelemetry = useWorkbenchStore((state) => state.nodeTelemetry);
  const moduleDef = useWorkbenchStore((state) => state.moduleDef);

  const updateNodeSpec = useWorkbenchStore((state) => state.updateNodeSpec);
  const updateNodeBehavior = useWorkbenchStore((state) => state.updateNodeBehavior);
  const removeNode = useWorkbenchStore((state) => state.removeNode);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const telemetry = selectedNodeId ? nodeTelemetry[selectedNodeId] : undefined;

  const isDatabase =
    selectedNode?.type === "postgres_db" || selectedNode?.type === "nosql_db";
  const hasCache =
    selectedNode?.type === "redis_cache" || selectedNode?.type === "cdn";
  const isApiGateway = selectedNode?.type === "api_gateway";

  const monthlyCost = selectedNode
    ? computeNodeMonthlyCost(selectedNode.data)
    : 0;

  return (
    <aside
      className={cn(
        "relative flex h-full flex-col border-l border-slate-800/90 bg-slate-950/95 transition-all duration-300 z-20 backdrop-blur select-none",
        isOpen ? "w-80 md:w-96" : "w-12",
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -left-3.5 top-6 z-30 flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 shadow hover:border-slate-500 hover:text-white"
        title={isOpen ? "Collapse drawer" : "Expand drawer"}
      >
        {isOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      {isOpen ? (
        <div className="flex h-full flex-col overflow-hidden">
          <div className="flex items-center border-b border-slate-800/80 px-4 pt-3 pb-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("inspector")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition",
                activeTab === "inspector"
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                  : "text-slate-400 hover:text-slate-200",
              )}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Hardware Inspector</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("insights")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition",
                activeTab === "insights"
                  ? "bg-sky-500/15 text-sky-300 border border-sky-500/40"
                  : "text-slate-400 hover:text-slate-200",
              )}
            >
              <Info className="h-3.5 w-3.5" />
              <span>Reference &amp; Insights</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
            {activeTab === "inspector" ? (
              selectedNode ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div>
                      <h4 className="font-mono text-sm font-bold text-slate-100">
                        {selectedNode.data.label}
                      </h4>
                      <p className="font-mono text-[10px] text-slate-400">
                        Type: {selectedNode.type} &bull; ID: {selectedNode.id}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeNode(selectedNode.id)}
                      className="flex h-8 items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 font-mono text-xs text-rose-300 transition hover:bg-rose-500/20"
                      title="Delete selected node"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>

                  {telemetry && (
                    <section className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3 font-mono text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Live Health:</span>
                        <span
                          className={cn(
                            "rounded px-2 py-0.5 text-[10px] uppercase font-bold",
                            telemetry.status === "HEALTHY"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : telemetry.status === "DEGRADED"
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-rose-500/20 text-rose-300",
                          )}
                        >
                          {telemetry.status} ({Math.round(telemetry.effectiveUtilization * 100)}%)
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <div className="flex items-center gap-1 text-slate-400">
                            <Activity className="h-3 w-3 text-sky-400" />
                            <span>Read Load</span>
                          </div>
                          <div className="font-semibold text-slate-100">
                            {formatCompactRps(telemetry.incomingReadRps)}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-1 text-slate-400">
                            <Activity className="h-3 w-3 text-emerald-400" />
                            <span>Write Load</span>
                          </div>
                          <div className="font-semibold text-slate-100">
                            {formatCompactRps(telemetry.incomingWriteRps)}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-1 text-slate-400">
                            <Zap className="h-3 w-3 text-amber-400" />
                            <span>P95 Latency</span>
                          </div>
                          <div className="font-semibold text-slate-100">
                            {telemetry.p95LatencyMs}ms
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-1 text-slate-400">
                            <DollarSign className="h-3 w-3 text-emerald-400" />
                            <span>Node Cost</span>
                          </div>
                          <div className="font-semibold text-slate-100">
                            {formatUsdMonthly(monthlyCost)}
                          </div>
                        </div>
                      </div>

                      {telemetry.replicationLagMs !== undefined && (
                        <div className="pt-1 text-[10px] text-amber-300">
                          Replication Lag: {telemetry.replicationLagMs}ms
                        </div>
                      )}

                      {telemetry.bottleneckReason && (
                        <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] text-amber-300">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>{telemetry.bottleneckReason}</span>
                        </div>
                      )}
                    </section>
                  )}

                  <section className="space-y-4">
                    <h5 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                      Hardware Spec Tuning
                    </h5>

                    <div className="space-y-1.5 font-mono">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 flex items-center gap-1">
                          <Cpu className="h-3.5 w-3.5 text-sky-400" />
                          Instances (Horizontal Fleet):
                        </span>
                        <span className="font-bold text-sky-300">
                          {selectedNode.data.spec.instances}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={16}
                        step={1}
                        value={selectedNode.data.spec.instances}
                        onChange={(e) =>
                          updateNodeSpec(selectedNode.id, {
                            instances: Number.parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full accent-sky-400 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>1 instance</span>
                        <span>16 instances</span>
                      </div>
                    </div>

                    {hasCache && (
                      <div className="space-y-1.5 font-mono border-t border-slate-800/80 pt-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300 flex items-center gap-1">
                            <HardDrive className="h-3.5 w-3.5 text-amber-400" />
                            Cache Hit Ratio:
                          </span>
                          <span className="font-bold text-amber-300">
                            {Math.round(
                              (selectedNode.data.cacheHitRatio ?? 0.85) * 100,
                            )}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.5}
                          max={0.98}
                          step={0.01}
                          value={selectedNode.data.cacheHitRatio ?? 0.85}
                          onChange={(e) =>
                            updateNodeBehavior(selectedNode.id, {
                              cacheHitRatio: Number.parseFloat(e.target.value),
                            })
                          }
                          className="w-full accent-amber-400 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>50%</span>
                          <span>98%</span>
                        </div>
                      </div>
                    )}

                    {isDatabase && (
                      <div className="space-y-3 font-mono border-t border-slate-800/80 pt-3">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-300 flex items-center gap-1">
                              <Database className="h-3.5 w-3.5 text-emerald-400" />
                              Read Replicas:
                            </span>
                            <span className="font-bold text-emerald-300">
                              {selectedNode.data.readReplicaCount ?? 0}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={8}
                            step={1}
                            value={selectedNode.data.readReplicaCount ?? 0}
                            onChange={(e) =>
                              updateNodeBehavior(selectedNode.id, {
                                readReplicaCount: Number.parseInt(e.target.value, 10),
                              })
                            }
                            className="w-full accent-emerald-400 cursor-pointer"
                          />
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>0 replicas (Primary only)</span>
                            <span>8 replicas</span>
                          </div>
                        </div>

                        <label className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 p-2.5 cursor-pointer">
                          <div className="space-y-0.5">
                            <div className="text-xs font-semibold text-slate-200">
                              Horizontal Sharding
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Doubles read &amp; write scale capacity
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={Boolean(selectedNode.data.shardingEnabled)}
                            onChange={(e) =>
                              updateNodeBehavior(selectedNode.id, {
                                shardingEnabled: e.target.checked,
                              })
                            }
                            className="h-4 w-4 accent-emerald-400 rounded cursor-pointer"
                          />
                        </label>
                      </div>
                    )}

                    {isApiGateway && (
                      <div className="space-y-1.5 font-mono border-t border-slate-800/80 pt-3">
                        <span className="text-xs text-slate-300">
                          Rate Limit RPS:
                        </span>
                        <input
                          type="number"
                          min={500}
                          step={500}
                          value={selectedNode.data.rateLimitRps ?? 25000}
                          onChange={(e) =>
                            updateNodeBehavior(selectedNode.id, {
                              rateLimitRps: Number.parseInt(e.target.value, 10),
                            })
                          }
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 py-1.5 px-3 text-xs text-slate-100"
                        />
                      </div>
                    )}
                  </section>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center space-y-2">
                  <Layers className="mx-auto h-6 w-6 text-slate-400" />
                  <p className="font-mono text-xs font-semibold text-slate-300">
                    No Node Selected
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Click any hardware node on the canvas to inspect its live telemetry, tune instance fleet size, and configure caching or database replicas.
                  </p>
                </div>
              )
            ) : (
              <div className="space-y-4">
                <section className="space-y-2">
                  <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                    Reference Architecture
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-300">
                    {moduleDef?.referenceSolution.summary}
                  </p>
                  <div className="space-y-1.5 font-mono text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                    {moduleDef?.referenceSolution.whyItWorks.map((item) => (
                      <div key={item.slice(0, 30)} className="rounded border border-slate-800/70 bg-slate-900/40 p-2">
                        {item}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-2 border-t border-slate-800/80 pt-4">
                  <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                    Key Production Takeaways
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-400">
                    {moduleDef?.postCompletionInsights.interviewTakeaways.map((tip) => (
                      <li key={tip.slice(0, 30)} className="rounded border border-slate-800/60 bg-slate-900/30 p-2">
                        &bull; {tip}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col items-center py-6 gap-6 text-slate-400">
          <div className="[writing-mode:vertical-rl] rotate-180 font-mono text-xs tracking-wider uppercase font-semibold text-slate-300">
            Hardware Inspector
          </div>
        </div>
      )}
    </aside>
  );
}

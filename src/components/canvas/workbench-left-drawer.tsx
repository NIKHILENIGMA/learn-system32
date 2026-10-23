"use client";

import { useState } from "react";
import {
  Activity,
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  DollarSign,
  Gauge,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { cn, formatCompactRps, formatUsdMonthly } from "@/lib/utils";
import { useWorkbenchStore } from "@/store/use-workbench-store";

export function WorkbenchLeftDrawer() {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"brief" | "topology">("topology");

  const moduleDef = useWorkbenchStore((state) => state.moduleDef);
  const topologyResults = useWorkbenchStore((state) => state.topologyResults);

  if (!moduleDef) return null;

  const { conceptBrief, requirements } = moduleDef;
  const passedCount = topologyResults.filter((r) => r.passed).length;

  return (
    <aside
      className={cn(
        "relative flex h-full flex-col border-r border-slate-800/90 bg-slate-950/95 transition-all duration-300 z-20 backdrop-blur select-none",
        isOpen ? "w-80 md:w-96" : "w-12",
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -right-3.5 top-6 z-30 flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 shadow hover:border-slate-500 hover:text-white"
        title={isOpen ? "Collapse drawer" : "Expand drawer"}
      >
        {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      {isOpen ? (
        <div className="flex h-full flex-col overflow-hidden">
          <div className="flex items-center border-b border-slate-800/80 px-4 pt-3 pb-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("topology")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition",
                activeTab === "topology"
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                  : "text-slate-400 hover:text-slate-200",
              )}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Topology &amp; SLA ({passedCount}/{topologyResults.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("brief")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition",
                activeTab === "brief"
                  ? "bg-sky-500/15 text-sky-300 border border-sky-500/40"
                  : "text-slate-400 hover:text-slate-200",
              )}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Brief &amp; Specs</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
            {activeTab === "topology" ? (
              <>
                <section className="space-y-2.5">
                  <h4 className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                    <ClipboardList className="h-4 w-4 text-emerald-400" />
                    <span>Live Topology Verification</span>
                  </h4>
                  <div className="space-y-2">
                    {topologyResults.map((result) => (
                      <div
                        key={result.ruleId}
                        className={cn(
                          "rounded-lg border p-3 font-mono transition",
                          result.passed
                            ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
                            : "border-amber-500/30 bg-amber-500/5 text-amber-200",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          {result.passed ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                          ) : (
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                          )}
                          <div className="space-y-1 min-w-0">
                            <p className="font-semibold text-slate-100">
                              {result.description}
                            </p>
                            {!result.passed && result.reason && (
                              <p className="text-[11px] text-amber-300/90 leading-relaxed">
                                {result.reason}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-2.5 border-t border-slate-800/80 pt-4">
                  <h4 className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                    <Gauge className="h-4 w-4 text-sky-400" />
                    <span>Target Level SLAs</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
                      <div className="flex items-center gap-1 text-slate-400">
                        <Activity className="h-3 w-3 text-emerald-400" />
                        <span>Throughput</span>
                      </div>
                      <div className="mt-1 font-semibold text-slate-100">
                        {formatCompactRps(
                          requirements.sla.targetReadRps +
                            requirements.sla.targetWriteRps,
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {formatCompactRps(requirements.sla.targetReadRps)} R /{" "}
                        {formatCompactRps(requirements.sla.targetWriteRps)} W
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
                      <div className="flex items-center gap-1 text-slate-400">
                        <Gauge className="h-3 w-3 text-sky-400" />
                        <span>Max P95</span>
                      </div>
                      <div className="mt-1 font-semibold text-slate-100">
                        &le; {requirements.sla.maxP95LatencyMs}ms
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {requirements.sla.maxErrorRatePercent}% Drop Max
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
                      <div className="flex items-center gap-1 text-slate-400">
                        <DollarSign className="h-3 w-3 text-amber-400" />
                        <span>Monthly Budget</span>
                      </div>
                      <div className="mt-1 font-semibold text-slate-100">
                        {formatUsdMonthly(requirements.sla.maxMonthlyBudgetUsd)}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
                      <div className="flex items-center gap-1 text-slate-400">
                        <Layers className="h-3 w-3 text-rose-400" />
                        <span>Failover Check</span>
                      </div>
                      <div className="mt-1 font-semibold text-slate-100">
                        {requirements.sla.requireSingleNodeFailover
                          ? "N-1 Compute"
                          : "None"}
                      </div>
                    </div>
                  </div>
                </section>
              </>
            ) : (
              <>
                <section className="space-y-2">
                  <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                    Problem Context
                  </h4>
                  <p className="leading-relaxed text-slate-300">
                    {conceptBrief.problemStatement}
                  </p>
                </section>

                <section className="space-y-2 border-t border-slate-800/80 pt-4">
                  <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                    Back-of-the-Envelope
                  </h4>
                  <ul className="space-y-1.5 font-mono text-[11px] text-slate-400">
                    <li>&bull; Read Traffic: {formatCompactRps(conceptBrief.backOfEnvelope.readRps)}</li>
                    <li>&bull; Write Traffic: {formatCompactRps(conceptBrief.backOfEnvelope.writeRps)}</li>
                    <li>&bull; Avg Payload: {conceptBrief.backOfEnvelope.averagePayloadBytes} bytes</li>
                    {conceptBrief.backOfEnvelope.dailyStorageGrowthGb && (
                      <li>&bull; Daily Storage Growth: ~{conceptBrief.backOfEnvelope.dailyStorageGrowthGb} GB/day</li>
                    )}
                  </ul>
                </section>

                <section className="space-y-2 border-t border-slate-800/80 pt-4">
                  <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                    Mental Models
                  </h4>
                  <div className="space-y-2 text-slate-400">
                    {conceptBrief.mentalModels.map((model) => (
                      <div
                        key={model.slice(0, 30)}
                        className="rounded-lg border border-slate-800 bg-slate-900/40 p-2.5 text-[11px] leading-relaxed"
                      >
                        {model}
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col items-center py-6 gap-6 text-slate-400">
          <div className="[writing-mode:vertical-rl] rotate-180 font-mono text-xs tracking-wider uppercase font-semibold text-slate-300">
            Requirements &amp; Topology ({passedCount}/{topologyResults.length})
          </div>
        </div>
      )}
    </aside>
  );
}

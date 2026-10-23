"use client";

import { memo } from "react";
import {
  Activity,
  DollarSign,
  Gauge,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  StepForward,
} from "lucide-react";
import type { TrafficMultiplier } from "@/engine/types";
import { cn, formatCompactRps, formatUsdMonthly } from "@/lib/utils";
import { useWorkbenchStore } from "@/store/use-workbench-store";

function SimControlBarComponent() {
  const isPlaying = useWorkbenchStore((state) => state.isPlaying);
  const setIsPlaying = useWorkbenchStore((state) => state.setIsPlaying);
  const stepSimulation = useWorkbenchStore((state) => state.stepSimulation);
  const trafficMultiplier = useWorkbenchStore((state) => state.trafficMultiplier);
  const setTrafficMultiplier = useWorkbenchStore((state) => state.setTrafficMultiplier);
  const autoLayoutGraph = useWorkbenchStore((state) => state.autoLayoutGraph);
  const resetGraph = useWorkbenchStore((state) => state.resetGraph);

  const currentTick = useWorkbenchStore((state) => state.currentTick);
  const latestTickResult = useWorkbenchStore((state) => state.latestTickResult);
  const isSaving = useWorkbenchStore((state) => state.isSaving);
  const lastSavedAt = useWorkbenchStore((state) => state.lastSavedAt);

  const multipliers: TrafficMultiplier[] = [1, 5, 10];

  const totalInjectedRps =
    (latestTickResult?.overallReadRps ?? 0) +
    (latestTickResult?.overallWriteRps ?? 0);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800/90 bg-slate-950/90 px-4 py-2.5 shadow-2xl backdrop-blur">
      <div className="flex items-center gap-1.5 border-r border-slate-800 pr-3">
        <button
          type="button"
          onClick={() => setIsPlaying(!isPlaying)}
          className={cn(
            "flex h-9 items-center gap-2 rounded-xl px-3.5 font-mono text-xs font-semibold shadow transition",
            isPlaying
              ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
              : "bg-emerald-500 text-slate-950 hover:bg-emerald-400",
          )}
        >
          {isPlaying ? (
            <>
              <Pause className="h-4 w-4 fill-current" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4 fill-current" />
              <span>Simulate</span>
            </>
          )}
        </button>

        <button
          type="button"
          disabled={isPlaying}
          onClick={stepSimulation}
          className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 font-mono text-xs text-slate-200 transition hover:bg-slate-800 disabled:opacity-40"
          title="Step forward 1 tick"
        >
          <StepForward className="h-3.5 w-3.5" />
          <span>Step</span>
        </button>
      </div>

      <div className="flex items-center gap-1 border-r border-slate-800 pr-3 font-mono text-xs">
        <span className="text-[10px] uppercase text-slate-400 mr-1">Load:</span>
        {multipliers.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setTrafficMultiplier(m)}
            className={cn(
              "rounded-lg px-2.5 py-1 transition font-semibold",
              trafficMultiplier === m
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                : "text-slate-400 hover:text-slate-200",
            )}
          >
            {m}x
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 font-mono text-xs border-r border-slate-800 pr-3">
        <div className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-sky-400" />
          <span className="text-slate-400">RPS:</span>
          <span className="font-semibold text-slate-100">
            {formatCompactRps(totalInjectedRps)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Gauge className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-slate-400">P95:</span>
          <span className="font-semibold text-slate-100">
            {latestTickResult?.overallP95LatencyMs ?? 0}ms
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <DollarSign className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-slate-400">Cost:</span>
          <span className="font-semibold text-slate-100">
            {formatUsdMonthly(latestTickResult?.estimatedMonthlyCostUsd ?? 0)}
          </span>
        </div>

        <div className="rounded border border-slate-800 bg-slate-900/80 px-2 py-0.5 text-[10px] text-slate-400">
          Tick #{currentTick}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={autoLayoutGraph}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 font-mono text-xs text-slate-300 transition hover:border-slate-700 hover:text-slate-100"
          title="Auto-layout nodes with Dagre"
        >
          <Sparkles className="h-3.5 w-3.5 text-sky-400" />
          <span>Auto-Layout</span>
        </button>

        <button
          type="button"
          onClick={() => void resetGraph()}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 font-mono text-xs text-slate-400 transition hover:border-rose-500/40 hover:text-rose-300"
          title="Reset canvas to starter graph"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Reset</span>
        </button>
      </div>

      <div className="hidden lg:block pl-2 font-mono text-[10px] text-slate-400">
        {isSaving ? (
          <span className="text-amber-400">Saving draft...</span>
        ) : lastSavedAt ? (
          <span>Draft saved: {lastSavedAt}</span>
        ) : null}
      </div>
    </div>
  );
}

export const SimControlBar = memo(SimControlBarComponent);

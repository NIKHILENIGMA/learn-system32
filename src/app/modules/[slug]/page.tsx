"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  DollarSign,
  PlayCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { WorkbenchCanvas } from "@/components/canvas/workbench-canvas";
import { WorkbenchLeftDrawer } from "@/components/canvas/workbench-left-drawer";
import { WorkbenchRightDrawer } from "@/components/canvas/workbench-right-drawer";
import { cn, formatUsdMonthly } from "@/lib/utils";
import { getModuleBySlug } from "@/modules";
import { useWorkbenchStore } from "@/store/use-workbench-store";

export interface WorkbenchPageProps {
  params: Promise<{ slug: string }>;
}

export default function WorkbenchPage({ params }: WorkbenchPageProps) {
  const { slug } = use(params);
  const moduleDef = getModuleBySlug(slug);

  if (!moduleDef) {
    notFound();
  }

  const initWorkbench = useWorkbenchStore((state) => state.initWorkbench);
  const topologyResults = useWorkbenchStore((state) => state.topologyResults);
  const latestTickResult = useWorkbenchStore((state) => state.latestTickResult);
  const isSaving = useWorkbenchStore((state) => state.isSaving);
  const lastSavedAt = useWorkbenchStore((state) => state.lastSavedAt);

  useEffect(() => {
    initWorkbench(moduleDef);
  }, [moduleDef, initWorkbench]);

  const passedRulesCount = topologyResults.filter((r) => r.passed).length;
  const allRulesPassed =
    topologyResults.length > 0 && passedRulesCount === topologyResults.length;

  const currentCost = latestTickResult?.estimatedMonthlyCostUsd ?? 0;
  const budgetCap = moduleDef.requirements.sla.maxMonthlyBudgetUsd;
  const isOverBudget = currentCost > budgetCap;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-slate-100 select-none">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800/90 bg-slate-950/95 px-4 backdrop-blur z-30">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 transition hover:border-slate-700 hover:text-white"
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="flex items-center gap-2 truncate">
            <span className="rounded border border-slate-700/80 bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-300">
              #{moduleDef.metadata.order.toString().padStart(2, "0")}
            </span>
            <h1 className="truncate font-mono text-xs md:text-sm font-bold text-slate-100">
              {moduleDef.metadata.title}
            </h1>
            <span className="hidden sm:inline-block rounded-full border border-slate-800 bg-slate-900/80 px-2 py-0.5 font-mono text-[10px] text-slate-400">
              {moduleDef.metadata.tier.replace("tier-", "Tier ")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div
            className={cn(
              "hidden md:flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px]",
              allRulesPassed
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-amber-500/40 bg-amber-500/10 text-amber-300",
            )}
          >
            {allRulesPassed ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
            )}
            <span>
              Topology: {passedRulesCount}/{topologyResults.length}
            </span>
          </div>

          <div
            className={cn(
              "hidden sm:flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px]",
              isOverBudget
                ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                : "border-slate-800 bg-slate-900/60 text-slate-300",
            )}
          >
            <DollarSign className="h-3.5 w-3.5 text-amber-400" />
            <span>
              {formatUsdMonthly(currentCost)} / {formatUsdMonthly(budgetCap)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              alert(
                "SLA & Topology Grader will evaluate this design in Task 005!",
              );
            }}
            className="flex h-9 items-center gap-2 rounded-xl bg-emerald-500 px-3.5 font-mono text-xs font-semibold text-slate-950 shadow transition hover:bg-emerald-400"
          >
            <PlayCircle className="h-4 w-4" />
            <span>Evaluate Design</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <WorkbenchLeftDrawer />
        <main className="flex-1 h-full w-full relative overflow-hidden">
          <WorkbenchCanvas />
        </main>
        <WorkbenchRightDrawer />
      </div>
    </div>
  );
}

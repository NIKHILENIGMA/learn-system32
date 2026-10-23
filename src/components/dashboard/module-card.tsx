import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
  Gauge,
  LockOpen,
  PlayCircle,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import type { ModuleDifficulty } from "@/engine/types";
import { cn, formatCompactRps, formatUsdMonthly } from "@/lib/utils";
import type {
  ModuleCardSummaryDto,
  ModuleProgressStatus,
} from "@/modules/dto";

const DIFFICULTY_STYLES: Readonly<Record<ModuleDifficulty, string>> = {
  Beginner:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  Intermediate:
    "border-amber-500/30 bg-amber-500/10 text-amber-300",
  Advanced:
    "border-rose-500/30 bg-rose-500/10 text-rose-300",
};

const STATUS_CONFIG: Readonly<
  Record<
    ModuleProgressStatus,
    { label: string; badgeClass: string; borderClass: string }
  >
> = {
  not_started: {
    label: "Not Started",
    badgeClass: "border-slate-700 bg-slate-900 text-slate-400",
    borderClass: "border-slate-800/90 hover:border-slate-700",
  },
  in_progress: {
    label: "In Progress",
    badgeClass: "border-sky-500/40 bg-sky-500/10 text-sky-300",
    borderClass: "border-sky-500/30 hover:border-sky-500/50",
  },
  completed: {
    label: "SLA Passed",
    badgeClass: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
    borderClass: "border-emerald-500/35 hover:border-emerald-500/60",
  },
};

export interface ModuleCardProps {
  moduleItem: ModuleCardSummaryDto;
}

export function ModuleCard({ moduleItem }: ModuleCardProps) {
  const { metadata, problemStatement, sla, topologyRuleCount, progress } =
    moduleItem;
  const statusMeta = STATUS_CONFIG[progress.status];
  const totalTargetRps = sla.targetReadRps + sla.targetWriteRps;

  return (
    <article
      className={cn(
        "group relative flex flex-col justify-between rounded-xl border bg-slate-900/65 p-5 shadow-lg transition-all duration-200 hover:bg-slate-900/90",
        statusMeta.borderClass,
      )}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded border border-slate-700/80 bg-slate-950 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-300">
              #{metadata.order.toString().padStart(2, "0")}
            </span>
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium",
                DIFFICULTY_STYLES[metadata.difficulty],
              )}
            >
              {metadata.difficulty}
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-400">
              <Clock className="h-3 w-3" />
              {metadata.estimatedMinutes}m
            </span>
          </div>

          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium",
              statusMeta.badgeClass,
            )}
          >
            {progress.status === "completed" ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            ) : progress.status === "in_progress" ? (
              <PlayCircle className="h-3 w-3 text-sky-400" />
            ) : (
              <LockOpen className="h-3 w-3 text-slate-400" />
            )}
            {statusMeta.label}
          </span>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-semibold tracking-tight text-slate-100 group-hover:text-emerald-300 transition-colors">
            {metadata.title}
          </h3>
          <p className="text-xs font-medium text-slate-300">
            {metadata.subtitle}
          </p>
          <p className="line-clamp-3 text-xs leading-relaxed text-slate-400 pt-1">
            {problemStatement}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {metadata.tags.map((tag) => (
            <span
              key={tag}
              className="rounded border border-slate-800 bg-slate-950/80 px-2 py-0.5 font-mono text-[10px] text-slate-400"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-4 border-t border-slate-800/80 pt-4">
        <div>
          <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-slate-400">
            <span>Target SLA Envelope</span>
            <span>{topologyRuleCount} Topology Rules</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 font-mono text-xs">
            <div className="rounded-lg border border-slate-800/90 bg-slate-950/70 px-2.5 py-2">
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Activity className="h-3 w-3 text-emerald-400" />
                <span>Throughput</span>
              </div>
              <div className="mt-0.5 font-semibold text-slate-100">
                {formatCompactRps(totalTargetRps)}
              </div>
              <div className="text-[10px] text-slate-400">
                {formatCompactRps(sla.targetReadRps)} R /{" "}
                {formatCompactRps(sla.targetWriteRps)} W
              </div>
            </div>

            <div className="rounded-lg border border-slate-800/90 bg-slate-950/70 px-2.5 py-2">
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Gauge className="h-3 w-3 text-sky-400" />
                <span>Max P95</span>
              </div>
              <div className="mt-0.5 font-semibold text-slate-100">
                &le; {sla.maxP95LatencyMs}ms
              </div>
              <div className="text-[10px] text-slate-400">
                {sla.maxErrorRatePercent}% Drop Max
              </div>
            </div>

            <div className="rounded-lg border border-slate-800/90 bg-slate-950/70 px-2.5 py-2">
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <DollarSign className="h-3 w-3 text-amber-400" />
                <span>Budget Cap</span>
              </div>
              <div className="mt-0.5 font-semibold text-slate-100">
                {formatUsdMonthly(sla.maxMonthlyBudgetUsd)}
              </div>
              <div className="text-[10px] text-slate-400">Monthly Infra</div>
            </div>

            <div className="rounded-lg border border-slate-800/90 bg-slate-950/70 px-2.5 py-2">
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <ShieldAlert className="h-3 w-3 text-rose-400" />
                <span>Chaos Check</span>
              </div>
              <div className="mt-0.5 font-semibold text-slate-100">
                {sla.requireSingleNodeFailover ? "N-1 Failover" : "Standard"}
              </div>
              <div className="text-[10px] text-slate-400">Single-Node Kill</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-slate-800/70 bg-slate-950/50 px-3.5 py-2.5">
          <div className="flex items-center gap-4 font-mono text-xs">
            <div>
              <span className="text-[10px] uppercase text-slate-400 block">
                Best SLA Score
              </span>
              <span
                className={cn(
                  "font-semibold",
                  progress.bestScorePercent >= 100
                    ? "text-emerald-400"
                    : progress.bestScorePercent > 0
                      ? "text-amber-400"
                      : "text-slate-400",
                )}
              >
                {progress.bestScorePercent > 0
                  ? `${progress.bestScorePercent}%`
                  : "No runs yet"}
              </span>
            </div>

            {progress.bestP95LatencyMs !== null && (
              <div className="border-l border-slate-800 pl-3">
                <span className="text-[10px] uppercase text-slate-400 block">
                  Best P95
                </span>
                <span className="font-semibold text-sky-300">
                  {progress.bestP95LatencyMs}ms
                </span>
              </div>
            )}

            {progress.lowestMonthlyCostUsd !== null && (
              <div className="border-l border-slate-800 pl-3">
                <span className="text-[10px] uppercase text-slate-400 block">
                  Lowest Cost
                </span>
                <span className="font-semibold text-amber-300">
                  {formatUsdMonthly(progress.lowestMonthlyCostUsd)}
                </span>
              </div>
            )}

            {progress.insightsUnlocked && (
              <div className="border-l border-slate-800 pl-3 inline-flex items-center gap-1 text-emerald-400">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="text-[11px]">Insights Unlocked</span>
              </div>
            )}
          </div>

          <Link
            href={`/modules/${metadata.slug}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 font-mono text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-emerald-400"
          >
            <span>
              {progress.status === "completed"
                ? "Review Workbench"
                : progress.status === "in_progress"
                  ? "Resume Design"
                  : "Launch Workbench"}
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Database,
  Filter,
  Layers,
  RotateCcw,
  Search,
  Sparkles,
  Terminal,
  Trophy,
} from "lucide-react";
import type { ModuleTier } from "@/engine/types";
import { cn } from "@/lib/utils";
import { ORDERED_TIERS, TIER_METADATA } from "@/modules";
import type {
  ModuleCardSummaryDto,
  ModuleListMetaDto,
  ModuleProgressStatus,
} from "@/modules/dto";
import { ModuleCard } from "./module-card";

type TierFilterOption = "all" | ModuleTier;
type StatusFilterOption = "all" | ModuleProgressStatus;

const TIER_FILTER_OPTIONS: ReadonlyArray<{
  value: TierFilterOption;
  label: string;
}> = [
  { value: "all", label: "All Tiers" },
  { value: "tier-1-foundations", label: "Tier 1: Foundations" },
  { value: "tier-2-async", label: "Tier 2: Async & Queues" },
  { value: "tier-3-distributed", label: "Tier 3: Distributed Labs" },
];

const STATUS_FILTER_OPTIONS: ReadonlyArray<{
  value: StatusFilterOption;
  label: string;
}> = [
  { value: "all", label: "All Statuses" },
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

export interface SkillTreeExplorerProps {
  initialModules: ModuleCardSummaryDto[];
  meta: ModuleListMetaDto;
}

export function SkillTreeExplorer({
  initialModules,
  meta,
}: SkillTreeExplorerProps) {
  const [selectedTier, setSelectedTier] = useState<TierFilterOption>("all");
  const [selectedStatus, setSelectedStatus] =
    useState<StatusFilterOption>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredModules = useMemo(() => {
    const trimmedSearch = searchQuery.trim().toLowerCase();
    return initialModules.filter((item) => {
      if (selectedTier !== "all" && item.metadata.tier !== selectedTier) {
        return false;
      }
      if (selectedStatus !== "all" && item.progress.status !== selectedStatus) {
        return false;
      }
      if (trimmedSearch.length > 0) {
        const matchesTitle = item.metadata.title
          .toLowerCase()
          .includes(trimmedSearch);
        const matchesSubtitle = item.metadata.subtitle
          .toLowerCase()
          .includes(trimmedSearch);
        const matchesTags = item.metadata.tags.some((tag) =>
          tag.toLowerCase().includes(trimmedSearch),
        );
        if (!matchesTitle && !matchesSubtitle && !matchesTags) {
          return false;
        }
      }
      return true;
    });
  }, [initialModules, selectedTier, selectedStatus, searchQuery]);

  const visibleTiers = useMemo(() => {
    return ORDERED_TIERS.filter((tier) =>
      selectedTier === "all" ? true : tier === selectedTier,
    );
  }, [selectedTier]);

  const hasActiveFilters =
    selectedTier !== "all" ||
    selectedStatus !== "all" ||
    searchQuery.trim().length > 0;

  function handleResetFilters(): void {
    setSelectedTier("all");
    setSelectedStatus("all");
    setSearchQuery("");
  }

  return (
    <div className="min-h-screen bg-engineering-grid text-slate-100 flex flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-base font-bold tracking-tight text-slate-100">
                  learn-system32
                </span>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-emerald-400">
                  SKILL-TREE WORKBENCH
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Interactive System Design, Queueing Latency &amp; SLA Stress Simulator
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1.5">
              <Layers className="h-3.5 w-3.5 text-sky-400" />
              <span className="text-slate-400">Modules:</span>
              <span className="font-semibold text-slate-100">
                {meta.totalModules}
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-slate-400">Completed:</span>
              <span className="font-semibold text-emerald-400">
                {meta.completedCount}/{meta.totalModules}
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1.5">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-slate-400">Avg SLA Score:</span>
              <span className="font-semibold text-amber-300">
                {meta.averageBestScore}%
              </span>
            </div>

            <div
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5",
                meta.dbConnected
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-300",
              )}
              title={
                meta.dbConnected
                  ? "Connected to PostgreSQL"
                  : "PostgreSQL offline — using local in-memory defaults"
              }
            >
              <Database className="h-3.5 w-3.5" />
              <span>
                {meta.dbConnected ? "PostgreSQL Synced" : "Local Memory Mode"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8 space-y-8">
        <section className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-6 shadow-xl space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-emerald-400">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Self-Paced Architecture Challenges</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-100">
                System Design Progressive Skill Tree
              </h1>
              <p className="max-w-3xl text-sm text-slate-400">
                Select any challenge below to open the interactive React Flow workbench, scale hardware instances, simulate 1x/5x/10x RPS spikes, and run the 10-tick SLA grader to unlock production deep-dive insights.
              </p>
            </div>

            <div className="relative w-full lg:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search modules or tags (e.g. Redis, CDN)..."
                aria-label="Search modules or tags"
                className="w-full rounded-lg border border-slate-800 bg-slate-950/90 py-2 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-400 focus:border-emerald-500/60 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-800/80 pt-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 inline-flex items-center gap-1 font-mono text-[11px] text-slate-400">
                <Filter className="h-3 w-3" />
                Tier:
              </span>
              {TIER_FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedTier(option.value)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 font-mono text-xs transition",
                    selectedTier === option.value
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 font-semibold"
                      : "border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-700 hover:text-slate-200",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 font-mono text-[11px] text-slate-400">
                Status:
              </span>
              {STATUS_FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedStatus(option.value)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 font-mono text-xs transition",
                    selectedStatus === option.value
                      ? "border-sky-500/50 bg-sky-500/15 text-sky-300 font-semibold"
                      : "border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-700 hover:text-slate-200",
                  )}
                >
                  {option.label}
                </button>
              ))}

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="ml-1 inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 font-mono text-xs text-slate-300 hover:bg-slate-800"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {filteredModules.length === 0 ? (
          <section className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center space-y-4">
            <p className="text-base font-semibold text-slate-200">
              No learning modules match your active filters
            </p>
            <p className="mx-auto max-w-md text-xs text-slate-400">
              Try clearing your search query or switching the Tier and Status filter pills back to &ldquo;All&rdquo;.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 font-mono text-xs font-semibold text-slate-950 hover:bg-emerald-400"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset All Filters</span>
            </button>
          </section>
        ) : (
          <div className="space-y-10">
            {visibleTiers.map((tierKey) => {
              const tierInfo = TIER_METADATA[tierKey];
              const tierModules = filteredModules.filter(
                (item) => item.metadata.tier === tierKey,
              );

              return (
                <section key={tierKey} className="space-y-4">
                  <div className="flex flex-col gap-1 border-b border-slate-800/80 pb-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-400">
                          TIER {tierInfo.stepNumber}
                        </span>
                        <h2 className="text-lg font-semibold text-slate-100">
                          {tierInfo.title}
                        </h2>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {tierInfo.subtitle}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-slate-400">
                      {tierModules.length} Module
                      {tierModules.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {tierModules.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-800/70 bg-slate-900/25 p-6 flex items-center justify-between">
                      <p className="text-xs text-slate-400">
                        No modules registered in {tierInfo.title} matching current filters yet. Ask{" "}
                        <code className="font-mono text-slate-200">agy</code>{" "}
                        to generate a new module in{" "}
                        <code className="font-mono text-slate-200">
                          src/modules/&lt;slug&gt;/
                        </code>{" "}
                        anytime!
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-6 lg:grid-cols-2">
                      {tierModules.map((moduleItem) => (
                        <ModuleCard
                          key={moduleItem.metadata.slug}
                          moduleItem={moduleItem}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

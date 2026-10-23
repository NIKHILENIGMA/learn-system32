import {
  Activity,
  Cpu,
  Database,
  HardDrive,
  Layers,
  Network,
  Server,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { DEFAULT_NODE_SPECS, NODE_CATEGORIES } from "@/engine/types";
import { formatCompactRps, formatUsdMonthly } from "@/lib/utils";
import { getAllModules } from "@/modules";

export default function FoundationHomePage() {
  const modules = getAllModules();
  const hardwareCatalog = NODE_CATEGORIES.map(
    (category) => DEFAULT_NODE_SPECS[category],
  );

  return (
    <div className="min-h-screen bg-engineering-grid text-slate-100 flex flex-col">
      <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold tracking-tight text-slate-100">
                  learn-system32
                </span>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-400">
                  CORE FOUNDATION READY
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Interactive System Design &amp; Directed-Graph Load Simulator
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 font-mono text-xs text-slate-400">
            <div className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900/70 px-3 py-1.5">
              <Cpu className="h-3.5 w-3.5 text-emerald-400" />
              <span>{hardwareCatalog.length} Hardware Presets</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900/70 px-3 py-1.5">
              <Layers className="h-3.5 w-3.5 text-sky-400" />
              <span>{modules.length} Registered Modules</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 space-y-10">
        <section className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-6 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
                <span>Task 001 Foundation Baseline</span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
                Simulation Engine Contracts &amp; Persistence Layer Initialized
              </h1>
              <p className="max-w-3xl text-sm text-slate-400">
                Core engine types (<code className="font-mono text-slate-200">src/engine/types.ts</code>),
                PostgreSQL + Drizzle ORM schema (<code className="font-mono text-slate-200">module_progress</code>,{" "}
                <code className="font-mono text-slate-200">canvas_attempts</code>,{" "}
                <code className="font-mono text-slate-200">assessment_runs</code>), and
                all 10 infrastructure hardware presets are active. Next up:{" "}
                <span className="text-slate-200 font-medium">
                  Task 002 — Auto-Discovered Module Registry &amp; Skill-Tree Dashboard
                </span>
                .
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 font-mono text-xs">
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 px-4 py-3">
                <div className="text-slate-400">Engine Isolation</div>
                <div className="mt-1 text-sm font-semibold text-emerald-400">
                  Pure TS
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 px-4 py-3">
                <div className="text-slate-400">DB Tables</div>
                <div className="mt-1 text-sm font-semibold text-sky-400">
                  3 Drizzle Tables
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 px-4 py-3">
                <div className="text-slate-400">Node Types</div>
                <div className="mt-1 text-sm font-semibold text-amber-400">
                  10 Categories
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <Server className="h-4 w-4 text-emerald-400" />
                <span>Baseline Infrastructure Hardware Catalog (`DEFAULT_NODE_SPECS`)</span>
              </h2>
              <p className="text-xs text-slate-400">
                Deterministic capacity, base latency, and monthly cost per instance used by the tick simulator and canvas nodes.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {hardwareCatalog.map((item) => (
              <div
                key={item.type}
                className="flex flex-col justify-between rounded-xl border border-slate-800/80 bg-slate-900/50 p-4 transition hover:border-slate-700"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="rounded border border-slate-700/80 bg-slate-950 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                      {item.type}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                      {item.categoryGroup}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    {item.defaultLabel}
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-400">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-800/80 pt-3 font-mono text-[11px]">
                  <div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <Activity className="h-3 w-3 text-emerald-400" />
                      <span>Max RPS</span>
                    </div>
                    <div className="mt-0.5 font-semibold text-slate-200">
                      {formatCompactRps(item.defaultSpec.maxRpsPerInstance)}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <Network className="h-3 w-3 text-sky-400" />
                      <span>Base P95</span>
                    </div>
                    <div className="mt-0.5 font-semibold text-slate-200">
                      {item.defaultSpec.baseLatencyMs}ms
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <Database className="h-3 w-3 text-amber-400" />
                      <span>Cost</span>
                    </div>
                    <div className="mt-0.5 font-semibold text-slate-200">
                      {formatUsdMonthly(item.defaultSpec.monthlyCostPerInstance)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HardDrive className="h-5 w-5 text-slate-400" />
            <div>
              <h3 className="text-sm font-medium text-slate-200">
                Declarative Module Registry (`src/modules/&lt;slug&gt;/`)
              </h3>
              <p className="text-xs text-slate-400">
                {modules.length === 0
                  ? "Ready for Task 002: Auto-Discovered Module Registry & Skill-Tree Dashboard."
                  : `${modules.length} learning module(s) discovered.`}
              </p>
            </div>
          </div>
          <span className="font-mono text-xs text-slate-400">
            Status: Foundation Verified
          </span>
        </section>
      </main>
    </div>
  );
}

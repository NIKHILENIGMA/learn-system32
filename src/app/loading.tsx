export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-engineering-grid text-slate-100 flex flex-col">
      <header className="border-b border-slate-800/80 bg-slate-950/90 px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="h-9 w-56 animate-pulse rounded-lg bg-slate-900" />
          <div className="flex gap-3">
            <div className="h-8 w-28 animate-pulse rounded-lg bg-slate-900" />
            <div className="h-8 w-28 animate-pulse rounded-lg bg-slate-900" />
            <div className="h-8 w-32 animate-pulse rounded-lg bg-slate-900" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8 space-y-8">
        <div className="h-44 w-full animate-pulse rounded-xl border border-slate-800 bg-slate-900/50" />

        <div className="space-y-4">
          <div className="h-7 w-72 animate-pulse rounded bg-slate-900" />
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-72 animate-pulse rounded-xl border border-slate-800 bg-slate-900/50" />
            <div className="h-72 animate-pulse rounded-xl border border-slate-800 bg-slate-900/50" />
          </div>
        </div>
      </main>
    </div>
  );
}

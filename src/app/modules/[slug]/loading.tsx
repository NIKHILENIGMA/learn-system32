export default function WorkbenchLoading() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      <header className="h-14 border-b border-slate-800 bg-slate-950/90 px-6 flex items-center justify-between">
        <div className="h-6 w-64 animate-pulse rounded bg-slate-900" />
        <div className="flex gap-3">
          <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-900" />
          <div className="h-8 w-32 animate-pulse rounded-lg bg-slate-900" />
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 border-r border-slate-800 bg-slate-950/90 p-4">
          <div className="h-full w-full animate-pulse rounded-xl bg-slate-900/50" />
        </aside>
        <main className="flex-1 bg-engineering-grid p-6">
          <div className="h-full w-full animate-pulse rounded-2xl border border-slate-800/80 bg-slate-900/30" />
        </main>
        <aside className="w-80 border-l border-slate-800 bg-slate-950/90 p-4">
          <div className="h-full w-full animate-pulse rounded-xl bg-slate-900/50" />
        </aside>
      </div>
    </div>
  );
}

"use client";

import { memo } from "react";
import {
  Cpu,
  Database,
  Globe,
  HardDrive,
  Layers,
  MessageSquare,
  Network,
  Plus,
  Server,
  Zap,
} from "lucide-react";
import {
  DEFAULT_NODE_SPECS,
  NODE_CATEGORIES,
  type NodeCategory,
} from "@/engine/types";
import { useWorkbenchStore } from "@/store/use-workbench-store";

const PALETTE_ICONS: Readonly<Record<NodeCategory, typeof Server>> = {
  client: Globe,
  cdn: Zap,
  api_gateway: Network,
  load_balancer: Layers,
  api_server: Server,
  worker: Cpu,
  redis_cache: HardDrive,
  message_queue: MessageSquare,
  postgres_db: Database,
  nosql_db: Database,
};

function NodePaletteComponent() {
  const moduleDef = useWorkbenchStore((state) => state.moduleDef);
  const addNode = useWorkbenchStore((state) => state.addNode);

  const allowedTypes =
    moduleDef?.starterGraph.allowedNodeTypes ?? NODE_CATEGORIES;

  return (
    <div className="absolute left-4 top-4 z-10 flex flex-col gap-2 rounded-xl border border-slate-800/90 bg-slate-950/85 p-2.5 shadow-2xl backdrop-blur max-w-[200px]">
      <div className="flex items-center justify-between px-1.5 py-0.5">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Hardware Palette
        </span>
        <span className="font-mono text-[10px] text-slate-400">
          {allowedTypes.length}
        </span>
      </div>

      <div className="flex flex-col gap-1 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
        {allowedTypes.map((type) => {
          const Icon = PALETTE_ICONS[type] ?? Server;
          const spec = DEFAULT_NODE_SPECS[type];

          return (
            <button
              key={type}
              type="button"
              onClick={() => addNode(type)}
              className="group flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/60 px-2.5 py-1.5 text-left font-mono text-xs text-slate-200 transition hover:border-emerald-500/50 hover:bg-slate-900 hover:text-emerald-300"
              title={spec.description}
            >
              <div className="flex items-center gap-2 truncate">
                <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-emerald-400" />
                <span className="truncate">{spec.defaultLabel}</span>
              </div>
              <Plus className="h-3 w-3 shrink-0 text-slate-400 group-hover:text-emerald-400" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const NodePalette = memo(NodePaletteComponent);

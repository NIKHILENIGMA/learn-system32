import { memo } from "react";
import {
  Handle,
  Position,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import {
  Activity,
  AlertTriangle,
  Cpu,
  Database,
  Globe,
  HardDrive,
  Layers,
  MessageSquare,
  Network,
  Server,
  Zap,
} from "lucide-react";
import type { NodeCategory, NodeConfig } from "@/engine/types";
import { cn, formatCompactRps } from "@/lib/utils";
import { useWorkbenchStore } from "@/store/use-workbench-store";

export type HardwareNodeData = NodeConfig & Record<string, unknown>;
export type HardwareNodeType = Node<HardwareNodeData, "hardware">;

const CATEGORY_ICONS: Readonly<Record<NodeCategory, typeof Server>> = {
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

function HardwareNodeComponent({ id, data, selected }: NodeProps<HardwareNodeType>) {
  const telemetry = useWorkbenchStore((state) => state.nodeTelemetry[id]);
  const selectNode = useWorkbenchStore((state) => state.selectNode);

  const Icon = CATEGORY_ICONS[data.type] ?? Server;
  const status = telemetry?.status ?? "HEALTHY";
  const utilization = telemetry?.effectiveUtilization ?? 0;
  const instances = data.spec.instances;

  const totalIncomingRps =
    (telemetry?.incomingReadRps ?? 0) + (telemetry?.incomingWriteRps ?? 0);

  const statusStyles = {
    HEALTHY: {
      border: "border-slate-800 hover:border-slate-700",
      selectedBorder: "border-emerald-500 ring-2 ring-emerald-500/30",
      badge: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
      bar: "bg-emerald-500",
    },
    DEGRADED: {
      border: "border-amber-500/40 hover:border-amber-500/60",
      selectedBorder: "border-amber-400 ring-2 ring-amber-400/30",
      badge: "border-amber-500/40 bg-amber-500/15 text-amber-300",
      bar: "bg-amber-400",
    },
    OVERLOADED: {
      border: "border-rose-500/60 animate-pulse",
      selectedBorder: "border-rose-500 ring-2 ring-rose-500/40",
      badge: "border-rose-500/40 bg-rose-500/20 text-rose-300",
      bar: "bg-rose-500",
    },
    CRASHED: {
      border: "border-rose-600 bg-rose-950/40",
      selectedBorder: "border-rose-600 ring-4 ring-rose-600/50",
      badge: "border-rose-600 bg-rose-600 text-white font-bold",
      bar: "bg-rose-600",
    },
  }[status];

  return (
    <div
      onClick={() => selectNode(id)}
      className={cn(
        "relative w-64 rounded-xl border bg-slate-950/90 p-3 shadow-xl backdrop-blur transition-all",
        selected ? statusStyles.selectedBorder : statusStyles.border,
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !rounded-full !border-2 !border-slate-900 !bg-slate-400 hover:!bg-emerald-400"
      />

      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h4 className="truncate font-mono text-xs font-semibold text-slate-100">
                {data.label}
              </h4>
              <p className="truncate font-mono text-[10px] text-slate-400">
                {data.type}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {instances > 1 && (
              <span className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.2 font-mono text-[10px] font-medium text-slate-300">
                x{instances}
              </span>
            )}
            <span
              className={cn(
                "rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider font-semibold border",
                statusStyles.badge,
              )}
            >
              {status}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
            <span>Utilization</span>
            <span className="font-semibold text-slate-200">
              {Math.round(utilization * 100)}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-900">
            <div
              className={cn("h-full transition-all duration-300", statusStyles.bar)}
              style={{ width: `${Math.min(100, Math.round(utilization * 100))}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-slate-800/80 pt-2 font-mono text-[10px]">
          <div>
            <div className="flex items-center gap-1 text-slate-400">
              <Activity className="h-3 w-3 text-sky-400" />
              <span>In Load</span>
            </div>
            <div className="font-semibold text-slate-200">
              {formatCompactRps(totalIncomingRps)}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1 text-slate-400">
              <Zap className="h-3 w-3 text-amber-400" />
              <span>P95 Latency</span>
            </div>
            <div className="font-semibold text-slate-200">
              {telemetry?.p95LatencyMs ?? data.spec.baseLatencyMs}ms
            </div>
          </div>
        </div>

        {telemetry?.droppedRps && telemetry.droppedRps > 0 ? (
          <div className="flex items-center gap-1 rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1 font-mono text-[10px] text-rose-300">
            <AlertTriangle className="h-3 w-3 shrink-0 text-rose-400" />
            <span className="truncate">
              Dropping {formatCompactRps(telemetry.droppedRps)}
            </span>
          </div>
        ) : null}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !rounded-full !border-2 !border-slate-900 !bg-slate-400 hover:!bg-emerald-400"
      />
    </div>
  );
}

export const HardwareNode = memo(HardwareNodeComponent);

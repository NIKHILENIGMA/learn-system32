import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { formatCompactRps } from "@/lib/utils";
import { useWorkbenchStore } from "@/store/use-workbench-store";

function AnimatedTrafficEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) {
  const telemetry = useWorkbenchStore((state) => state.edgeTelemetry[id]);
  const removeEdge = useWorkbenchStore((state) => state.removeEdge);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetPosition,
    targetX,
    targetY,
  });

  const totalRps = (telemetry?.readRps ?? 0) + (telemetry?.writeRps ?? 0);
  const isOverloaded = telemetry?.isOverloaded ?? false;

  // Dynamic stroke width between 2px and 6px based on traffic load
  const strokeWidth =
    totalRps > 20_000 ? 5 : totalRps > 5_000 ? 3.5 : totalRps > 0 ? 2.5 : 1.5;

  const strokeColor = isOverloaded
    ? "#f43f5e"
    : totalRps > 10_000
      ? "#38bdf8"
      : totalRps > 0
        ? "#10b981"
        : "#475569";

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth,
          stroke: strokeColor,
          strokeDasharray: totalRps > 0 ? "5 3" : undefined,
          animation: totalRps > 0 ? "dash 1.2s linear infinite" : undefined,
        }}
      />
      {totalRps > 0 && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="group flex items-center gap-1 rounded-full border border-slate-800 bg-slate-950/90 px-2 py-0.5 font-mono text-[9px] font-semibold text-slate-300 shadow backdrop-blur transition hover:border-rose-500/50"
          >
            <span>{formatCompactRps(totalRps)}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeEdge(id);
              }}
              className="hidden h-3 w-3 items-center justify-center rounded-full text-slate-400 hover:text-rose-400 group-hover:inline-flex"
              title="Delete edge"
            >
              &times;
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const AnimatedTrafficEdge = memo(AnimatedTrafficEdgeComponent);

"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ResourceType, RunStatus } from "@/types";
import { cn } from "@/lib/utils/cn";
import { ResourceTypeIcon } from "@/components/shared/resource-type-icon";

export interface LineageNodeData {
  uniqueId: string;
  name: string;
  resourceType: ResourceType;
  status?: RunStatus;
  lastRunDuration?: number;
  hasDescription: boolean;
  testCount: number;
  failingTestCount: number;
  isRoot?: boolean;
  [key: string]: unknown;
}

const borderColorMap: Record<ResourceType, string> = {
  model: "border-l-blue-500",
  source: "border-l-green-500",
  exposure: "border-l-purple-500",
  metric: "border-l-orange-500",
  semantic_model: "border-l-indigo-500",
  test: "border-l-emerald-500",
  seed: "border-l-lime-500",
  snapshot: "border-l-amber-500",
};

const statusDotColor: Record<string, string> = {
  success: "bg-green-500",
  error: "bg-red-500",
  running: "bg-blue-500 animate-pulse",
  queued: "bg-yellow-500",
  cancelled: "bg-zinc-400",
  skipped: "bg-zinc-400",
  starting: "bg-blue-400",
};

function LineageNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as LineageNodeData;
  const {
    name,
    resourceType,
    status,
    lastRunDuration,
    isRoot,
  } = nodeData;

  const isFailed = status === "error";
  const isSlow = (lastRunDuration ?? 0) > 300;
  const leftBorder = borderColorMap[resourceType] ?? "border-l-zinc-400";

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-zinc-400 !border-background !border-2"
      />

      <div
        className={cn(
          "border-l-4 rounded-md bg-card border shadow-sm px-3 py-2 min-w-[140px] max-w-[200px]",
          leftBorder,
          isFailed && "ring-2 ring-red-500/50",
          isSlow && !isFailed && "ring-2 ring-orange-500/50",
          isRoot && "ring-2 ring-primary/50"
        )}
      >
        <div className="flex items-center gap-2">
          <ResourceTypeIcon
            resourceType={resourceType}
            className="h-3.5 w-3.5 shrink-0"
          />
          <span className="text-xs font-medium truncate flex-1">{name}</span>
          {status && (
            <span
              className={cn(
                "h-2 w-2 rounded-full shrink-0",
                statusDotColor[status] ?? "bg-zinc-400"
              )}
            />
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-zinc-400 !border-background !border-2"
      />
    </>
  );
}

export const LineageNode = memo(LineageNodeComponent);

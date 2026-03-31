"use client";

import Link from "next/link";
import type { DbtRun, JobTriggerType } from "@/types";
import { formatDuration, formatRelativeTime } from "@/lib/utils/format";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";

interface RunRowProps {
  run: DbtRun;
}

const triggerLabels: Record<JobTriggerType, string> = {
  schedule: "Schedule",
  github_pull_request: "PR",
  api: "API",
  manual: "Manual",
  webhook: "Webhook",
};

export function RunRow({ run }: RunRowProps) {
  return (
    <Link
      href={`/runs/${run.id}`}
      className="flex items-center gap-4 rounded-md border px-4 py-3 hover:bg-muted/50 transition-colors"
    >
      <span className="text-sm font-mono font-medium w-20 shrink-0 truncate">
        #{run.id}
      </span>
      <StatusBadge status={run.status} />
      <Badge variant="outline" className="text-[10px] shrink-0">
        {triggerLabels[run.trigger] ?? run.trigger}
      </Badge>
      <span className="text-sm tabular-nums text-muted-foreground shrink-0">
        {formatDuration(run.duration)}
      </span>
      <span className="flex-1" />
      <div className="hidden sm:flex flex-col items-end text-[11px] text-muted-foreground">
        <span>Queued {formatRelativeTime(run.queuedAt)}</span>
        {run.startedAt && <span>Started {formatRelativeTime(run.startedAt)}</span>}
      </div>
      {run.finishedAt && (
        <span className="text-[11px] text-muted-foreground shrink-0">
          Finished {formatRelativeTime(run.finishedAt)}
        </span>
      )}
    </Link>
  );
}

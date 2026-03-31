"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { DbtRunStep, RunStatus } from "@/types";
import { formatDuration } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { StatusBadge } from "@/components/shared/status-badge";

interface RunStepsTimelineProps {
  steps: DbtRunStep[];
  className?: string;
}

const segmentColors: Record<RunStatus, string> = {
  success: "bg-green-500",
  error: "bg-red-500",
  running: "bg-blue-500 animate-pulse",
  queued: "bg-yellow-500",
  starting: "bg-blue-400",
  cancelled: "bg-zinc-400",
  skipped: "bg-zinc-300",
};

export function RunStepsTimeline({ steps, className }: RunStepsTimelineProps) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const totalDuration = steps.reduce((sum, s) => sum + (s.duration ?? 0), 0);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Visual progress bar */}
      {totalDuration > 0 && (
        <div className="space-y-2">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            {steps.map((step) => {
              const pct = totalDuration > 0 ? ((step.duration ?? 0) / totalDuration) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={step.id}
                  className={cn("h-full transition-all", segmentColors[step.status])}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                  title={`${step.name}: ${formatDuration(step.duration)} (${Math.round(pct)}%)`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0s</span>
            <span>{formatDuration(totalDuration)}</span>
          </div>
        </div>
      )}

      {/* Step details */}
      <div className="space-y-1">
        {steps.map((step) => {
          const isExpanded = expandedStep === step.id;
          return (
            <div key={step.id} className="rounded-md border">
              <button
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedStep(isExpanded ? null : step.id)}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[11px] font-medium shrink-0">
                  {step.index + 1}
                </span>
                <span className="flex-1 text-sm font-medium truncate">
                  {step.name}
                </span>
                <StatusBadge status={step.status} className="text-[10px]" />
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {formatDuration(step.duration)}
                </span>
                {step.logs ? (
                  isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )
                ) : (
                  <span className="w-3.5 shrink-0" />
                )}
              </button>

              {isExpanded && step.logs && (
                <div className="border-t bg-zinc-950 px-4 py-3 overflow-x-auto">
                  <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
                    {step.logs}
                  </pre>
                  {step.truncatedLogs && (
                    <p className="mt-2 text-[10px] text-zinc-500 italic">
                      Logs truncated. View full logs in dbt Cloud.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

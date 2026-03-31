"use client";

import Link from "next/link";
import { AlertTriangle, FileQuestion, Clock } from "lucide-react";
import type { DbtAsset } from "@/types";
import { cn } from "@/lib/utils/cn";
import { formatDuration } from "@/lib/utils/format";

interface AttentionPanelProps {
  assets: DbtAsset[];
  className?: string;
}

interface AttentionItem {
  uniqueId: string;
  name: string;
  reason: string;
  type: "failing" | "undocumented" | "slow";
  detail?: string;
}

export function AttentionPanel({ assets, className }: AttentionPanelProps) {
  const items: AttentionItem[] = [];

  // Failing tests (highest priority)
  const failing = assets
    .filter((a) => a.failingTestCount > 0)
    .sort((a, b) => b.failingTestCount - a.failingTestCount);

  for (const a of failing) {
    if (items.length >= 8) break;
    items.push({
      uniqueId: a.uniqueId,
      name: a.name,
      reason: `${a.failingTestCount} failing test${a.failingTestCount > 1 ? "s" : ""}`,
      type: "failing",
    });
  }

  // Missing descriptions
  const undocumented = assets
    .filter((a) => !a.hasDescription && a.resourceType === "model")
    .sort((a, b) => b.downstreamCount - a.downstreamCount);

  for (const a of undocumented) {
    if (items.length >= 8) break;
    items.push({
      uniqueId: a.uniqueId,
      name: a.name,
      reason: "Missing description",
      type: "undocumented",
      detail: a.downstreamCount > 0 ? `${a.downstreamCount} downstream` : undefined,
    });
  }

  // Longest runtimes
  const slow = assets
    .filter((a) => a.executionInfo?.averageDuration != null)
    .sort(
      (a, b) =>
        (b.executionInfo?.averageDuration ?? 0) -
        (a.executionInfo?.averageDuration ?? 0),
    );

  for (const a of slow) {
    if (items.length >= 8) break;
    // Skip if already listed
    if (items.some((i) => i.uniqueId === a.uniqueId)) continue;
    items.push({
      uniqueId: a.uniqueId,
      name: a.name,
      reason: "Long runtime",
      type: "slow",
      detail: formatDuration(a.executionInfo?.averageDuration),
    });
  }

  const iconMap = {
    failing: <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />,
    undocumented: <FileQuestion className="h-3.5 w-3.5 text-amber-500 shrink-0" />,
    slow: <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0" />,
  };

  const colorMap = {
    failing: "text-red-600",
    undocumented: "text-amber-600",
    slow: "text-blue-600",
  };

  if (items.length === 0) {
    return (
      <div className={cn("flex items-center justify-center py-8 text-sm text-muted-foreground", className)}>
        No items require attention.
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      {items.map((item) => (
        <Link
          key={item.uniqueId}
          href={`/catalog/${encodeURIComponent(item.uniqueId)}`}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted/60"
        >
          {iconMap[item.type]}
          <span className="flex-1 truncate font-medium text-foreground">
            {item.name}
          </span>
          <span className={cn("text-xs font-medium shrink-0", colorMap[item.type])}>
            {item.reason}
          </span>
          {item.detail && (
            <span className="text-xs text-muted-foreground shrink-0">
              {item.detail}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

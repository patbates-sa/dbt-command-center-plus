"use client";

import Link from "next/link";
import { ArrowRight, FlaskConical } from "lucide-react";
import type { DbtAsset } from "@/types";
import { cn } from "@/lib/utils/cn";
import { truncate } from "@/lib/utils/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResourceTypeIcon,
  getResourceTypeColor,
} from "@/components/shared/resource-type-icon";
import { StatusBadge } from "@/components/shared/status-badge";
import { RuntimeSparkline } from "@/components/shared/runtime-sparkline";

interface AssetCardProps {
  asset: DbtAsset;
  className?: string;
}

const borderColorMap: Record<string, string> = {
  model: "border-l-blue-500",
  source: "border-l-green-500",
  exposure: "border-l-purple-500",
  metric: "border-l-orange-500",
  semantic_model: "border-l-indigo-500",
  test: "border-l-emerald-500",
  seed: "border-l-lime-500",
  snapshot: "border-l-amber-500",
};

export function AssetCard({ asset, className }: AssetCardProps) {
  const borderColor = borderColorMap[asset.resourceType] ?? "border-l-zinc-400";
  const sparklineData = asset.executionInfo?.recentDurations ?? [];
  const totalTests = asset.testCount;
  const passingTests = asset.passingTestCount;

  return (
    <Link href={`/catalog/${encodeURIComponent(asset.uniqueId)}`}>
      <Card
        className={cn(
          "border-l-4 transition-colors hover:bg-accent/50 cursor-pointer",
          borderColor,
          className
        )}
      >
        <CardContent className="p-4">
          {/* Top row: icon + name + status */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <ResourceTypeIcon
                resourceType={asset.resourceType}
                className="h-5 w-5 shrink-0"
              />
              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate">
                  {asset.name}
                </h3>
                <span className="text-xs text-muted-foreground capitalize">
                  {asset.resourceType.replace("_", " ")}
                </span>
              </div>
            </div>
            {asset.executionInfo?.lastRunStatus && (
              <StatusBadge
                status={asset.executionInfo.lastRunStatus}
                className="shrink-0"
              />
            )}
          </div>

          {/* Description */}
          {asset.description && (
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              {truncate(asset.description, 120)}
            </p>
          )}

          {/* Tags */}
          {asset.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {asset.tags.slice(0, 4).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0"
                >
                  {tag}
                </Badge>
              ))}
              {asset.tags.length > 4 && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0"
                >
                  +{asset.tags.length - 4}
                </Badge>
              )}
            </div>
          )}

          {/* Bottom row: sparkline + tests + downstream */}
          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              {/* Runtime sparkline */}
              {sparklineData.length >= 2 && (
                <RuntimeSparkline data={sparklineData} width={60} height={20} />
              )}

              {/* Test indicator */}
              {totalTests > 0 && (
                <div className="flex items-center gap-1">
                  <FlaskConical className="h-3 w-3" />
                  <span
                    className={cn(
                      asset.failingTestCount > 0
                        ? "text-red-500"
                        : "text-green-600"
                    )}
                  >
                    {passingTests}/{totalTests} passing
                  </span>
                </div>
              )}
            </div>

            {/* Downstream count */}
            {asset.downstreamCount > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                <ArrowRight className="h-3 w-3" />
                <span>{asset.downstreamCount} downstream</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

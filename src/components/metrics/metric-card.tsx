"use client";

import type { DbtMetric } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { truncate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { BarChart3 } from "lucide-react";

interface MetricCardProps {
  metric: DbtMetric;
  selected?: boolean;
  onClick?: (metric: DbtMetric) => void;
  className?: string;
}

export function MetricCard({
  metric,
  selected,
  onClick,
  className,
}: MetricCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-colors hover:border-primary/50",
        selected && "border-primary bg-primary/5",
        className
      )}
      onClick={() => onClick?.(metric)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-muted p-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold">{metric.name}</p>
              {metric.label && metric.label !== metric.name && (
                <p className="text-xs text-muted-foreground">{metric.label}</p>
              )}
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            {metric.type}
          </Badge>
        </div>

        {metric.description && (
          <p className="mt-2 text-xs text-muted-foreground">
            {truncate(metric.description, 120)}
          </p>
        )}

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted-foreground">
            {metric.dimensions.length} dimension{metric.dimensions.length !== 1 ? "s" : ""}
          </span>
          {metric.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
              {tag}
            </Badge>
          ))}
          {metric.tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground">
              +{metric.tags.length - 3}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

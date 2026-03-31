"use client";

import Link from "next/link";
import {
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  FlaskConical,
  Clock,
  FileText,
} from "lucide-react";
import type { LineageNode as LineageNodeType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResourceTypeIcon } from "@/components/shared/resource-type-icon";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDuration } from "@/lib/utils/format";

interface LineageDetailPanelProps {
  node: LineageNodeType;
  upstreamCount: number;
  downstreamCount: number;
}

export function LineageDetailPanel({
  node,
  upstreamCount,
  downstreamCount,
}: LineageDetailPanelProps) {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <ResourceTypeIcon
          resourceType={node.resourceType}
          className="h-6 w-6 mt-0.5 shrink-0"
        />
        <div className="min-w-0">
          <h3 className="font-semibold text-base truncate">{node.name}</h3>
          <p className="text-xs text-muted-foreground capitalize">
            {node.resourceType.replace("_", " ")}
          </p>
        </div>
      </div>

      {/* Status */}
      {node.status && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Status:</span>
          <StatusBadge status={node.status} />
        </div>
      )}

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {node.materialization && (
          <div>
            <span className="text-xs text-muted-foreground block">
              Materialization
            </span>
            <Badge variant="secondary" className="text-xs mt-0.5">
              {node.materialization}
            </Badge>
          </div>
        )}
        {node.schema && (
          <div>
            <span className="text-xs text-muted-foreground block">Schema</span>
            <span className="text-xs font-mono">{node.schema}</span>
          </div>
        )}
        {node.database && (
          <div>
            <span className="text-xs text-muted-foreground block">
              Database
            </span>
            <span className="text-xs font-mono">{node.database}</span>
          </div>
        )}
      </div>

      {/* Test summary */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tests
        </h4>
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-muted-foreground" />
          {node.testCount > 0 ? (
            <span className="text-sm">
              {node.testCount - node.failingTestCount}/{node.testCount} passing
              {node.failingTestCount > 0 && (
                <span className="text-red-500 ml-1">
                  ({node.failingTestCount} failing)
                </span>
              )}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">No tests</span>
          )}
        </div>
      </div>

      {/* Execution info */}
      {node.lastRunDuration != null && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Execution
          </h4>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              Last run: {formatDuration(node.lastRunDuration)}
            </span>
          </div>
        </div>
      )}

      {/* Documentation */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Documentation
        </h4>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {node.hasDescription ? "Has description" : "Missing description"}
          </span>
        </div>
      </div>

      {/* Relationship counts */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Dependencies
        </h4>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5 text-sm">
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            <span>{upstreamCount} upstream</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <ArrowDownRight className="h-4 w-4 text-muted-foreground" />
            <span>{downstreamCount} downstream</span>
          </div>
        </div>
      </div>

      {/* Link to catalog */}
      <div className="pt-2 border-t">
        <Link href={`/catalog/${encodeURIComponent(node.uniqueId)}`}>
          <Button variant="outline" size="sm" className="w-full">
            <ExternalLink className="mr-2 h-3.5 w-3.5" />
            View in Catalog
          </Button>
        </Link>
      </div>
    </div>
  );
}

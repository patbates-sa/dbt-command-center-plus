"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  FileText,
  FlaskConical,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  Download,
  ExternalLink,
  Search,
  CircleDot,
  CircleMinus,
  ChevronRight,
  GitBranch,
  Loader2,
  TrendingUp,
  Layers,
} from "lucide-react";
import { useAsset, useLineage, useRuns, useArtifacts, useParentColumns } from "@/lib/hooks";
import { cn } from "@/lib/utils/cn";
import {
  formatDuration,
  formatRelativeTime,
  formatPercent,
} from "@/lib/utils/format";
import type { DbtAsset } from "@/types";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResourceTypeIcon } from "@/components/shared/resource-type-icon";
import { StatusBadge } from "@/components/shared/status-badge";
import { CodeViewer } from "@/components/shared/code-viewer";
import { RuntimeSparkline } from "@/components/shared/runtime-sparkline";
import { EmptyState } from "@/components/shared/empty-state";
import { ApiSurfaceCallout } from "@/components/shared/api-surface-callout";
import { DetailSkeleton } from "@/components/shared/loading-skeleton";

// ── Overview Tab ─────────────────────────────────────────────

function OverviewTab({ asset }: { asset: DbtAsset }) {
  const documentedCols = asset.documentedColumns;
  const totalCols = asset.totalColumns;

  return (
    <div className="space-y-6">
      {/* Metadata grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 text-sm">
            {asset.materialization && (
              <div>
                <dt className="text-muted-foreground text-xs">
                  Materialization
                </dt>
                <dd className="font-medium mt-0.5">
                  <Badge variant="secondary">{asset.materialization}</Badge>
                </dd>
              </div>
            )}
            {asset.schema && (
              <div>
                <dt className="text-muted-foreground text-xs">Schema</dt>
                <dd className="font-mono mt-0.5">{asset.schema}</dd>
              </div>
            )}
            {asset.database && (
              <div>
                <dt className="text-muted-foreground text-xs">Database</dt>
                <dd className="font-mono mt-0.5">{asset.database}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground text-xs">Package</dt>
              <dd className="mt-0.5">{asset.packageName}</dd>
            </div>
            {asset.owner && (
              <div>
                <dt className="text-muted-foreground text-xs">Owner</dt>
                <dd className="mt-0.5">{asset.owner}</dd>
              </div>
            )}
            {asset.group && (
              <div>
                <dt className="text-muted-foreground text-xs">Group</dt>
                <dd className="mt-0.5">{asset.group}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Tags */}
      {asset.tags.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {asset.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documentation + Tests + Dependencies row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Documentation completeness */}
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-5 w-5 mx-auto text-muted-foreground" />
            <p className="mt-2 text-lg font-semibold">
              {documentedCols} / {totalCols}
            </p>
            <p className="text-xs text-muted-foreground">
              columns documented ({formatPercent(documentedCols, totalCols)})
            </p>
          </CardContent>
        </Card>

        {/* Test coverage */}
        <Card>
          <CardContent className="p-4 text-center">
            <FlaskConical className="h-5 w-5 mx-auto text-muted-foreground" />
            <p className="mt-2 text-lg font-semibold">
              {asset.passingTestCount} / {asset.testCount}
            </p>
            <p className="text-xs text-muted-foreground">
              tests passing
              {asset.failingTestCount > 0 && (
                <span className="text-red-500">
                  {" "}
                  ({asset.failingTestCount} failing)
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Dependencies */}
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex justify-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{asset.upstreamCount}</span>
                <span className="text-muted-foreground text-xs">upstream</span>
              </div>
              <div className="flex items-center gap-1">
                <ArrowDownRight className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{asset.downstreamCount}</span>
                <span className="text-muted-foreground text-xs">
                  downstream
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Last execution info */}
      {asset.executionInfo && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Last Execution</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 text-sm">
              {asset.executionInfo.lastRunAt && (
                <div>
                  <dt className="text-muted-foreground text-xs">Ran</dt>
                  <dd className="mt-0.5">
                    {formatRelativeTime(asset.executionInfo.lastRunAt)}
                  </dd>
                </div>
              )}
              {asset.executionInfo.lastRunStatus && (
                <div>
                  <dt className="text-muted-foreground text-xs">Status</dt>
                  <dd className="mt-0.5">
                    <StatusBadge
                      status={asset.executionInfo.lastRunStatus}
                    />
                  </dd>
                </div>
              )}
              {asset.executionInfo.lastRunDuration != null && (
                <div>
                  <dt className="text-muted-foreground text-xs">Duration</dt>
                  <dd className="mt-0.5">
                    {formatDuration(asset.executionInfo.lastRunDuration)}
                  </dd>
                </div>
              )}
              {asset.executionInfo.executionCount != null && (
                <div>
                  <dt className="text-muted-foreground text-xs">
                    Total Executions
                  </dt>
                  <dd className="mt-0.5">
                    {asset.executionInfo.executionCount}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Column Lineage ───────────────────────────────────────────

function ColumnLineagePanel({
  asset,
  columnName,
}: {
  asset: DbtAsset;
  columnName: string;
}) {
  const { data: parentData, isLoading } = useParentColumns(
    asset.parentNodes,
    true,
  );

  if (!asset.parentNodes || asset.parentNodes.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        No upstream models found for this asset.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading upstream columns…
      </div>
    );
  }

  const colLower = columnName.toLowerCase();
  const matches = (parentData ?? []).map((parent) => ({
    ...parent,
    matchedColumn: parent.columns.find((c) => c.name.toLowerCase() === colLower),
  }));
  const found = matches.filter((m) => m.matchedColumn);
  const notFound = matches.filter((m) => !m.matchedColumn);

  return (
    <div className="space-y-2">
      {found.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          Column <span className="font-mono">{colLower}</span> not found by name in any upstream model.
          It may be derived or renamed in SQL.
        </p>
      )}
      {found.map((m) => (
        <Link key={m.uniqueId} href={`/catalog/${encodeURIComponent(m.uniqueId)}`}>
          <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs hover:bg-accent/50 transition-colors cursor-pointer">
            <ResourceTypeIcon resourceType={m.resourceType as DbtAsset["resourceType"]} className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium">{m.name}</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-mono text-muted-foreground">{m.matchedColumn!.name.toLowerCase()}</span>
            {m.matchedColumn!.type && (
              <Badge variant="outline" className="ml-auto font-mono text-[10px] px-1.5 py-0">
                {m.matchedColumn!.type}
              </Badge>
            )}
          </div>
        </Link>
      ))}
      {notFound.length > 0 && found.length > 0 && (
        <p className="text-[10px] text-muted-foreground pt-1">
          Not found in: {notFound.map((m) => m.name).join(", ")}
        </p>
      )}
    </div>
  );
}

// ── Columns Tab ──────────────────────────────────────────────

const TEST_TYPE_LABELS: Record<string, { label: string; className: string }> = {
  not_null:        { label: "not null",        className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" },
  unique:          { label: "unique",          className: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20" },
  accepted_values: { label: "accepted values", className: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" },
  relationships:   { label: "relationships",   className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20" },
};

function parseTestType(testName: string): string {
  for (const prefix of ["not_null", "unique", "accepted_values", "relationships"]) {
    if (testName.startsWith(prefix + "_")) return prefix;
  }
  return "custom";
}

function testsForColumn(
  tests: Array<{ uniqueId: string; name: string }>,
  modelName: string,
  columnName: string,
): Array<{ uniqueId: string; name: string; testType: string }> {
  const colLower = columnName.toLowerCase();
  const modelLower = modelName.toLowerCase();
  return tests
    .filter((t) => {
      const n = t.name.toLowerCase();
      return n.includes(`_${modelLower}_${colLower}`) || n.endsWith(`_${colLower}`);
    })
    .map((t) => ({ ...t, testType: parseTestType(t.name) }));
}

function ColumnsTab({ asset }: { asset: DbtAsset }) {
  const [search, setSearch] = useState("");
  const [expandedColumn, setExpandedColumn] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search) return asset.columns;
    const q = search.toLowerCase();
    return asset.columns.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.type?.toLowerCase().includes(q),
    );
  }, [asset.columns, search]);

  const documented = asset.columns.filter((c) => !!c.description).length;

  if (asset.columns.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No columns available"
        description="Column metadata was not returned for this asset."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary + search */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">{asset.columns.length}</span> columns
          </span>
          <span className="flex items-center gap-1">
            <CircleDot className="h-3.5 w-3.5 text-green-500" />
            <span className="text-green-600 dark:text-green-400 font-medium">{documented}</span> documented
          </span>
          <span className="flex items-center gap-1">
            <CircleMinus className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{asset.columns.length - documented}</span> undocumented
          </span>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Filter columns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Column rows */}
      <div className="rounded-md border divide-y">
        {filtered.map((col) => {
          const colTests = testsForColumn(
            asset.tests ?? [],
            asset.name,
            col.name,
          );
          const isDocumented = !!col.description;
          const metaEntries = Object.entries(col.meta ?? {}).filter(([, v]) => v != null);

          const isExpanded = expandedColumn === col.name;

          return (
            <div key={col.name} className="transition-colors">
              {/* Row: name + type + doc status */}
              <div
                className="p-4 hover:bg-muted/30 cursor-pointer"
                onClick={() => setExpandedColumn(isExpanded ? null : col.name)}
              >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <ChevronRight
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                      isExpanded && "rotate-90",
                    )}
                  />
                  {isDocumented ? (
                    <CircleDot className="h-3.5 w-3.5 shrink-0 text-green-500 mt-0.5" />
                  ) : (
                    <CircleMinus className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                  )}
                  <span className="font-mono text-sm font-semibold tracking-tight">
                    {col.name.toLowerCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {col.type && (
                    <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                      {col.type}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className={cn(
                "mt-1.5 text-xs ml-5 pl-0.5",
                isDocumented
                  ? "text-muted-foreground leading-relaxed"
                  : "text-muted-foreground/50 italic"
              )}>
                {col.description ?? "No description"}
              </p>

              {/* Tests */}
              {colTests.length > 0 && (
                <div className="mt-2 ml-5 flex flex-wrap gap-1">
                  {colTests.map((t) => {
                    const config = TEST_TYPE_LABELS[t.testType] ?? {
                      label: t.testType,
                      className: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
                    };
                    return (
                      <Badge
                        key={t.uniqueId}
                        variant="outline"
                        className={cn("text-[10px] px-1.5 py-0 h-4", config.className)}
                      >
                        <FlaskConical className="h-2.5 w-2.5 mr-1" />
                        {config.label}
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Tags */}
              {col.tags && col.tags.length > 0 && (
                <div className="mt-2 ml-5 flex flex-wrap gap-1">
                  {col.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Meta */}
              {metaEntries.length > 0 && (
                <div className="mt-2 ml-5 flex flex-wrap gap-2">
                  {metaEntries.map(([k, v]) => (
                    <span key={k} className="text-[10px] text-muted-foreground">
                      <span className="font-medium">{k}:</span> {String(v)}
                    </span>
                  ))}
                </div>
              )}
              </div>{/* end hover div */}

              {/* Column lineage panel */}
              {isExpanded && (
                <div className="px-4 pb-4 ml-8 border-t bg-muted/20">
                  <div className="pt-3">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                      <GitBranch className="h-3 w-3" />
                      Upstream column lineage
                    </p>
                    <ColumnLineagePanel asset={asset} columnName={col.name} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          No columns match &quot;{search}&quot;
        </p>
      )}
    </div>
  );
}

// ── SQL Tab ──────────────────────────────────────────────────

function SqlTab({ asset }: { asset: DbtAsset }) {
  const [showCompiled, setShowCompiled] = useState(false);
  const hasRaw = !!asset.rawCode;
  const hasCompiled = !!asset.compiledCode;

  if (!hasRaw && !hasCompiled) {
    return (
      <EmptyState
        icon={FileText}
        title="No SQL available"
        description="This asset does not have raw or compiled SQL in its metadata."
      />
    );
  }

  const displayCode = showCompiled && hasCompiled
    ? asset.compiledCode!
    : asset.rawCode ?? asset.compiledCode ?? "";

  return (
    <div className="space-y-4">
      {hasRaw && hasCompiled && (
        <div className="flex items-center gap-2">
          <Button
            variant={!showCompiled ? "default" : "outline"}
            size="sm"
            onClick={() => setShowCompiled(false)}
          >
            Raw SQL
          </Button>
          <Button
            variant={showCompiled ? "default" : "outline"}
            size="sm"
            onClick={() => setShowCompiled(true)}
          >
            Compiled SQL
          </Button>
        </div>
      )}

      <CodeViewer
        code={displayCode}
        language="sql"
        title={showCompiled ? "Compiled SQL" : "Raw SQL"}
      />

      <p className="text-xs text-muted-foreground italic">
        SQL is sourced from dbt metadata, not a live editor.
      </p>
    </div>
  );
}

// ── Lineage Tab ──────────────────────────────────────────────

function LineageTab({ asset }: { asset: DbtAsset }) {
  const { data: lineage, isLoading } = useLineage(asset.uniqueId, 1, "both");

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  const upstream = (lineage?.edges ?? [])
    .filter((e) => e.target === asset.uniqueId)
    .map((e) => lineage?.nodes.find((n) => n.uniqueId === e.source))
    .filter(Boolean);

  const downstream = (lineage?.edges ?? [])
    .filter((e) => e.source === asset.uniqueId)
    .map((e) => lineage?.nodes.find((n) => n.uniqueId === e.target))
    .filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Upstream */}
      <div>
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <ArrowUpRight className="h-4 w-4" />
          Upstream Dependencies ({upstream.length})
        </h4>
        {upstream.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No upstream dependencies.
          </p>
        ) : (
          <div className="space-y-2">
            {upstream.map((node) => (
              <Link
                key={node!.uniqueId}
                href={`/catalog/${encodeURIComponent(node!.uniqueId)}`}
              >
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="p-3 flex items-center gap-3">
                    <ResourceTypeIcon resourceType={node!.resourceType} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {node!.name}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {node!.resourceType.replace("_", " ")}
                      </p>
                    </div>
                    {node!.status && (
                      <StatusBadge status={node!.status} />
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Downstream */}
      <div>
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <ArrowDownRight className="h-4 w-4" />
          Downstream Dependencies ({downstream.length})
        </h4>
        {downstream.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No downstream dependencies.
          </p>
        ) : (
          <div className="space-y-2">
            {downstream.map((node) => (
              <Link
                key={node!.uniqueId}
                href={`/catalog/${encodeURIComponent(node!.uniqueId)}`}
              >
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="p-3 flex items-center gap-3">
                    <ResourceTypeIcon resourceType={node!.resourceType} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {node!.name}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {node!.resourceType.replace("_", " ")}
                      </p>
                    </div>
                    {node!.status && (
                      <StatusBadge status={node!.status} />
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="pt-2">
        <Link href="/lineage">
          <Button variant="outline" size="sm">
            <ExternalLink className="mr-2 h-3.5 w-3.5" />
            Open full Lineage Explorer
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ── Tests Tab ────────────────────────────────────────────────

function TestsTab({ asset }: { asset: DbtAsset }) {
  const tests = useMemo(() => {
    return (asset.tests ?? []).map((t) => ({
      uniqueId: t.uniqueId,
      name: t.name,
      testType: parseTestType(t.name),
      status: t.status,
    }));
  }, [asset]);

  if (tests.length === 0) {
    return (
      <EmptyState
        icon={FlaskConical}
        title="No tests defined"
        description="This asset does not have any tests configured."
      />
    );
  }

  return (
    <div className="space-y-2">
      {tests.map((test) => {
        const typeConfig = TEST_TYPE_LABELS[test.testType];
        const isPassing = test.status === "pass" || test.status === "success" || test.status === "reused";
        const isFailing = test.status === "fail" || test.status === "error";
        return (
          <Card key={test.uniqueId}>
            <CardContent className="p-3 flex items-center gap-3">
              {isPassing ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              ) : isFailing ? (
                <XCircle className="h-4 w-4 text-red-500 shrink-0" />
              ) : (
                <FlaskConical className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-mono truncate">{test.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {typeConfig?.label ?? test.testType} test
                  {test.status === "warn" && (
                    <span className="ml-1 text-yellow-500">· warn</span>
                  )}
                </p>
              </div>
              {typeConfig && (
                <Badge
                  variant="outline"
                  className={cn("text-[10px] px-1.5 py-0 h-5 shrink-0", typeConfig.className)}
                >
                  {typeConfig.label}
                </Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ── Execution History Tab ────────────────────────────────────

function ExecutionHistoryTab({ asset }: { asset: DbtAsset }) {
  const runsQuery = useRuns();
  const runs = useMemo(() => {
    // Show recent runs associated with this asset
    return (runsQuery.data ?? []).slice(0, 10);
  }, [runsQuery.data]);

  const sparklineData = asset.executionInfo?.recentDurations ?? [];

  if (runsQuery.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Duration trend */}
      {sparklineData.length >= 2 && (
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Duration Trend</p>
              <p className="text-xs text-muted-foreground">
                Recent execution times
              </p>
            </div>
            <RuntimeSparkline
              data={sparklineData}
              width={200}
              height={32}
            />
          </CardContent>
        </Card>
      )}

      {/* Runs table */}
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Run ID</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Duration</th>
              <th className="text-left p-3 font-medium">Finished At</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id} className="border-b last:border-0">
                <td className="p-3">
                  <Link
                    href={`/runs/${run.id}`}
                    className="text-primary hover:underline font-mono text-xs"
                  >
                    {run.id}
                  </Link>
                </td>
                <td className="p-3">
                  <StatusBadge status={run.status} />
                </td>
                <td className="p-3 text-muted-foreground">
                  {formatDuration(run.duration)}
                </td>
                <td className="p-3 text-muted-foreground">
                  {formatRelativeTime(run.finishedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Artifacts Tab ────────────────────────────────────────────

function ArtifactsTab({ asset }: { asset: DbtAsset }) {
  const lastRunId = asset.executionInfo?.lastRunId;
  const artifactsQuery = useArtifacts(lastRunId ?? "");

  if (!lastRunId) {
    return (
      <EmptyState
        icon={Download}
        title="No artifacts available"
        description="No recent run data is linked to this asset."
      />
    );
  }

  if (artifactsQuery.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  const artifacts = artifactsQuery.data ?? [];

  if (artifacts.length === 0) {
    return (
      <EmptyState
        icon={Download}
        title="No artifacts found"
        description="No artifacts were produced by the last run."
      />
    );
  }

  return (
    <div className="space-y-2">
      {artifacts.map((artifact) => (
        <Card key={artifact.id}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium">{artifact.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {artifact.type} &middot; Generated{" "}
                {formatRelativeTime(artifact.generatedAt)}
                {artifact.size != null && (
                  <> &middot; {(artifact.size / 1024).toFixed(1)} KB</>
                )}
              </p>
              {artifact.parsedSummary && (
                <p className="text-xs text-muted-foreground mt-1">
                  {artifact.parsedSummary.totalNodes != null && (
                    <>Nodes: {artifact.parsedSummary.totalNodes} total</>
                  )}
                  {artifact.parsedSummary.successNodes != null && (
                    <>, {artifact.parsedSummary.successNodes} success</>
                  )}
                  {artifact.parsedSummary.errorNodes != null &&
                    artifact.parsedSummary.errorNodes > 0 && (
                      <>, {artifact.parsedSummary.errorNodes} errors</>
                    )}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" disabled>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Download
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Recommendations Tab ──────────────────────────────────────

interface Recommendation {
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
}

function RecommendationsTab({ asset }: { asset: DbtAsset }) {
  const recommendations = useMemo(() => {
    const recs: Recommendation[] = [];

    if (!asset.hasDescription) {
      recs.push({
        severity: "medium",
        title: "Missing description",
        description:
          "Add a description to this asset so team members can understand its purpose without reading the SQL.",
      });
    }

    if (asset.testCount === 0) {
      recs.push({
        severity: "high",
        title: "No tests defined",
        description:
          "Add at least a not_null and unique test on the primary key to catch data quality issues early.",
      });
    }

    // Stale execution (>7 days)
    if (asset.executionInfo?.lastRunAt) {
      const lastRun = new Date(asset.executionInfo.lastRunAt);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (lastRun < sevenDaysAgo) {
        recs.push({
          severity: "medium",
          title: "Stale execution",
          description:
            "This asset has not been executed in over 7 days. Ensure the job schedule is active and the model is still in use.",
        });
      }
    }

    // Long runtime (>300s)
    if (
      asset.executionInfo?.lastRunDuration != null &&
      asset.executionInfo.lastRunDuration > 300
    ) {
      recs.push({
        severity: "medium",
        title: "Long runtime",
        description: `Last execution took ${formatDuration(asset.executionInfo.lastRunDuration)}. Consider optimizing the SQL, materializing as incremental, or adding clustering.`,
      });
    }

    // High blast radius (>10 downstream)
    if (asset.downstreamCount > 10) {
      recs.push({
        severity: "high",
        title: "High blast radius",
        description: `This asset has ${asset.downstreamCount} downstream dependents. Any breaking change or failure will cascade. Ensure it has strong test coverage.`,
      });
    }

    return recs;
  }, [asset]);

  if (recommendations.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Looking good!"
        description="No recommendations at this time. This asset meets all best-practice checks."
      />
    );
  }

  const severityColors: Record<string, string> = {
    high: "border-l-red-500 bg-red-500/5",
    medium: "border-l-yellow-500 bg-yellow-500/5",
    low: "border-l-blue-500 bg-blue-500/5",
  };

  const severityIcons: Record<string, typeof AlertTriangle> = {
    high: AlertTriangle,
    medium: AlertTriangle,
    low: Info,
  };

  return (
    <div className="space-y-3">
      {recommendations.map((rec, idx) => {
        const Icon = severityIcons[rec.severity];
        return (
          <Card
            key={idx}
            className={`border-l-4 ${severityColors[rec.severity]}`}
          >
            <CardContent className="p-4 flex gap-3">
              <Icon
                className={`h-5 w-5 shrink-0 mt-0.5 ${
                  rec.severity === "high"
                    ? "text-red-500"
                    : rec.severity === "medium"
                    ? "text-yellow-500"
                    : "text-blue-500"
                }`}
              />
              <div>
                <p className="text-sm font-semibold">{rec.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {rec.description}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ── Semantic Model Tab ───────────────────────────────────────

function SemanticModelTab({ asset }: { asset: DbtAsset }) {
  const measures = asset.measures ?? [];
  const dimensions = asset.dimensions ?? [];
  const entities = asset.entities ?? [];

  const aggLabel = (agg?: string) =>
    agg ? agg.toLowerCase().replace("_", " ") : "—";

  const Section = ({
    title,
    icon: Icon,
    items,
    renderRow,
  }: {
    title: string;
    icon: React.ElementType;
    items: unknown[];
    renderRow: (item: unknown, i: number) => React.ReactNode;
  }) => (
    <div>
      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
        <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">{items.length}</Badge>
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">None defined.</p>
      ) : (
        <div className="rounded-md border divide-y">
          {items.map((item, i) => renderRow(item, i))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Upstream model */}
      {asset.parentNodes && asset.parentNodes.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Built from</p>
            <div className="flex flex-wrap gap-2">
              {asset.parentNodes.map((p) => (
                <Link key={p.uniqueId} href={`/catalog/${encodeURIComponent(p.uniqueId)}`}>
                  <Badge variant="outline" className="gap-1.5 cursor-pointer hover:bg-accent">
                    <ResourceTypeIcon resourceType={p.resourceType as import("@/types").ResourceType} className="h-3 w-3" />
                    {p.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Section
        title="Measures"
        icon={TrendingUp}
        items={measures}
        renderRow={(item) => {
          const m = item as { name: string; description?: string; agg?: string };
          return (
            <div key={m.name} className="px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium flex-1">{m.name}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
                  {aggLabel(m.agg)}
                </Badge>
              </div>
              {m.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
              )}
            </div>
          );
        }}
      />

      <Section
        title="Dimensions"
        icon={Layers}
        items={dimensions}
        renderRow={(item) => {
          const d = item as { name: string; description?: string; type?: string };
          return (
            <div key={d.name} className="px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium flex-1">{d.name}</span>
                {d.type && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 shrink-0 capitalize">
                    {d.type}
                  </Badge>
                )}
              </div>
              {d.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{d.description}</p>
              )}
            </div>
          );
        }}
      />

      <Section
        title="Entities"
        icon={CircleDot}
        items={entities}
        renderRow={(item) => {
          const e = item as { name: string; description?: string; type?: string };
          return (
            <div key={e.name} className="px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium flex-1">{e.name}</span>
                {e.type && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 shrink-0 capitalize">
                    {e.type}
                  </Badge>
                )}
              </div>
              {e.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{e.description}</p>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────

export default function AssetDetailPage() {
  const params = useParams();
  const resourceId = params.resourceId as string;
  const uniqueId = decodeURIComponent(resourceId);

  const { data: asset, isLoading, isError, error } = useAsset(uniqueId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Link href="/catalog">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Catalog
          </Button>
        </Link>
        <DetailSkeleton />
      </div>
    );
  }

  if (isError || !asset) {
    return (
      <div className="space-y-6">
        <Link href="/catalog">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Catalog
          </Button>
        </Link>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-destructive font-medium">
              {isError ? "Failed to load asset." : "Asset not found."}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {error?.message ??
                `No asset found with ID "${uniqueId}".`}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/catalog">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Catalog
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4">
        <ResourceTypeIcon
          resourceType={asset.resourceType}
          className="h-8 w-8 mt-1 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{asset.name}</h1>
            <Badge variant="secondary" className="capitalize">
              {asset.resourceType.replace("_", " ")}
            </Badge>
            {asset.executionInfo?.lastRunStatus && (
              <StatusBadge status={asset.executionInfo.lastRunStatus} />
            )}
          </div>
          {asset.description && (
            <p className="text-muted-foreground mt-1">{asset.description}</p>
          )}
          {asset.executionInfo?.lastRunAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Last run {formatRelativeTime(asset.executionInfo.lastRunAt)}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      {asset.resourceType === "semantic_model" ? (
        <Tabs defaultValue="semantic">
          <TabsList className="flex-wrap">
            <TabsTrigger value="semantic">Semantic Definition</TabsTrigger>
            <TabsTrigger value="lineage">Lineage</TabsTrigger>
          </TabsList>
          <TabsContent value="semantic">
            <SemanticModelTab asset={asset} />
          </TabsContent>
          <TabsContent value="lineage">
            <LineageTab asset={asset} />
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="columns">
              Columns
              {asset.columns.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-4 min-w-4 text-[10px] px-1">
                  {asset.columns.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sql">SQL</TabsTrigger>
            <TabsTrigger value="lineage">Lineage</TabsTrigger>
            <TabsTrigger value="tests">
              Tests
              {asset.failingTestCount > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-4 min-w-4 text-[10px] px-1">
                  {asset.failingTestCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="execution">Execution History</TabsTrigger>
            <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><OverviewTab asset={asset} /></TabsContent>
          <TabsContent value="columns"><ColumnsTab asset={asset} /></TabsContent>
          <TabsContent value="sql"><SqlTab asset={asset} /></TabsContent>
          <TabsContent value="lineage"><LineageTab asset={asset} /></TabsContent>
          <TabsContent value="tests"><TestsTab asset={asset} /></TabsContent>
          <TabsContent value="execution"><ExecutionHistoryTab asset={asset} /></TabsContent>
          <TabsContent value="artifacts"><ArtifactsTab asset={asset} /></TabsContent>
          <TabsContent value="recommendations"><RecommendationsTab asset={asset} /></TabsContent>
        </Tabs>
      )}

      {/* API Surface Callout */}
      <ApiSurfaceCallout
        title="Powered by Discovery API"
        endpoints={[
          "Discovery API (GraphQL) -- query { environment { applied { modelByUniqueId(uniqueId: ...) { ... } } } }",
          "Discovery API (GraphQL) -- lineage { parents, children }",
          "Administrative API v3 -- GET /api/v3/accounts/{id}/runs",
          "Administrative API v3 -- GET /api/v3/accounts/{id}/runs/{runId}/artifacts",
        ]}
      />
    </div>
  );
}

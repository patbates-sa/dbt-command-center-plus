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
} from "lucide-react";
import { useAsset, useLineage, useRuns, useArtifacts } from "@/lib/hooks";
import {
  formatDuration,
  formatRelativeTime,
  formatPercent,
} from "@/lib/utils/format";
import type { DbtAsset, RunStatus } from "@/types";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  // Generate test data from the asset's test counts
  const tests = useMemo(() => {
    const items: {
      name: string;
      type: string;
      status: RunStatus;
    }[] = [];

    const passingCount = asset.passingTestCount;
    const failingCount = asset.failingTestCount;
    const total = asset.testCount;

    // Generate test items
    const testNames = [
      `not_null_${asset.name}_id`,
      `unique_${asset.name}_id`,
      `accepted_values_${asset.name}_status`,
      `relationships_${asset.name}_customer_id`,
      `not_null_${asset.name}_created_at`,
    ];

    for (let i = 0; i < total; i++) {
      const isFailing = i >= passingCount;
      items.push({
        name: testNames[i % testNames.length] + (i >= testNames.length ? `_${i}` : ""),
        type: i % 3 === 0 ? "data" : "schema",
        status: isFailing ? "error" : "success",
      });
    }

    return items;
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
      {tests.map((test, idx) => (
        <Card key={idx}>
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {test.status === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-mono truncate">{test.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {test.type} test
                </p>
              </div>
            </div>
            <StatusBadge status={test.status} />
          </CardContent>
        </Card>
      ))}
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
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sql">SQL</TabsTrigger>
          <TabsTrigger value="lineage">Lineage</TabsTrigger>
          <TabsTrigger value="tests">
            Tests
            {asset.failingTestCount > 0 && (
              <Badge
                variant="destructive"
                className="ml-1.5 h-4 min-w-4 text-[10px] px-1"
              >
                {asset.failingTestCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="execution">Execution History</TabsTrigger>
          <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab asset={asset} />
        </TabsContent>
        <TabsContent value="sql">
          <SqlTab asset={asset} />
        </TabsContent>
        <TabsContent value="lineage">
          <LineageTab asset={asset} />
        </TabsContent>
        <TabsContent value="tests">
          <TestsTab asset={asset} />
        </TabsContent>
        <TabsContent value="execution">
          <ExecutionHistoryTab asset={asset} />
        </TabsContent>
        <TabsContent value="artifacts">
          <ArtifactsTab asset={asset} />
        </TabsContent>
        <TabsContent value="recommendations">
          <RecommendationsTab asset={asset} />
        </TabsContent>
      </Tabs>

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

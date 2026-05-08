"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  XCircle,
  FileDown,
  Clock,
  Timer,
  Cpu,
  GitBranch,
  GitCommit,
  User,
  Zap,
  CheckCircle2,
  SkipForward,
  RefreshCw,
  Database,
  FlaskConical,
} from "lucide-react";
import { useRun, useArtifacts, useRunResults, useTriggerRun, useCancelRun, type RunResultNode } from "@/lib/hooks";
import { formatDuration, formatRelativeTime } from "@/lib/utils/format";
import { StatusBadge } from "@/components/shared/status-badge";
import { ApiSurfaceCallout } from "@/components/shared/api-surface-callout";
import { DetailSkeleton } from "@/components/shared/loading-skeleton";
import { RunStepsTimeline } from "@/components/jobs/run-steps-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

// ── Models Tab ───────────────────────────────────────────────

function statusIcon(status: string) {
  switch (status) {
    case "success": return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
    case "error":   return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
    case "skipped": return <SkipForward className="h-4 w-4 text-zinc-400 shrink-0" />;
    case "reused":  return <RefreshCw className="h-4 w-4 text-green-400 shrink-0" />;
    default:        return <Database className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "success": return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
    case "error":   return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
    case "skipped": return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
    case "reused":  return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
    default:        return "bg-muted text-muted-foreground border-border";
  }
}

function nodeShortName(uniqueId: string) {
  const parts = uniqueId.split(".");
  return parts[parts.length - 1];
}

function ModelResultRow({ node }: { node: RunResultNode }) {
  const name = nodeShortName(node.unique_id);
  const isModel = node.unique_id.startsWith("model.");
  const catalogId = encodeURIComponent(node.unique_id);

  const inner = (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
      isModel && "hover:bg-muted/40 cursor-pointer",
    )}>
      {statusIcon(node.status)}
      <span className="flex-1 font-mono truncate">{name}</span>
      <Badge
        variant="outline"
        className={cn("text-[10px] px-1.5 py-0 h-5 shrink-0", statusBadgeClass(node.status))}
      >
        {node.status}
      </Badge>
      {node.execution_time > 0 && node.status !== "reused" && node.status !== "skipped" && (
        <span className="text-xs text-muted-foreground w-14 text-right shrink-0">
          {node.execution_time.toFixed(1)}s
        </span>
      )}
    </div>
  );

  if (isModel) {
    return <Link href={`/catalog/${catalogId}`}>{inner}</Link>;
  }
  return inner;
}

function ModelsTab({ runId }: { runId: string }) {
  const { data: results = [], isLoading } = useRunResults(runId);

  const models = results.filter((r) => r.unique_id.startsWith("model."));
  const tests  = results.filter((r) => r.unique_id.startsWith("test."));

  const built   = models.filter((r) => r.status === "success").length;
  const reused  = models.filter((r) => r.status === "reused").length;
  const failed  = models.filter((r) => r.status === "error").length;
  const skipped = models.filter((r) => r.status === "skipped").length;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 rounded-md bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No model results found in run_results.json.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="flex items-center gap-4 text-sm flex-wrap">
        {built > 0 && (
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            <span className="font-medium text-green-700 dark:text-green-400">{built}</span>
            <span className="text-muted-foreground">built</span>
          </span>
        )}
        {reused > 0 && (
          <span className="flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5 text-green-400" />
            <span className="font-medium text-green-700 dark:text-green-400">{reused}</span>
            <span className="text-muted-foreground">reused</span>
          </span>
        )}
        {failed > 0 && (
          <span className="flex items-center gap-1.5">
            <XCircle className="h-3.5 w-3.5 text-red-500" />
            <span className="font-medium text-red-600 dark:text-red-400">{failed}</span>
            <span className="text-muted-foreground">failed</span>
          </span>
        )}
        {skipped > 0 && (
          <span className="flex items-center gap-1.5">
            <SkipForward className="h-3.5 w-3.5 text-zinc-400" />
            <span className="font-medium">{skipped}</span>
            <span className="text-muted-foreground">skipped</span>
          </span>
        )}
        {tests.length > 0 && (
          <span className="flex items-center gap-1.5 ml-auto">
            <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{tests.length} tests also ran</span>
          </span>
        )}
      </div>

      {/* Model list — failed first, then built, then reused, then skipped */}
      <div className="rounded-md border divide-y">
        {(["error", "success", "reused", "skipped"] as const).flatMap((s) =>
          models
            .filter((r) => r.status === s)
            .map((r) => <ModelResultRow key={r.unique_id} node={r} />)
        )}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────

export default function RunDetailPage() {
  const params = useParams<{ runId: string }>();
  const runId = params.runId;

  const runQuery = useRun(runId);
  const artifactsQuery = useArtifacts(runId);
  const resultsQuery = useRunResults(runId);
  const triggerRun = useTriggerRun();
  const cancelRun = useCancelRun();

  const run = runQuery.data;
  const artifacts = artifactsQuery.data ?? [];
  const modelCount = (resultsQuery.data ?? []).filter((r) => r.unique_id.startsWith("model.")).length;

  const isInProgress = run?.status === "running" || run?.status === "queued" || run?.status === "starting";

  if (runQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Jobs
        </Link>
        <DetailSkeleton />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="space-y-6">
        <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Jobs
        </Link>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-destructive font-medium">Run not found.</p>
            <p className="text-sm text-muted-foreground mt-1">
              The run with ID &ldquo;{runId}&rdquo; could not be loaded.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href={`/jobs/${run.jobId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Job
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">Run #{run.id}</h2>
            <StatusBadge status={run.status} className="text-sm" />
          </div>
          {run.statusMessage && (
            <p className="text-sm text-muted-foreground">{run.statusMessage}</p>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            className="gap-1.5"
            disabled={triggerRun.isPending}
            onClick={() => triggerRun.mutate({ jobId: run.jobId, cause: `Re-run of #${run.id}` })}
          >
            <Play className="h-3.5 w-3.5" />
            Re-run
          </Button>
          {isInProgress && (
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5"
              disabled={cancelRun.isPending}
              onClick={() => cancelRun.mutate({ runId: run.id })}
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-lg font-bold">{formatDuration(run.duration)}</p>
              <p className="text-[11px] text-muted-foreground">Total Duration</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Timer className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-lg font-bold">{formatDuration(run.queueDuration)}</p>
              <p className="text-[11px] text-muted-foreground">Queue Time</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Cpu className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-lg font-bold">{formatDuration(run.runDuration)}</p>
              <p className="text-[11px] text-muted-foreground">Execution Time</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Zap className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-lg font-bold">{run.dbtVersion}</p>
              <p className="text-[11px] text-muted-foreground">dbt Version</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Git + trigger info */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(run.gitBranch || run.gitSha) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Git Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                {run.gitBranch && (
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-muted-foreground shrink-0" />
                    <dt className="text-muted-foreground">Branch:</dt>
                    <dd className="font-mono">{run.gitBranch}</dd>
                  </div>
                )}
                {run.gitSha && (
                  <div className="flex items-center gap-2">
                    <GitCommit className="h-4 w-4 text-muted-foreground shrink-0" />
                    <dt className="text-muted-foreground">SHA:</dt>
                    <dd className="font-mono">{run.gitSha.slice(0, 8)}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Trigger Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground shrink-0" />
                <dt className="text-muted-foreground">Trigger:</dt>
                <dd>
                  <Badge variant="outline" className="text-xs capitalize">
                    {run.trigger.replace(/_/g, " ")}
                  </Badge>
                </dd>
              </div>
              {run.triggeredBy && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <dt className="text-muted-foreground">By:</dt>
                  <dd>{run.triggeredBy}</dd>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <dt className="text-muted-foreground">Queued:</dt>
                <dd>{new Date(run.queuedAt).toLocaleString()}</dd>
              </div>
              {run.startedAt && (
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-muted-foreground shrink-0" />
                  <dt className="text-muted-foreground">Started:</dt>
                  <dd>{new Date(run.startedAt).toLocaleString()}</dd>
                </div>
              )}
              {run.finishedAt && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <dt className="text-muted-foreground">Finished:</dt>
                  <dd>{new Date(run.finishedAt).toLocaleString()}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Steps */}
      {run.steps.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <RunStepsTimeline steps={run.steps} />
          </CardContent>
        </Card>
      )}

      {/* Models / Artifacts tabs */}
      <Card>
        <Tabs defaultValue="models">
          <CardHeader className="pb-0">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
              <TabsTrigger
                value="models"
                className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Models
                {modelCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                    {modelCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="artifacts"
                className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Artifacts
                {artifacts.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                    {artifacts.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="pt-4">
            <TabsContent value="models" className="mt-0">
              <ModelsTab runId={runId} />
            </TabsContent>

            <TabsContent value="artifacts" className="mt-0">
              {artifactsQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-10 rounded-md bg-muted animate-pulse" />
                  ))}
                </div>
              ) : artifacts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No artifacts available for this run.
                </p>
              ) : (
                <div className="space-y-2">
                  {artifacts.map((artifact) => (
                    <div
                      key={artifact.id}
                      className="flex items-center justify-between rounded-md border px-4 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <FileDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{artifact.fileName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {artifact.type}
                            {artifact.size != null && ` · ${(artifact.size / 1024).toFixed(1)} KB`}
                            {" · "}Generated {formatRelativeTime(artifact.generatedAt)}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                        <FileDown className="h-3 w-3" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Footer */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Parent job:</span>
        <Link href={`/jobs/${run.jobId}`} className="text-primary hover:underline font-medium">
          Job #{run.jobId}
        </Link>
      </div>

      <p className="text-xs text-muted-foreground italic">
        Run history and logs may be retained for a limited time per your dbt Cloud plan.
      </p>

      <ApiSurfaceCallout
        title="Powered by Administrative API v2 — /runs/{id}, /runs/{id}/artifacts"
        endpoints={[
          "GET /api/v2/accounts/{id}/runs/{runId} — run detail with steps",
          "GET /api/v2/accounts/{id}/runs/{runId}/artifacts — list artifacts",
          "GET /api/v2/accounts/{id}/runs/{runId}/artifacts/run_results.json — model results",
          "POST /api/v2/accounts/{id}/runs/{runId}/cancel — cancel a running run",
          "POST /api/v2/accounts/{id}/jobs/{jobId}/run — re-trigger job",
        ]}
      />
    </div>
  );
}

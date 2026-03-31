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
} from "lucide-react";
import { useRun, useArtifacts, useTriggerRun, useCancelRun } from "@/lib/hooks";
import { formatDuration, formatRelativeTime } from "@/lib/utils/format";
import { StatusBadge } from "@/components/shared/status-badge";
import { ApiSurfaceCallout } from "@/components/shared/api-surface-callout";
import { DetailSkeleton } from "@/components/shared/loading-skeleton";
import { RunStepsTimeline } from "@/components/jobs/run-steps-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function RunDetailPage() {
  const params = useParams<{ runId: string }>();
  const runId = params.runId;

  const runQuery = useRun(runId);
  const artifactsQuery = useArtifacts(runId);
  const triggerRun = useTriggerRun();
  const cancelRun = useCancelRun();

  const run = runQuery.data;
  const artifacts = artifactsQuery.data ?? [];

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
      <div className="flex items-center gap-3">
        <Link href={`/jobs/${run.jobId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Job
        </Link>
      </div>

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

      {/* Git info + trigger info */}
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

      {/* Steps section */}
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

      {/* Artifacts section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Artifacts {artifacts.length > 0 && `(${artifacts.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                        {artifact.size != null && ` -- ${(artifact.size / 1024).toFixed(1)} KB`}
                        {" -- "}Generated {formatRelativeTime(artifact.generatedAt)}
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
        </CardContent>
      </Card>

      {/* Link to parent job */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Parent job:</span>
        <Link href={`/jobs/${run.jobId}`} className="text-primary hover:underline font-medium">
          Job #{run.jobId}
        </Link>
      </div>

      {/* Retention note */}
      <p className="text-xs text-muted-foreground italic">
        Run history and logs may be retained for a limited time per your dbt Cloud plan.
      </p>

      {/* API Surface */}
      <ApiSurfaceCallout
        title="Powered by Administrative API v3 -- /runs/{id}, /runs/{id}/artifacts"
        endpoints={[
          "GET /api/v3/accounts/{id}/runs/{runId} -- run detail with steps",
          "GET /api/v3/accounts/{id}/runs/{runId}/artifacts -- list artifacts",
          "GET /api/v3/accounts/{id}/runs/{runId}/artifacts/{path} -- download artifact",
          "POST /api/v3/accounts/{id}/runs/{runId}/cancel -- cancel a running run",
          "POST /api/v3/accounts/{id}/jobs/{jobId}/run -- re-trigger job",
        ]}
      />
    </div>
  );
}

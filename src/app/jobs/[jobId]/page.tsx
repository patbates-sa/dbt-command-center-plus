"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  ExternalLink,
  Calendar,
  GitPullRequest,
  Webhook,
  Settings2,
  Terminal,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useJob, useRuns, useProjects, useEnvironments, useTriggerRun } from "@/lib/hooks";
import { formatDuration, formatRelativeTime } from "@/lib/utils/format";
import { StatusBadge } from "@/components/shared/status-badge";
import { ApiSurfaceCallout } from "@/components/shared/api-surface-callout";
import { DetailSkeleton } from "@/components/shared/loading-skeleton";
import { RunRow } from "@/components/jobs/run-row";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function JobDetailPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;

  const jobQuery = useJob(jobId);
  const runsQuery = useRuns(jobId);
  const projectsQuery = useProjects();
  const environmentsQuery = useEnvironments();
  const triggerRun = useTriggerRun();

  const job = jobQuery.data;
  const runs = runsQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const environments = environmentsQuery.data ?? [];

  const project = useMemo(
    () => projects.find((p) => p.id === job?.projectId),
    [projects, job?.projectId],
  );
  const environment = useMemo(
    () => environments.find((e) => e.id === job?.environmentId),
    [environments, job?.environmentId],
  );

  // Run analytics
  const analytics = useMemo(() => {
    const completedRuns = runs.filter((r) => r.status === "success" || r.status === "error");
    const successRuns = completedRuns.filter((r) => r.status === "success");
    const successRate = completedRuns.length > 0 ? Math.round((successRuns.length / completedRuns.length) * 100) : 0;

    const withDuration = runs.filter((r) => r.duration != null && r.duration > 0);
    const durations = withDuration.map((r) => r.duration!);
    const medianRuntime = durations.length > 0
      ? durations.sort((a, b) => a - b)[Math.floor(durations.length / 2)]
      : 0;
    const avgRuntime = durations.length > 0
      ? durations.reduce((s, d) => s + d, 0) / durations.length
      : 0;
    const minRuntime = durations.length > 0 ? Math.min(...durations) : 0;
    const maxRuntime = durations.length > 0 ? Math.max(...durations) : 0;

    // Chart data (reversed for chronological order)
    const durationChart = [...runs]
      .filter((r) => r.duration != null)
      .reverse()
      .map((r, i) => ({
        index: i + 1,
        duration: Math.round(r.duration ?? 0),
        label: `Run #${r.id}`,
      }));

    const statusChart = [...runs]
      .reverse()
      .map((r, i) => ({
        index: i + 1,
        success: r.status === "success" ? 1 : 0,
        error: r.status === "error" ? 1 : 0,
        other: r.status !== "success" && r.status !== "error" ? 1 : 0,
        label: `Run #${r.id}`,
      }));

    return {
      successRate,
      medianRuntime,
      avgRuntime,
      minRuntime,
      maxRuntime,
      durationChart,
      statusChart,
      completedCount: completedRuns.length,
      successCount: successRuns.length,
    };
  }, [runs]);

  if (jobQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Jobs
        </Link>
        <DetailSkeleton />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="space-y-6">
        <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Jobs
        </Link>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-destructive font-medium">Job not found.</p>
            <p className="text-sm text-muted-foreground mt-1">
              The job with ID &ldquo;{jobId}&rdquo; could not be loaded.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Jobs
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">{job.name}</h2>
            {job.lastRunStatus && <StatusBadge status={job.lastRunStatus} />}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {project && (
              <Badge variant="secondary" className="text-xs">
                {project.name}
              </Badge>
            )}
            {environment && (
              <Badge variant="outline" className="text-xs">
                {environment.name}
              </Badge>
            )}
            <Badge variant={job.state === "active" ? "success" : "secondary"} className="text-xs">
              {job.state}
            </Badge>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            className="gap-1.5"
            disabled={triggerRun.isPending}
            onClick={() => triggerRun.mutate({ jobId: job.id, cause: "Triggered from Command Center" })}
          >
            <Play className="h-3.5 w-3.5" />
            Run Now
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" disabled>
            <ExternalLink className="h-3.5 w-3.5" />
            View in dbt Cloud
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="runs">Run History</TabsTrigger>
          <TabsTrigger value="analytics">Runtime Analytics</TabsTrigger>
        </TabsList>

        {/* ─── Overview Tab ─── */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Metadata */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Job Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 text-sm">
                {job.description && (
                  <>
                    <dt className="text-muted-foreground">Description</dt>
                    <dd>{job.description}</dd>
                  </>
                )}
                <dt className="text-muted-foreground">Project</dt>
                <dd>{project?.name ?? job.projectId}</dd>
                <dt className="text-muted-foreground">Environment</dt>
                <dd>{environment?.name ?? job.environmentId}</dd>
                <dt className="text-muted-foreground">State</dt>
                <dd className="capitalize">{job.state}</dd>
                <dt className="text-muted-foreground">Created</dt>
                <dd>{new Date(job.createdAt).toLocaleString()}</dd>
                <dt className="text-muted-foreground">Updated</dt>
                <dd>{new Date(job.updatedAt).toLocaleString()}</dd>
              </dl>
            </CardContent>
          </Card>

          {/* Triggers */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Trigger Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {job.triggers.schedule && (
                  <Badge variant="outline" className="gap-1.5 py-1">
                    <Calendar className="h-3.5 w-3.5" /> Schedule
                    {job.scheduleCron && (
                      <code className="ml-1 text-[10px] font-mono bg-muted px-1 rounded">
                        {job.scheduleCron}
                      </code>
                    )}
                  </Badge>
                )}
                {job.triggers.githubWebhook && (
                  <Badge variant="outline" className="gap-1.5 py-1">
                    <GitPullRequest className="h-3.5 w-3.5" /> GitHub Webhook
                  </Badge>
                )}
                {job.triggers.gitProviderWebhook && (
                  <Badge variant="outline" className="gap-1.5 py-1">
                    <Webhook className="h-3.5 w-3.5" /> Git Provider Webhook
                  </Badge>
                )}
                {job.triggers.onMerge && (
                  <Badge variant="outline" className="gap-1.5 py-1">
                    <GitPullRequest className="h-3.5 w-3.5" /> On Merge
                  </Badge>
                )}
                {job.triggers.custom && (
                  <Badge variant="outline" className="gap-1.5 py-1">
                    <Terminal className="h-3.5 w-3.5" /> Custom / API
                  </Badge>
                )}
                {!job.triggers.schedule &&
                  !job.triggers.githubWebhook &&
                  !job.triggers.gitProviderWebhook &&
                  !job.triggers.onMerge &&
                  !job.triggers.custom && (
                    <span className="text-sm text-muted-foreground">Manual triggers only</span>
                  )}
              </div>
              {job.nextRunAt && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Next scheduled run: {new Date(job.nextRunAt).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Execute Steps */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Execute Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {job.executeSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[11px] font-medium shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <code className="text-sm font-mono bg-muted rounded px-3 py-1.5 flex-1">
                    {step}
                  </code>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-4 w-4" /> Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 text-sm">
                <dt className="text-muted-foreground">Threads</dt>
                <dd>{job.settings.threads}</dd>
                <dt className="text-muted-foreground">Target Name</dt>
                <dd className="font-mono">{job.settings.targetName}</dd>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Run History Tab ─── */}
        <TabsContent value="runs" className="space-y-4 mt-4">
          {/* Metrics */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{analytics.successRate}%</p>
                <p className="text-xs text-muted-foreground">Success Rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{formatDuration(analytics.medianRuntime)}</p>
                <p className="text-xs text-muted-foreground">Median Runtime</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{runs.length}</p>
                <p className="text-xs text-muted-foreground">Total Runs</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{analytics.successCount}</p>
                <p className="text-xs text-muted-foreground">Successful</p>
              </CardContent>
            </Card>
          </div>

          {/* Run list */}
          {runsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 rounded-md bg-muted animate-pulse" />
              ))}
            </div>
          ) : runs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center">
                <p className="text-sm text-muted-foreground">No runs yet for this job.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {runs.slice(0, 20).map((run) => (
                <RunRow key={run.id} run={run} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Runtime Analytics Tab ─── */}
        <TabsContent value="analytics" className="space-y-4 mt-4">
          {/* Stats row */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{formatDuration(analytics.avgRuntime)}</p>
                <p className="text-xs text-muted-foreground">Average</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{formatDuration(analytics.medianRuntime)}</p>
                <p className="text-xs text-muted-foreground">Median</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{formatDuration(analytics.minRuntime)}</p>
                <p className="text-xs text-muted-foreground">Fastest</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{formatDuration(analytics.maxRuntime)}</p>
                <p className="text-xs text-muted-foreground">Slowest</p>
              </CardContent>
            </Card>
          </div>

          {/* Duration line chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Run Duration Over Time</CardTitle>
              <CardDescription>Duration in seconds for each completed run</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.durationChart.length >= 2 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={analytics.durationChart}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="index" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}s`} />
                    <Tooltip
                      formatter={(value: number) => [`${value}s`, "Duration"]}
                      labelFormatter={(label) => `Run ${label}`}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="duration"
                      stroke="hsl(217, 91%, 60%)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Not enough data to display a chart. At least 2 completed runs are needed.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Success/failure bar chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Success / Failure Distribution</CardTitle>
              <CardDescription>Outcome of each run</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.statusChart.length >= 1 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={analytics.statusChart}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="index" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      labelFormatter={(label) => `Run ${label}`}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="success" stackId="status" fill="hsl(142, 71%, 45%)" name="Success" />
                    <Bar dataKey="error" stackId="status" fill="hsl(0, 84%, 60%)" name="Error" />
                    <Bar dataKey="other" stackId="status" fill="hsl(240, 5%, 64%)" name="Other" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No run data available yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* API Surface */}
      <ApiSurfaceCallout
        title="Powered by Administrative API v3 -- /jobs/{id}, /runs, job triggers"
        endpoints={[
          "GET /api/v3/accounts/{id}/jobs/{jobId} -- job detail",
          "GET /api/v3/accounts/{id}/runs?job_definition_id={jobId} -- run history",
          "POST /api/v3/accounts/{id}/jobs/{jobId}/run -- trigger run",
        ]}
      />
    </div>
  );
}

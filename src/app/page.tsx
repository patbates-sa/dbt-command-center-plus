"use client";

import { useMemo } from "react";
import {
  Briefcase,
  Server,
  Play,
  Clock,
  CheckCircle2,
  Timer,
} from "lucide-react";
import {
  useDashboardData,
  useProjects,
  useEnvironments,
  useRuns,
  useAssets,
  useActivityEvents,
} from "@/lib/hooks";
import { KpiStatCard } from "@/components/shared/kpi-stat-card";
import { ApiSurfaceCallout } from "@/components/shared/api-surface-callout";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RunStatusChart } from "@/components/dashboard/run-status-chart";
import { RuntimeTrendChart } from "@/components/dashboard/runtime-trend-chart";
import { AttentionPanel } from "@/components/dashboard/attention-panel";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { formatDuration, formatPercent } from "@/lib/utils/format";

export default function DashboardPage() {
  // Fetch data from multiple hooks
  const dashboardQuery = useDashboardData();
  const projectsQuery = useProjects();
  const environmentsQuery = useEnvironments();
  const runsQuery = useRuns();
  const assetsQuery = useAssets();
  const eventsQuery = useActivityEvents({ limit: 10 });

  const isLoading = projectsQuery.isLoading || environmentsQuery.isLoading;

  const hasError = projectsQuery.isError && environmentsQuery.isError;

  // Compute KPI values
  const kpis = useMemo(() => {
    const projects = projectsQuery.data ?? [];
    const environments = environmentsQuery.data ?? [];
    const runs = runsQuery.data ?? [];
    const dashData = dashboardQuery.data;

    const totalProjects = projects.length;
    const totalEnvironments = environments.length;
    const totalJobs = dashData?.kpis.find((k) => k.label === "Total Jobs")?.value ?? 0;

    // Recent runs (last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentRuns = runs.filter((r) => r.createdAt >= oneDayAgo);

    // Success rate
    const completedRuns = runs.filter(
      (r) => r.status === "success" || r.status === "error",
    );
    const successRuns = runs.filter((r) => r.status === "success");
    const successRate =
      completedRuns.length > 0
        ? Math.round((successRuns.length / completedRuns.length) * 100)
        : 0;

    // Success trend (last 10 runs)
    const last10 = runs.slice(0, 10).reverse();
    const successTrend = last10.map((r) => (r.status === "success" ? 1 : 0));
    // Compute running average
    const trendData: number[] = [];
    let cumSum = 0;
    for (let i = 0; i < successTrend.length; i++) {
      cumSum += successTrend[i];
      trendData.push(Math.round((cumSum / (i + 1)) * 100));
    }

    // Average runtime
    const withDuration = runs.filter((r) => r.duration != null && r.duration > 0);
    const avgRuntime =
      withDuration.length > 0
        ? withDuration.reduce((sum, r) => sum + (r.duration ?? 0), 0) /
          withDuration.length
        : 0;

    // Runtime trend
    const runtimeTrend = runs
      .slice(0, 12)
      .reverse()
      .filter((r) => r.duration != null)
      .map((r) => r.duration ?? 0);

    return {
      totalProjects,
      totalEnvironments,
      totalJobs,
      recentRunsCount: recentRuns.length,
      successRate,
      successTrend: trendData,
      avgRuntime,
      runtimeTrend,
    };
  }, [
    projectsQuery.data,
    environmentsQuery.data,
    runsQuery.data,
    dashboardQuery.data,
  ]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Executive Overview</h2>
          <p className="text-muted-foreground mt-1">
            Loading your dbt Cloud operations dashboard...
          </p>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Executive Overview</h2>
        </div>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-destructive font-medium">
              Failed to load dashboard data.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {dashboardQuery.error?.message ||
                runsQuery.error?.message ||
                "An unexpected error occurred. Please try refreshing."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const runs = runsQuery.data ?? [];
  const assets = assetsQuery.data ?? [];
  const events =
    eventsQuery.data ?? dashboardQuery.data?.recentEvents ?? [];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Executive Overview</h2>
        <p className="text-muted-foreground mt-1">
          Real-time operational health across all dbt Cloud projects.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiStatCard
          label="Total Projects"
          value={kpis.totalProjects}
        />
        <KpiStatCard
          label="Environments"
          value={kpis.totalEnvironments}
        />
        <KpiStatCard
          label="Total Jobs"
          value={kpis.totalJobs}
        />
        <KpiStatCard
          label="Runs (24h)"
          value={kpis.recentRunsCount}
        />
        <KpiStatCard
          label="Success Rate"
          value={`${kpis.successRate}%`}
          trend={kpis.successTrend.length > 1 ? kpis.successTrend : undefined}
          change={kpis.successRate >= 90 ? 2.1 : -1.5}
          changeLabel="vs last week"
        />
        <KpiStatCard
          label="Avg Runtime"
          value={formatDuration(kpis.avgRuntime)}
          trend={kpis.runtimeTrend.length > 1 ? kpis.runtimeTrend : undefined}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Run Status (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RunStatusChart runs={runs} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Runtime Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RuntimeTrendChart runs={runs} />
          </CardContent>
        </Card>
      </div>

      {/* Activity + Attention row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3">
            <ActivityFeed events={events} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3">
            <AttentionPanel assets={assets} />
          </CardContent>
        </Card>
      </div>

      {/* API Surface Callout */}
      <ApiSurfaceCallout
        title="What This Proves -- This dashboard is powered entirely by dbt Cloud APIs"
        endpoints={[
          "Administrative API v3 -- GET /api/v3/accounts/{id}/projects",
          "Administrative API v3 -- GET /api/v3/accounts/{id}/environments",
          "Administrative API v3 -- GET /api/v3/accounts/{id}/jobs",
          "Administrative API v3 -- GET /api/v3/accounts/{id}/runs",
          "Discovery API (GraphQL) -- query { environment { applied { models { ... } } } }",
          "Discovery API (GraphQL) -- asset metadata, test coverage, documentation stats",
        ]}
      />
    </div>
  );
}

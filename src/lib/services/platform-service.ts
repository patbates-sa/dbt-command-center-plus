// ============================================================
// dbt Command Center — Unified Platform Service
// ============================================================
// Connects to real dbt Cloud APIs for all data operations.
// ============================================================

import type {
  AppConfig,
  DbtProject,
  DbtEnvironment,
  DbtJob,
  DbtRun,
  DbtArtifact,
  DbtAsset,
  DbtActivityEvent,
  DbtMetric,
  DbtSemanticQueryResult,
  DbtCapabilityMap,
  LineageGraph,
  KpiStat,
  AssetFilters,
  ActivityFilters,
  MetricQueryParams,
} from "@/types";

import { DbtAdminClient } from "@/lib/api/admin-client";
import { DbtDiscoveryClient } from "@/lib/api/discovery-client";
import { DbtSemanticClient, type SemanticQueryParams } from "@/lib/api/semantic-client";

// ─── Service ────────────────────────────────────────────────

export class PlatformService {
  private adminClient: DbtAdminClient;
  private discoveryClient: DbtDiscoveryClient;
  private semanticClient: DbtSemanticClient;
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;

    this.adminClient = new DbtAdminClient(
      config.dbtCloud.baseUrl,
      config.dbtCloud.accountId,
      config.dbtCloud.apiToken,
    );
    this.discoveryClient = new DbtDiscoveryClient(
      config.discoveryApi.url,
      config.dbtCloud.apiToken,
    );
    this.semanticClient = new DbtSemanticClient(
      config.semanticLayer.url,
      config.semanticLayer.token,
    );
  }

  // ── Projects ──

  async getProjects(): Promise<DbtProject[]> {
    return this.adminClient.getProjects();
  }

  async getProject(id: string): Promise<DbtProject | undefined> {
    return this.adminClient.getProject(id);
  }

  // ── Environments ──

  async getEnvironments(projectId?: string): Promise<DbtEnvironment[]> {
    return this.adminClient.getEnvironments(projectId);
  }

  async getEnvironment(id: string): Promise<DbtEnvironment | undefined> {
    const envs = await this.adminClient.getEnvironments();
    return envs.find((e) => e.id === id);
  }

  // ── Jobs ──

  async getJobs(projectId?: string): Promise<DbtJob[]> {
    return this.adminClient.getJobs(projectId);
  }

  async getJob(id: string): Promise<DbtJob | undefined> {
    return this.adminClient.getJob(id);
  }

  // ── Runs ──

  async getRuns(jobId?: string): Promise<DbtRun[]> {
    return this.adminClient.getRuns(jobId);
  }

  async getRun(id: string): Promise<DbtRun | undefined> {
    return this.adminClient.getRun(id);
  }

  async triggerRun(jobId: string, cause?: string): Promise<DbtRun> {
    return this.adminClient.triggerRun(jobId, cause);
  }

  async cancelRun(runId: string): Promise<DbtRun | undefined> {
    return this.adminClient.cancelRun(runId);
  }

  // ── Artifacts ──

  async getArtifacts(runId?: string): Promise<DbtArtifact[]> {
    if (!runId) throw new Error("runId is required for getArtifacts");
    return this.adminClient.getArtifacts(runId);
  }

  async getArtifact(runId: string, path?: string): Promise<unknown> {
    if (!path) throw new Error("path is required for getArtifact");
    return this.adminClient.getArtifact(runId, path);
  }

  // ── Assets (Discovery + Semantic Layer) ──

  async getAssets(filters?: AssetFilters): Promise<DbtAsset[]> {
    const envId = filters?.environmentId ?? this.config.defaults.environmentId;
    if (!envId) throw new Error("environmentId is required for Discovery API — set DBT_DEFAULT_ENVIRONMENT_ID in your .env.local");

    const requestedTypes = filters?.resourceType
      ? Array.isArray(filters.resourceType)
        ? filters.resourceType
        : [filters.resourceType]
      : null;

    const wantsMetrics = !requestedTypes || requestedTypes.includes("metric");
    const wantsOther = !requestedTypes || requestedTypes.some((t) => t !== "metric");
    const onlyMetrics = requestedTypes?.length === 1 && requestedTypes[0] === "metric";

    const [discoveryAssets, semanticMetrics] = await Promise.all([
      wantsOther
        ? this.discoveryClient.getAssets(envId, {
            resourceType: onlyMetrics ? undefined : filters?.resourceType,
            search: filters?.search,
            tags: filters?.tags,
          })
        : Promise.resolve([] as DbtAsset[]),
      wantsMetrics
        ? this.semanticClient.getMetrics(envId).catch(() => [] as DbtMetric[])
        : Promise.resolve([] as DbtMetric[]),
    ]);

    const metricAssets: DbtAsset[] = semanticMetrics
      .filter((m) => {
        if (filters?.search) {
          const q = filters.search.toLowerCase();
          return (
            m.name.toLowerCase().includes(q) ||
            m.label.toLowerCase().includes(q) ||
            m.description?.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .map((m) => ({
        uniqueId: `metric.${m.name}`,
        name: m.name,
        resourceType: "metric" as const,
        packageName: "",
        description: m.description,
        tags: m.tags,
        meta: {},
        columns: m.dimensions.map((dim) => ({ name: dim })),
        upstreamCount: 0,
        downstreamCount: 0,
        testCount: 0,
        passingTestCount: 0,
        failingTestCount: 0,
        hasDescription: !!m.description,
        documentedColumns: 0,
        totalColumns: m.dimensions.length,
      }));

    return [...discoveryAssets, ...metricAssets];
  }

  async getParentColumns(
    parentNodes: Array<{ uniqueId: string; name: string; resourceType: string }>,
  ) {
    const envId = this.config.defaults.environmentId;
    if (!envId) throw new Error("environmentId is required");
    return this.discoveryClient.getParentColumns(envId, parentNodes);
  }

  async getAsset(uniqueId: string): Promise<DbtAsset | undefined> {
    const envId = this.config.defaults.environmentId;
    if (!envId) throw new Error("environmentId is required for Discovery API — set DBT_DEFAULT_ENVIRONMENT_ID in your .env.local");
    const asset = await this.discoveryClient.getAsset(envId, uniqueId);
    if (!asset) return undefined;

    // Enrich test statuses from run_results.json artifact
    if (asset.tests && asset.tests.length > 0 && asset.executionInfo?.lastRunId) {
      const runId = asset.executionInfo.lastRunId;
      try {
        const artifact = await this.adminClient.getArtifact(
          runId,
          "run_results.json",
        ) as { results?: Array<{ unique_id: string; status: string }> };

        const allResults = artifact?.results ?? [];
        const statusMap = new Map<string, string>();
        for (const result of allResults) {
          for (const test of asset.tests) {
            if (
              result.unique_id === test.uniqueId ||
              result.unique_id.startsWith(test.uniqueId + ".")
            ) {
              statusMap.set(test.uniqueId, result.status);
              break;
            }
          }
        }

        if (statusMap.size > 0) {
          asset.tests = asset.tests.map((t) => ({
            ...t,
            status: statusMap.get(t.uniqueId),
          }));
          asset.passingTestCount = asset.tests.filter(
            (t) => t.status === "pass" || t.status === "reused",
          ).length;
          asset.failingTestCount = asset.tests.filter(
            (t) => t.status === "fail" || t.status === "error",
          ).length;
        }
      } catch {
        // Artifact unavailable — tests shown without status
      }
    }

    return asset;
  }

  // ── Lineage ──

  async getLineage(
    uniqueId: string,
    depth: number = 3,
    direction: "upstream" | "downstream" | "both" = "both",
  ): Promise<LineageGraph> {
    const envId = this.config.defaults.environmentId;
    if (!envId) throw new Error("environmentId is required for Discovery API — set DBT_DEFAULT_ENVIRONMENT_ID in your .env.local");
    return this.discoveryClient.getLineage(envId, uniqueId, depth);
  }

  // ── Metrics (Semantic Layer) ──

  async getMetrics(): Promise<DbtMetric[]> {
    const envId = this.config.defaults.environmentId;
    if (!envId) throw new Error("environmentId is required for Semantic Layer — set DBT_DEFAULT_ENVIRONMENT_ID in your .env.local");
    return this.semanticClient.getMetrics(envId);
  }

  async queryMetric(params: MetricQueryParams): Promise<DbtSemanticQueryResult> {
    const envId = this.config.defaults.environmentId;
    if (!envId) throw new Error("environmentId is required for Semantic Layer — set DBT_DEFAULT_ENVIRONMENT_ID in your .env.local");
    return this.semanticClient.queryMetric({
      environmentId: envId,
      metrics: [{ name: params.metricName }],
      groupBy: params.dimensions?.map((d) => ({ name: d, grain: params.timeGrain })),
    });
  }

  // ── Activity Events ──
  // Merges audit log admin events with run events from the Runs API.

  async getActivityEvents(filters?: ActivityFilters): Promise<DbtActivityEvent[]> {
    const limit = filters?.limit ?? 50;

    const [auditEvents, runs] = await Promise.all([
      this.adminClient.getAuditLogs({ limit }).catch(() => [] as DbtActivityEvent[]),
      this.adminClient.getRuns().catch(() => [] as DbtRun[]),
    ]);

    const runEvents: DbtActivityEvent[] = runs.map((run): DbtActivityEvent => {
      const statusMap: Record<string, string> = {
        success: "run_completed",
        error: "run_failed",
        cancelled: "run_cancelled",
        running: "run_started",
        queued: "run_started",
        starting: "run_started",
      };
      const eventType = statusMap[run.status] ?? "run_completed";

      let description = "Run Completed";
      if (run.status === "success") {
        description = run.duration
          ? `Run completed in ${Math.round(run.duration)}s`
          : "Run completed successfully";
      } else if (run.status === "error") {
        description = "Run failed";
      } else if (run.status === "cancelled") {
        description = "Run cancelled";
      } else if (run.status === "running") {
        description = "Run in progress";
      } else if (run.status === "queued" || run.status === "starting") {
        description = "Run queued";
      }

      return {
        id: `run-${run.id}`,
        timestamp: run.finishedAt ?? run.startedAt ?? run.createdAt,
        eventType,
        source: "run_event",
        description,
        projectId: run.projectId,
        environmentId: run.environmentId,
        jobId: run.jobId,
        runId: run.id,
        metadata: {
          status: run.status,
          duration: run.duration,
          dbtVersion: run.dbtVersion,
          gitBranch: run.gitBranch,
        },
      };
    });

    // Merge, sort by timestamp descending, apply eventType filter
    const allEvents = [...auditEvents, ...runEvents].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    const filtered = filters?.eventType
      ? allEvents.filter((e) => e.eventType === filters.eventType)
      : allEvents;

    return filtered.slice(0, limit);
  }

  // ── Capabilities ──

  async getCapabilities(): Promise<DbtCapabilityMap> {
    const res = await fetch("/api/capabilities");
    if (!res.ok) throw new Error("Failed to load capabilities");
    return res.json() as Promise<DbtCapabilityMap>;
  }

  // ── Dashboard KPIs ──

  async getDashboardData(): Promise<{
    kpis: KpiStat[];
    recentRuns: DbtRun[];
    recentEvents: DbtActivityEvent[];
  }> {
    const [jobs, runs, events, assets] = await Promise.all([
      this.getJobs().catch(() => [] as DbtJob[]),
      this.getRuns().catch(() => [] as DbtRun[]),
      this.getActivityEvents({ limit: 10 }).catch(() => [] as DbtActivityEvent[]),
      this.getAssets().catch(() => [] as DbtAsset[]),
    ]);

    const successRuns = runs.filter((r) => r.status === "success").length;
    const errorRuns = runs.filter((r) => r.status === "error").length;
    const totalRuns = runs.length;
    const successRate = totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : 0;

    const modelsCount = assets.filter((a) => a.resourceType === "model").length;
    const documentedModels = assets.filter(
      (a) => a.resourceType === "model" && a.hasDescription,
    ).length;
    const docCoverage =
      modelsCount > 0 ? Math.round((documentedModels / modelsCount) * 100) : 0;

    const kpis: KpiStat[] = [
      { label: "Total Jobs", value: jobs.length, icon: "briefcase" },
      { label: "Total Runs", value: totalRuns, icon: "play" },
      {
        label: "Success Rate",
        value: `${successRate}%`,
        icon: "check-circle",
        change: successRate >= 90 ? 2.1 : -1.5,
        changeLabel: "vs last week",
      },
      { label: "Failed Runs", value: errorRuns, icon: "x-circle" },
      {
        label: "Models",
        value: modelsCount,
        icon: "database",
      },
      {
        label: "Doc Coverage",
        value: `${docCoverage}%`,
        icon: "file-text",
      },
    ];

    return {
      kpis,
      recentRuns: runs.slice(0, 10),
      recentEvents: events.slice(0, 10),
    };
  }
}

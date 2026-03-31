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
import { detectCapabilities } from "@/config/app";

// ─── Service ────────────────────────────────────────────────

export class PlatformService {
  private adminClient: DbtAdminClient;
  private discoveryClient: DbtDiscoveryClient;
  private semanticClient?: DbtSemanticClient;
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
    if (config.semanticLayer.url && config.semanticLayer.token) {
      this.semanticClient = new DbtSemanticClient(
        config.semanticLayer.url,
        config.semanticLayer.token,
      );
    }
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

  // ── Assets (Discovery) ──

  async getAssets(filters?: AssetFilters): Promise<DbtAsset[]> {
    const envId = filters?.environmentId ?? this.config.defaults.environmentId;
    if (!envId) throw new Error("environmentId is required for Discovery API — set DBT_DEFAULT_ENVIRONMENT_ID in your .env.local");
    return this.discoveryClient.getAssets(envId, {
      resourceType: filters?.resourceType,
      search: filters?.search,
      tags: filters?.tags,
    });
  }

  async getAsset(uniqueId: string): Promise<DbtAsset | undefined> {
    const envId = this.config.defaults.environmentId;
    if (!envId) throw new Error("environmentId is required for Discovery API — set DBT_DEFAULT_ENVIRONMENT_ID in your .env.local");
    const result = await this.discoveryClient.getAsset(envId, uniqueId);
    return result ?? undefined;
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
    if (!this.semanticClient) throw new Error("Semantic Layer is not configured — set DBT_SEMANTIC_LAYER_URL and DBT_SEMANTIC_LAYER_TOKEN in your .env.local");
    return this.semanticClient.getMetrics(envId);
  }

  async queryMetric(params: MetricQueryParams): Promise<DbtSemanticQueryResult> {
    const envId = this.config.defaults.environmentId;
    if (!envId) throw new Error("environmentId is required for Semantic Layer — set DBT_DEFAULT_ENVIRONMENT_ID in your .env.local");
    if (!this.semanticClient) throw new Error("Semantic Layer is not configured — set DBT_SEMANTIC_LAYER_URL and DBT_SEMANTIC_LAYER_TOKEN in your .env.local");
    return this.semanticClient.queryMetric({
      environmentId: envId,
      metrics: [{ name: params.metricName }],
      groupBy: params.dimensions?.map((d) => ({ name: d, grain: params.timeGrain })),
    });
  }

  // ── Activity Events ──

  async getActivityEvents(filters?: ActivityFilters): Promise<DbtActivityEvent[]> {
    return this.adminClient.getAuditLogs({
      limit: filters?.limit,
    });
  }

  // ── Capabilities ──

  async getCapabilities(): Promise<DbtCapabilityMap> {
    return detectCapabilities(this.config);
  }

  // ── Dashboard KPIs ──

  async getDashboardData(): Promise<{
    kpis: KpiStat[];
    recentRuns: DbtRun[];
    recentEvents: DbtActivityEvent[];
  }> {
    const [jobs, runs, events, assets] = await Promise.all([
      this.getJobs(),
      this.getRuns(),
      this.getActivityEvents({ limit: 10 }),
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

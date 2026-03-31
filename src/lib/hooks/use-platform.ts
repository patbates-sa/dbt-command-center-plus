// ============================================================
// dbt Command Center — React Query Hooks + Platform Context
// ============================================================

"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import React from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";

import type {
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
} from "@/types";
import type { AssetFilters, ActivityFilters, MetricQueryParams } from "@/types";
import { PlatformService } from "@/lib/services/platform-service";

// ─── Context ────────────────────────────────────────────────

const PlatformContext = createContext<PlatformService | null>(null);

export interface PlatformProviderProps {
  service: PlatformService;
  children: ReactNode;
}

export function PlatformProvider({ service, children }: PlatformProviderProps) {
  return React.createElement(
    PlatformContext.Provider,
    { value: service },
    children,
  );
}

function usePlatformService(): PlatformService {
  const ctx = useContext(PlatformContext);
  if (!ctx) {
    throw new Error(
      "usePlatformService must be used within a <PlatformProvider>. " +
        "Wrap your component tree with PlatformProvider.",
    );
  }
  return ctx;
}

// ─── Query key factory ──────────────────────────────────────

const keys = {
  dashboard: ["dashboard"] as const,
  projects: ["projects"] as const,
  project: (id: string) => ["projects", id] as const,
  environments: (projectId?: string) => ["environments", { projectId }] as const,
  jobs: (projectId?: string) => ["jobs", { projectId }] as const,
  job: (id: string) => ["jobs", id] as const,
  runs: (jobId?: string) => ["runs", { jobId }] as const,
  run: (id: string) => ["runs", id] as const,
  assets: (filters?: AssetFilters) => ["assets", filters ?? {}] as const,
  asset: (uniqueId: string) => ["assets", uniqueId] as const,
  lineage: (uniqueId: string, depth?: number, direction?: string) =>
    ["lineage", uniqueId, { depth, direction }] as const,
  metrics: ["metrics"] as const,
  metricQuery: (params: MetricQueryParams) => ["metricQuery", params] as const,
  activityEvents: (filters?: ActivityFilters) => ["activityEvents", filters ?? {}] as const,
  capabilities: ["capabilities"] as const,
  artifacts: (runId: string) => ["artifacts", runId] as const,
};

// ─── Hooks ──────────────────────────────────────────────────

export function useDashboardData(): UseQueryResult<{
  kpis: KpiStat[];
  recentRuns: DbtRun[];
  recentEvents: DbtActivityEvent[];
}> {
  const svc = usePlatformService();
  return useQuery({
    queryKey: keys.dashboard,
    queryFn: () => svc.getDashboardData(),
    staleTime: 30_000,
  });
}

export function useProjects(): UseQueryResult<DbtProject[]> {
  const svc = usePlatformService();
  return useQuery({
    queryKey: keys.projects,
    queryFn: () => svc.getProjects(),
    staleTime: 60_000,
  });
}

export function useEnvironments(projectId?: string): UseQueryResult<DbtEnvironment[]> {
  const svc = usePlatformService();
  return useQuery({
    queryKey: keys.environments(projectId),
    queryFn: () => svc.getEnvironments(projectId),
    staleTime: 60_000,
  });
}

export function useJobs(projectId?: string): UseQueryResult<DbtJob[]> {
  const svc = usePlatformService();
  return useQuery({
    queryKey: keys.jobs(projectId),
    queryFn: () => svc.getJobs(projectId),
    staleTime: 30_000,
  });
}

export function useJob(id: string): UseQueryResult<DbtJob | undefined> {
  const svc = usePlatformService();
  return useQuery({
    queryKey: keys.job(id),
    queryFn: () => svc.getJob(id),
    enabled: !!id,
  });
}

export function useRuns(jobId?: string): UseQueryResult<DbtRun[]> {
  const svc = usePlatformService();
  return useQuery({
    queryKey: keys.runs(jobId),
    queryFn: () => svc.getRuns(jobId),
    staleTime: 15_000,
  });
}

export function useRun(id: string): UseQueryResult<DbtRun | undefined> {
  const svc = usePlatformService();
  return useQuery({
    queryKey: keys.run(id),
    queryFn: () => svc.getRun(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const run = query.state.data;
      // Auto-refresh while the run is in-progress
      if (run && (run.status === "running" || run.status === "queued")) {
        return 5_000;
      }
      return false;
    },
  });
}

export function useAssets(filters?: AssetFilters): UseQueryResult<DbtAsset[]> {
  const svc = usePlatformService();
  return useQuery({
    queryKey: keys.assets(filters),
    queryFn: () => svc.getAssets(filters),
    staleTime: 60_000,
  });
}

export function useAsset(uniqueId: string): UseQueryResult<DbtAsset | undefined> {
  const svc = usePlatformService();
  return useQuery({
    queryKey: keys.asset(uniqueId),
    queryFn: () => svc.getAsset(uniqueId),
    enabled: !!uniqueId,
  });
}

export function useLineage(
  uniqueId: string,
  depth?: number,
  direction?: "upstream" | "downstream" | "both",
): UseQueryResult<LineageGraph> {
  const svc = usePlatformService();
  return useQuery({
    queryKey: keys.lineage(uniqueId, depth, direction),
    queryFn: () => svc.getLineage(uniqueId, depth, direction),
    enabled: !!uniqueId,
    staleTime: 120_000,
  });
}

export function useMetrics(): UseQueryResult<DbtMetric[]> {
  const svc = usePlatformService();
  return useQuery({
    queryKey: keys.metrics,
    queryFn: () => svc.getMetrics(),
    staleTime: 60_000,
  });
}

export function useMetricQuery(
  params: MetricQueryParams,
): UseQueryResult<DbtSemanticQueryResult> {
  const svc = usePlatformService();
  return useQuery({
    queryKey: keys.metricQuery(params),
    queryFn: () => svc.queryMetric(params),
    enabled: !!params.metricName,
    staleTime: 30_000,
  });
}

export function useActivityEvents(
  filters?: ActivityFilters,
): UseQueryResult<DbtActivityEvent[]> {
  const svc = usePlatformService();
  return useQuery({
    queryKey: keys.activityEvents(filters),
    queryFn: () => svc.getActivityEvents(filters),
    staleTime: 15_000,
  });
}

export function useCapabilities(): UseQueryResult<DbtCapabilityMap> {
  const svc = usePlatformService();
  return useQuery({
    queryKey: keys.capabilities,
    queryFn: () => svc.getCapabilities(),
    staleTime: 300_000,
  });
}

export function useArtifacts(runId: string): UseQueryResult<DbtArtifact[]> {
  const svc = usePlatformService();
  return useQuery({
    queryKey: keys.artifacts(runId),
    queryFn: () => svc.getArtifacts(runId),
    enabled: !!runId,
  });
}

// ─── Mutations ──────────────────────────────────────────────

export function useTriggerRun(): UseMutationResult<
  DbtRun,
  Error,
  { jobId: string; cause?: string }
> {
  const svc = usePlatformService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ jobId, cause }: { jobId: string; cause?: string }) =>
      svc.triggerRun(jobId, cause),
    onSuccess: (_data, variables) => {
      // Invalidate runs so lists refresh
      queryClient.invalidateQueries({ queryKey: keys.runs(variables.jobId) });
      queryClient.invalidateQueries({ queryKey: keys.runs() });
      queryClient.invalidateQueries({ queryKey: keys.dashboard });
    },
  });
}

export function useCancelRun(): UseMutationResult<
  DbtRun | undefined,
  Error,
  { runId: string }
> {
  const svc = usePlatformService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ runId }: { runId: string }) => svc.cancelRun(runId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: keys.run(variables.runId) });
      queryClient.invalidateQueries({ queryKey: keys.runs() });
      queryClient.invalidateQueries({ queryKey: keys.dashboard });
    },
  });
}

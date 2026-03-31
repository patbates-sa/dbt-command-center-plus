// ============================================================
// dbt Command Center — Domain Types
// ============================================================

// --- Enums & Literals ---

export type RunStatus =
  | "queued"
  | "starting"
  | "running"
  | "success"
  | "error"
  | "cancelled"
  | "skipped";

export type ResourceType =
  | "model"
  | "source"
  | "exposure"
  | "metric"
  | "semantic_model"
  | "test"
  | "seed"
  | "snapshot";

export type MaterializationType =
  | "table"
  | "view"
  | "incremental"
  | "ephemeral"
  | "materialized_view"
  | "seed"
  | "snapshot";

export type EnvironmentType = "development" | "staging" | "production" | "deployment";

export type JobTriggerType = "schedule" | "github_pull_request" | "api" | "manual" | "webhook";

export type TestType = "schema" | "data" | "unit" | "singular";

export type Capability =
  | "admin_api"
  | "discovery_api"
  | "semantic_layer"
  | "audit_logs"
  | "webhooks"
  | "job_triggers"
  | "artifacts";

// --- Core Domain Models ---

export interface DbtProject {
  id: string;
  name: string;
  accountId: string;
  repositoryUrl?: string;
  createdAt: string;
  updatedAt: string;
  description?: string;
  state: "active" | "inactive" | "deleted";
}

export interface DbtEnvironment {
  id: string;
  projectId: string;
  name: string;
  type: EnvironmentType;
  dbtVersion: string;
  targetName?: string;
  useCustomBranch: boolean;
  customBranch?: string;
  credentials?: DbtConnectionSummary;
  createdAt: string;
  updatedAt: string;
}

export interface DbtConnectionSummary {
  id: string;
  type: string;
  name: string;
  database?: string;
  schema?: string;
  state: "active" | "inactive";
  // Sensitive fields are intentionally omitted
}

export interface DbtJob {
  id: string;
  projectId: string;
  environmentId: string;
  name: string;
  description?: string;
  executeSteps: string[];
  triggers: {
    schedule: boolean;
    githubWebhook: boolean;
    gitProviderWebhook: boolean;
    onMerge: boolean;
    custom: boolean;
  };
  scheduleCron?: string;
  settings: {
    threads: number;
    targetName: string;
  };
  state: "active" | "inactive";
  nextRunAt?: string;
  lastRunAt?: string;
  lastRunStatus?: RunStatus;
  recentRuns: DbtRunSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface DbtRun {
  id: string;
  jobId: string;
  projectId: string;
  environmentId: string;
  status: RunStatus;
  statusMessage?: string;
  trigger: JobTriggerType;
  triggeredBy?: string;
  gitSha?: string;
  gitBranch?: string;
  dbtVersion: string;
  queuedAt: string;
  startedAt?: string;
  finishedAt?: string;
  duration?: number;
  queueDuration?: number;
  runDuration?: number;
  steps: DbtRunStep[];
  artifactIds: string[];
  createdAt: string;
}

export interface DbtRunSummary {
  id: string;
  status: RunStatus;
  duration?: number;
  finishedAt?: string;
  createdAt: string;
}

export interface DbtRunStep {
  id: string;
  index: number;
  name: string;
  status: RunStatus;
  duration?: number;
  logs?: string;
  truncatedLogs?: boolean;
}

export interface DbtArtifact {
  id: string;
  runId: string;
  jobId: string;
  projectId: string;
  type: string;
  fileName: string;
  size?: number;
  generatedAt: string;
  parsedSummary?: ArtifactSummary;
}

export interface ArtifactSummary {
  totalNodes?: number;
  successNodes?: number;
  errorNodes?: number;
  skippedNodes?: number;
  warningNodes?: number;
  dbtVersion?: string;
  invocationId?: string;
  elapsedTime?: number;
  metadata?: Record<string, string | number | boolean>;
}

// --- Discovery / Catalog Types ---

export interface DbtAsset {
  uniqueId: string;
  name: string;
  resourceType: ResourceType;
  packageName: string;
  description?: string;
  schema?: string;
  database?: string;
  tags: string[];
  meta: Record<string, unknown>;
  owner?: string;
  group?: string;
  materialization?: MaterializationType;
  filePath?: string;
  rawCode?: string;
  compiledCode?: string;
  columns: DbtColumn[];
  // Execution metadata
  executionInfo?: AssetExecutionInfo;
  // Relationship counts
  upstreamCount: number;
  downstreamCount: number;
  // Test info
  testCount: number;
  passingTestCount: number;
  failingTestCount: number;
  // Documentation
  hasDescription: boolean;
  documentedColumns: number;
  totalColumns: number;
  // State
  definedInEnvironmentId?: string;
  appliedInEnvironmentId?: string;
}

export interface DbtColumn {
  name: string;
  description?: string;
  type?: string;
  meta?: Record<string, unknown>;
  tags?: string[];
}

export interface AssetExecutionInfo {
  lastRunAt?: string;
  lastRunStatus?: RunStatus;
  lastRunDuration?: number;
  lastRunId?: string;
  executionCount?: number;
  averageDuration?: number;
  recentDurations?: number[];
}

export interface DbtExposure {
  uniqueId: string;
  name: string;
  type: "dashboard" | "notebook" | "analysis" | "ml" | "application";
  description?: string;
  owner: { name: string; email?: string };
  url?: string;
  dependsOn: string[];
  tags: string[];
}

export interface DbtMetric {
  uniqueId: string;
  name: string;
  label: string;
  description?: string;
  type: string;
  filter?: string;
  dimensions: string[];
  entities?: string[];
  timeGrains?: string[];
  tags: string[];
  meta?: Record<string, unknown>;
}

export interface DbtSemanticQueryResult {
  queryId: string;
  status: "pending" | "running" | "success" | "error";
  columns: string[];
  rows: Record<string, string | number | null>[];
  totalRows: number;
  executionTimeMs?: number;
  generatedSql?: string;
}

// --- Lineage Types ---

export interface LineageNode {
  id: string;
  uniqueId: string;
  name: string;
  resourceType: ResourceType;
  materialization?: MaterializationType;
  schema?: string;
  database?: string;
  status?: RunStatus;
  lastRunDuration?: number;
  hasDescription: boolean;
  testCount: number;
  failingTestCount: number;
}

export interface LineageEdge {
  source: string;
  target: string;
}

export interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
}

// --- Activity / Audit ---

export interface DbtActivityEvent {
  id: string;
  timestamp: string;
  eventType: string;
  source: "admin_api" | "webhook" | "audit_log" | "run_event";
  actor?: string;
  projectId?: string;
  environmentId?: string;
  jobId?: string;
  runId?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

// --- Capability Detection ---

export interface DbtCapabilityMap {
  adminApi: boolean;
  discoveryApi: boolean;
  semanticLayer: boolean;
  auditLogs: boolean;
  webhooks: boolean;
  jobTriggers: boolean;
  artifacts: boolean;
  stateComparison: boolean;
}

// --- App Config ---

export interface AppConfig {
  dbtCloud: {
    baseUrl: string;
    accountId: string;
    apiToken: string;
  };
  discoveryApi: {
    url: string;
  };
  semanticLayer: {
    url: string;
    token: string;
  };
  defaults: {
    projectId?: string;
    environmentId?: string;
  };
  webhook?: {
    secret: string;
  };
}

// --- UI / View Models ---

export interface KpiStat {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: string;
  trend?: number[];
}

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

// --- Filter Types ---

export interface AssetFilters {
  resourceType?: ResourceType | ResourceType[];
  search?: string;
  tags?: string[];
  projectId?: string;
  environmentId?: string;
  hasDescription?: boolean;
  materialization?: string;
}

export interface ActivityFilters {
  eventType?: string;
  projectId?: string;
  environmentId?: string;
  jobId?: string;
  source?: string;
  limit?: number;
}

export interface MetricQueryParams {
  metricName: string;
  dimensions?: string[];
  timeGrain?: string;
  filters?: Record<string, string>;
}

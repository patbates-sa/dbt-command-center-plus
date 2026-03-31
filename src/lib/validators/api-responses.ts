// ============================================================
// dbt Command Center — API Response Validators (Zod)
// ============================================================

import { z } from "zod";

// --- Administrative API v3 Schemas ---

export const AdminProjectSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string(),
  account_id: z.union([z.string(), z.number()]).transform(String),
  repository_url: z.string().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  description: z.string().optional().nullable(),
  state: z.enum(["active", "inactive", "deleted"]).default("active"),
});

export const AdminEnvironmentSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  project_id: z.union([z.string(), z.number()]).transform(String),
  name: z.string(),
  type: z.enum(["development", "staging", "production", "deployment"]),
  dbt_version: z.string().default("latest"),
  target_name: z.string().optional().nullable(),
  use_custom_branch: z.boolean().default(false),
  custom_branch: z.string().optional().nullable(),
  credentials: z
    .object({
      id: z.union([z.string(), z.number()]).transform(String),
      type: z.string(),
      name: z.string(),
      database: z.string().optional().nullable(),
      schema: z.string().optional().nullable(),
      state: z.enum(["active", "inactive"]).default("active"),
    })
    .optional()
    .nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const AdminJobSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  project_id: z.union([z.string(), z.number()]).transform(String),
  environment_id: z.union([z.string(), z.number()]).transform(String),
  name: z.string(),
  description: z.string().optional().nullable(),
  execute_steps: z.array(z.string()).default([]),
  triggers: z
    .object({
      schedule: z.boolean().default(false),
      github_webhook: z.boolean().default(false),
      git_provider_webhook: z.boolean().default(false),
      on_merge: z.boolean().default(false),
      custom: z.boolean().default(false),
    })
    .default({}),
  schedule: z
    .object({
      cron: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  settings: z
    .object({
      threads: z.number().default(4),
      target_name: z.string().default("default"),
    })
    .default({}),
  state: z.enum(["active", "inactive"]).default("active"),
  next_run_at: z.string().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const AdminRunSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  job_id: z.union([z.string(), z.number()]).transform(String),
  project_id: z.union([z.string(), z.number()]).transform(String),
  environment_id: z.union([z.string(), z.number()]).transform(String),
  status: z.enum([
    "queued",
    "starting",
    "running",
    "success",
    "error",
    "cancelled",
    "skipped",
  ]),
  status_message: z.string().optional().nullable(),
  trigger: z
    .enum(["schedule", "github_pull_request", "api", "manual", "webhook"])
    .default("manual"),
  triggered_by: z.string().optional().nullable(),
  git_sha: z.string().optional().nullable(),
  git_branch: z.string().optional().nullable(),
  dbt_version: z.string().default("latest"),
  queued_at: z.string(),
  started_at: z.string().optional().nullable(),
  finished_at: z.string().optional().nullable(),
  duration: z.number().optional().nullable(),
  queue_duration: z.number().optional().nullable(),
  run_duration: z.number().optional().nullable(),
  run_steps: z
    .array(
      z.object({
        id: z.union([z.string(), z.number()]).transform(String),
        index: z.number(),
        name: z.string(),
        status: z.enum([
          "queued",
          "starting",
          "running",
          "success",
          "error",
          "cancelled",
          "skipped",
        ]),
        duration: z.number().optional().nullable(),
        logs: z.string().optional().nullable(),
        truncated_logs: z.boolean().optional().default(false),
      })
    )
    .default([]),
  artifact_ids: z.array(z.string()).default([]),
  created_at: z.string(),
});

export const AdminArtifactSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  run_id: z.union([z.string(), z.number()]).transform(String),
  job_id: z.union([z.string(), z.number()]).transform(String),
  project_id: z.union([z.string(), z.number()]).transform(String),
  type: z.string(),
  file_name: z.string(),
  size: z.number().optional().nullable(),
  generated_at: z.string(),
  parsed_summary: z
    .object({
      total_nodes: z.number().optional().nullable(),
      success_nodes: z.number().optional().nullable(),
      error_nodes: z.number().optional().nullable(),
      skipped_nodes: z.number().optional().nullable(),
      warning_nodes: z.number().optional().nullable(),
      dbt_version: z.string().optional().nullable(),
      invocation_id: z.string().optional().nullable(),
      elapsed_time: z.number().optional().nullable(),
      metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().nullable(),
    })
    .optional()
    .nullable(),
});

// --- Discovery API Schema (simplified) ---

export const DiscoveryAssetSchema = z.object({
  uniqueId: z.string(),
  name: z.string(),
  resourceType: z.enum([
    "model",
    "source",
    "exposure",
    "metric",
    "semantic_model",
    "test",
    "seed",
    "snapshot",
  ]),
  packageName: z.string().default(""),
  description: z.string().optional().nullable(),
  schema: z.string().optional().nullable(),
  database: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  meta: z.record(z.unknown()).default({}),
  owner: z.string().optional().nullable(),
  group: z.string().optional().nullable(),
  materialization: z
    .enum([
      "table",
      "view",
      "incremental",
      "ephemeral",
      "materialized_view",
      "seed",
      "snapshot",
    ])
    .optional()
    .nullable(),
  filePath: z.string().optional().nullable(),
  rawCode: z.string().optional().nullable(),
  compiledCode: z.string().optional().nullable(),
  columns: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional().nullable(),
        type: z.string().optional().nullable(),
        meta: z.record(z.unknown()).optional().nullable(),
        tags: z.array(z.string()).optional().default([]),
      })
    )
    .default([]),
  executionInfo: z
    .object({
      lastRunAt: z.string().optional().nullable(),
      lastRunStatus: z
        .enum([
          "queued",
          "starting",
          "running",
          "success",
          "error",
          "cancelled",
          "skipped",
        ])
        .optional()
        .nullable(),
      lastRunDuration: z.number().optional().nullable(),
      lastRunId: z.string().optional().nullable(),
      executionCount: z.number().optional().nullable(),
      averageDuration: z.number().optional().nullable(),
      recentDurations: z.array(z.number()).optional().default([]),
    })
    .optional()
    .nullable(),
  upstreamCount: z.number().default(0),
  downstreamCount: z.number().default(0),
  testCount: z.number().default(0),
  passingTestCount: z.number().default(0),
  failingTestCount: z.number().default(0),
  hasDescription: z.boolean().default(false),
  documentedColumns: z.number().default(0),
  totalColumns: z.number().default(0),
  definedInEnvironmentId: z.string().optional().nullable(),
  appliedInEnvironmentId: z.string().optional().nullable(),
});

// --- Semantic Layer API Schema ---

export const SemanticMetricSchema = z.object({
  uniqueId: z.string(),
  name: z.string(),
  label: z.string(),
  description: z.string().optional().nullable(),
  type: z.string(),
  filter: z.string().optional().nullable(),
  dimensions: z.array(z.string()).default([]),
  entities: z.array(z.string()).optional().default([]),
  timeGrains: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).default([]),
  meta: z.record(z.unknown()).optional().nullable(),
});

// --- Type Exports ---

export type AdminProject = z.infer<typeof AdminProjectSchema>;
export type AdminEnvironment = z.infer<typeof AdminEnvironmentSchema>;
export type AdminJob = z.infer<typeof AdminJobSchema>;
export type AdminRun = z.infer<typeof AdminRunSchema>;
export type AdminArtifact = z.infer<typeof AdminArtifactSchema>;
export type DiscoveryAsset = z.infer<typeof DiscoveryAssetSchema>;
export type SemanticMetric = z.infer<typeof SemanticMetricSchema>;

// --- Validation Functions ---

function createValidator<T>(schema: z.ZodType<T>, label: string) {
  return (data: unknown): T => {
    const result = schema.safeParse(data);
    if (!result.success) {
      console.error(
        `[Validator] ${label} validation failed:`,
        result.error.flatten()
      );
      throw new Error(
        `Invalid ${label} response: ${result.error.issues.map((i) => i.message).join(", ")}`
      );
    }
    return result.data;
  };
}

function createArrayValidator<T>(schema: z.ZodType<T>, label: string) {
  return (data: unknown): T[] => {
    if (!Array.isArray(data)) {
      throw new Error(`Expected array for ${label}, received ${typeof data}`);
    }
    return data.map((item, index) => {
      const result = schema.safeParse(item);
      if (!result.success) {
        console.warn(
          `[Validator] ${label}[${index}] validation failed, skipping:`,
          result.error.flatten()
        );
        return null;
      }
      return result.data;
    }).filter((item): item is T => item !== null);
  };
}

export const validateProject = createValidator(AdminProjectSchema, "Project");
export const validateProjects = createArrayValidator(AdminProjectSchema, "Project");

export const validateEnvironment = createValidator(AdminEnvironmentSchema, "Environment");
export const validateEnvironments = createArrayValidator(AdminEnvironmentSchema, "Environment");

export const validateJob = createValidator(AdminJobSchema, "Job");
export const validateJobs = createArrayValidator(AdminJobSchema, "Job");

export const validateRun = createValidator(AdminRunSchema, "Run");
export const validateRuns = createArrayValidator(AdminRunSchema, "Run");

export const validateArtifact = createValidator(AdminArtifactSchema, "Artifact");
export const validateArtifacts = createArrayValidator(AdminArtifactSchema, "Artifact");

export const validateAsset = createValidator(DiscoveryAssetSchema, "DiscoveryAsset");
export const validateAssets = createArrayValidator(DiscoveryAssetSchema, "DiscoveryAsset");

export const validateMetric = createValidator(SemanticMetricSchema, "SemanticMetric");
export const validateMetrics = createArrayValidator(SemanticMetricSchema, "SemanticMetric");

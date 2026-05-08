// ============================================================
// dbt Command Center — Administrative API Client
// ============================================================
// Projects/environments: v3 API
// Jobs, runs, artifacts: v2 API
// All endpoints proxied through /api/dbt-cloud/[...path]
// ============================================================

import type {
  DbtProject,
  DbtEnvironment,
  DbtJob,
  DbtRun,
  DbtArtifact,
  DbtActivityEvent,
  RunStatus,
} from "@/types";

// ─── Response wrapper from dbt Cloud Admin API ──────────────

interface AdminApiResponse<T> {
  status: { code: number; is_success: boolean; user_message: string };
  data: T;
  extra?: {
    filters: Record<string, unknown>;
    order_by: string | null;
    pagination: { count: number; total_count: number };
  };
}

// ─── Raw API types (snake_case from dbt Cloud) ───────────────

interface RawProject {
  id: number;
  name: string;
  account_id: number;
  description?: string;
  repository?: { remote_url?: string };
  created_at: string;
  updated_at: string;
  state: number;
}

interface RawEnvironment {
  id: number;
  project_id: number;
  name: string;
  type: string;
  dbt_version?: string | null;
  target_name?: string | null;
  use_custom_branch?: boolean;
  custom_branch?: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Raw API types (v2, snake_case) ─────────────────────────

interface RawJob {
  id: number;
  account_id: number;
  project_id: number;
  environment_id: number;
  name: string;
  description?: string;
  execute_steps: string[];
  settings: { threads: number; target_name: string };
  state: number;
  triggers: {
    schedule: boolean;
    github_webhook: boolean;
    git_provider_webhook: boolean;
    on_merge: boolean;
  };
  schedule?: { cron?: string };
  next_run?: string | null;
  created_at: string;
  updated_at: string;
  most_recent_run?: RawRun | null;
  most_recent_completed_run?: RawRun | null;
}

interface RawRun {
  id: number;
  job_definition_id: number;
  project_id: number;
  environment_id: number;
  status: number;
  dbt_version: string;
  git_branch?: string;
  git_sha?: string;
  status_message?: string;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  duration?: string;
  queued_duration?: string;
  run_duration?: string;
  run_steps?: RawRunStep[];
}

interface RawRunStep {
  id: number;
  index: number;
  name: string;
  status_humanized: string;
  duration?: string;
  logs?: string;
  truncated_logs?: boolean;
}

// ─── Mapping helpers ─────────────────────────────────────────

function mapProject(raw: RawProject): DbtProject {
  return {
    id: String(raw.id),
    name: raw.name,
    accountId: String(raw.account_id),
    description: raw.description,
    repositoryUrl: raw.repository?.remote_url,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    state: raw.state === 1 ? "active" : "inactive",
  };
}

function mapEnvironment(raw: RawEnvironment): DbtEnvironment {
  return {
    id: String(raw.id),
    projectId: String(raw.project_id),
    name: raw.name,
    type: raw.type as DbtEnvironment["type"],
    dbtVersion: raw.dbt_version ?? "",
    targetName: raw.target_name ?? undefined,
    useCustomBranch: raw.use_custom_branch ?? false,
    customBranch: raw.custom_branch ?? undefined,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}



const RUN_STATUS_MAP: Record<number, RunStatus> = {
  1: "queued",
  2: "starting",
  3: "running",
  10: "success",
  20: "error",
  30: "cancelled",
};

function parseDuration(hms?: string | null): number | undefined {
  if (!hms) return undefined;
  const parts = hms.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return undefined;
}

function mapRun(raw: RawRun): DbtRun {
  return {
    id: String(raw.id),
    jobId: String(raw.job_definition_id),
    projectId: String(raw.project_id),
    environmentId: String(raw.environment_id),
    status: RUN_STATUS_MAP[raw.status] ?? "error",
    statusMessage: raw.status_message || undefined,
    trigger: "schedule",
    gitSha: raw.git_sha,
    gitBranch: raw.git_branch,
    dbtVersion: raw.dbt_version,
    queuedAt: raw.created_at,
    startedAt: raw.started_at ?? undefined,
    finishedAt: raw.finished_at ?? undefined,
    duration: parseDuration(raw.duration),
    queueDuration: parseDuration(raw.queued_duration),
    runDuration: parseDuration(raw.run_duration),
    steps: (raw.run_steps ?? []).map((s) => ({
      id: String(s.id),
      index: s.index,
      name: s.name,
      status: (s.status_humanized?.toLowerCase() as RunStatus) ?? "error",
      duration: parseDuration(s.duration),
      logs: s.logs,
      truncatedLogs: s.truncated_logs,
    })),
    artifactIds: [],
    createdAt: raw.created_at,
  };
}

function mapJob(raw: RawJob): DbtJob {
  const lastRun = raw.most_recent_completed_run;
  return {
    id: String(raw.id),
    projectId: String(raw.project_id),
    environmentId: String(raw.environment_id),
    name: raw.name,
    description: raw.description || undefined,
    executeSteps: raw.execute_steps,
    triggers: {
      schedule: raw.triggers.schedule,
      githubWebhook: raw.triggers.github_webhook,
      gitProviderWebhook: raw.triggers.git_provider_webhook,
      onMerge: raw.triggers.on_merge,
      custom: false,
    },
    scheduleCron: raw.schedule?.cron,
    settings: {
      threads: raw.settings.threads,
      targetName: raw.settings.target_name,
    },
    state: raw.state === 1 ? "active" : "inactive",
    nextRunAt: raw.next_run ?? undefined,
    lastRunAt: lastRun?.finished_at ?? undefined,
    lastRunStatus: lastRun ? (RUN_STATUS_MAP[lastRun.status] ?? undefined) : undefined,
    recentRuns: [],
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

// ─── Client ─────────────────────────────────────────────────

export class DbtAdminClient {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(
    _baseUrl: string,
    _accountId: string,
    _token: string,
  ) {}

  private v3(path: string): string {
    return `/api/dbt-cloud/v3${path}`;
  }

  private v2(path: string): string {
    return `/api/dbt-cloud/v2${path}`;
  }

  private async request<T>(
    method: "GET" | "POST",
    endpoint: string,
    body?: unknown,
  ): Promise<T> {
    const tag = `[DbtAdminClient] ${method} ${endpoint}`;
    console.debug(tag);

    const init: RequestInit = {
      method,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
    };

    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const res = await fetch(endpoint, init);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `${tag} failed with status ${res.status}: ${res.statusText}. ${text}`,
      );
    }

    const json = (await res.json()) as AdminApiResponse<T>;

    if (json.status && !json.status.is_success) {
      throw new Error(
        `${tag} API error: ${json.status.user_message ?? "Unknown error"}`,
      );
    }

    return json.data;
  }

  // ── Projects ──

  async getProjects(): Promise<DbtProject[]> {
    const raw = await this.request<RawProject[]>("GET", this.v3("/projects/"));
    return raw.map(mapProject);
  }

  async getProject(id: string): Promise<DbtProject> {
    const raw = await this.request<RawProject>("GET", this.v3(`/projects/${id}/`));
    return mapProject(raw);
  }

  // ── Environments ──

  async getEnvironments(projectId?: string): Promise<DbtEnvironment[]> {
    const params = new URLSearchParams();
    if (projectId) params.set("project_id", projectId);
    const qs = params.toString();
    const path = `/environments/${qs ? `?${qs}` : ""}`;
    const raw = await this.request<RawEnvironment[]>("GET", this.v3(path));
    return raw.map(mapEnvironment);
  }

  // ── Jobs (v2) ──

  async getJobs(projectId?: string): Promise<DbtJob[]> {
    const params = new URLSearchParams();
    if (projectId) params.set("project_id", projectId);
    const qs = params.toString();
    const path = `/jobs/${qs ? `?${qs}` : ""}`;
    const raw = await this.request<RawJob[]>("GET", this.v2(path));
    return raw.map(mapJob);
  }

  async getJob(id: string): Promise<DbtJob> {
    const raw = await this.request<RawJob>("GET", this.v2(`/jobs/${id}/`));
    return mapJob(raw);
  }

  // ── Runs (v2) ──

  async getRuns(jobId?: string, limit?: number): Promise<DbtRun[]> {
    const params = new URLSearchParams();
    if (jobId) params.set("job_definition_id", jobId);
    if (limit) params.set("limit", String(limit));
    params.set("order_by", "-created_at");
    const qs = params.toString();
    const path = `/runs/${qs ? `?${qs}` : ""}`;
    const raw = await this.request<RawRun[]>("GET", this.v2(path));
    return raw.map(mapRun);
  }

  async getRun(id: string): Promise<DbtRun> {
    const raw = await this.request<RawRun>("GET", this.v2(`/runs/${id}/`));
    return mapRun(raw);
  }

  async triggerRun(jobId: string, cause?: string): Promise<DbtRun> {
    const raw = await this.request<RawRun>(
      "POST",
      this.v2(`/jobs/${jobId}/run/`),
      { cause: cause ?? "Triggered via dbt Command Center" },
    );
    return mapRun(raw);
  }

  async cancelRun(runId: string): Promise<DbtRun> {
    const raw = await this.request<RawRun>(
      "POST",
      this.v2(`/runs/${runId}/cancel/`),
    );
    return mapRun(raw);
  }

  // ── Artifacts (v2) ──

  async getArtifacts(runId: string): Promise<DbtArtifact[]> {
    const paths = await this.request<string[]>(
      "GET",
      this.v2(`/runs/${runId}/artifacts/`),
    );
    return paths.map((p, i) => ({
      id: `${runId}-${i}`,
      runId,
      jobId: "",
      projectId: "",
      type: p.endsWith(".json") ? "json" : "text",
      fileName: p,
      generatedAt: new Date().toISOString(),
    }));
  }

  async getArtifact(runId: string, path: string): Promise<unknown> {
    const endpoint = this.v2(`/runs/${runId}/artifacts/${path}`);
    const tag = `[DbtAdminClient] GET ${endpoint}`;
    console.debug(tag);

    const res = await fetch(endpoint, {
      headers: { "Content-Type": "application/json", Accept: "application/json" },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `${tag} failed with status ${res.status}: ${res.statusText}. ${text}`,
      );
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) return res.json();
    return res.text();
  }

  // ── Audit Logs (v3) ──

  async getAuditLogs(params?: {
    logged_at_start?: string;
    logged_at_end?: string;
    offset?: number;
    limit?: number;
  }): Promise<DbtActivityEvent[]> {
    const qs = new URLSearchParams();
    if (params?.logged_at_start) qs.set("logged_at_start", params.logged_at_start);
    if (params?.logged_at_end) qs.set("logged_at_end", params.logged_at_end);
    if (params?.offset) qs.set("offset", String(params.offset));
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString();
    const path = `/audit-logs/${query ? `?${query}` : ""}`;

    interface RawAuditLog {
      id: string;
      created_at: string;
      event_type: string;
      event_label: string;
      source: string;
      actor?: { name?: string; type?: string };
      event_context?: {
        project?: { id?: string };
        job?: { id?: string };
        run?: { id?: string };
        [key: string]: unknown;
      };
    }

    const raw = await this.request<RawAuditLog[]>("GET", this.v3(path));
    return raw.map((e): DbtActivityEvent => ({
      id: e.id,
      timestamp: e.created_at,
      eventType: e.event_type,
      source: "audit_log",
      actor: e.actor?.name,
      description: e.event_label,
      projectId: e.event_context?.project?.id,
      jobId: e.event_context?.job?.id,
      runId: e.event_context?.run?.id,
      metadata: e.event_context as Record<string, unknown> | undefined,
    }));
  }
}

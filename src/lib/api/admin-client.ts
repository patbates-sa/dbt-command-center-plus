// ============================================================
// dbt Command Center — Administrative API v3 Client
// ============================================================

import type {
  DbtProject,
  DbtEnvironment,
  DbtJob,
  DbtRun,
  DbtArtifact,
  DbtActivityEvent,
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

// ─── Client ─────────────────────────────────────────────────

export class DbtAdminClient {
  constructor(
    private baseUrl: string,
    private accountId: string,
    private token: string,
  ) {}

  // ── Private helpers ──

  private get headers(): Record<string, string> {
    return {
      Authorization: `Token ${this.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  private url(path: string): string {
    // Strip trailing slash from baseUrl, ensure path starts with /
    const base = this.baseUrl.replace(/\/+$/, "");
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${base}${cleanPath}`;
  }

  private v3(path: string): string {
    return this.url(`/api/v3/accounts/${this.accountId}${path}`);
  }

  private v2(path: string): string {
    return this.url(`/api/v2/accounts/${this.accountId}${path}`);
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
      headers: this.headers,
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
    return this.request<DbtProject[]>("GET", this.v3("/projects/"));
  }

  async getProject(id: string): Promise<DbtProject> {
    return this.request<DbtProject>("GET", this.v3(`/projects/${id}/`));
  }

  // ── Environments ──

  async getEnvironments(projectId?: string): Promise<DbtEnvironment[]> {
    const params = new URLSearchParams();
    if (projectId) params.set("project_id", projectId);
    const qs = params.toString();
    const path = `/environments/${qs ? `?${qs}` : ""}`;
    return this.request<DbtEnvironment[]>("GET", this.v3(path));
  }

  // ── Jobs ──

  async getJobs(projectId?: string): Promise<DbtJob[]> {
    const params = new URLSearchParams();
    if (projectId) params.set("project_id", projectId);
    const qs = params.toString();
    const path = `/jobs/${qs ? `?${qs}` : ""}`;
    return this.request<DbtJob[]>("GET", this.v3(path));
  }

  async getJob(id: string): Promise<DbtJob> {
    return this.request<DbtJob>("GET", this.v3(`/jobs/${id}/`));
  }

  // ── Runs ──

  async getRuns(jobId?: string, limit?: number): Promise<DbtRun[]> {
    const params = new URLSearchParams();
    if (jobId) params.set("job_definition_id", jobId);
    if (limit) params.set("limit", String(limit));
    params.set("order_by", "-created_at");
    const qs = params.toString();
    const path = `/runs/${qs ? `?${qs}` : ""}`;
    return this.request<DbtRun[]>("GET", this.v3(path));
  }

  async getRun(id: string): Promise<DbtRun> {
    return this.request<DbtRun>("GET", this.v3(`/runs/${id}/`));
  }

  async triggerRun(jobId: string, cause?: string): Promise<DbtRun> {
    return this.request<DbtRun>("POST", this.v3(`/jobs/${jobId}/run/`), {
      cause: cause ?? "Triggered via dbt Command Center",
    });
  }

  async cancelRun(runId: string): Promise<DbtRun> {
    return this.request<DbtRun>("POST", this.v3(`/runs/${runId}/cancel/`));
  }

  // ── Artifacts ──

  async getArtifacts(runId: string): Promise<DbtArtifact[]> {
    return this.request<DbtArtifact[]>(
      "GET",
      this.v3(`/runs/${runId}/artifacts/`),
    );
  }

  async getArtifact(runId: string, path: string): Promise<unknown> {
    const endpoint = this.v3(`/runs/${runId}/artifacts/${path}`);
    const tag = `[DbtAdminClient] GET ${endpoint}`;
    console.debug(tag);

    const res = await fetch(endpoint, { headers: this.headers });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `${tag} failed with status ${res.status}: ${res.statusText}. ${text}`,
      );
    }

    // Artifact content may be JSON (manifest, run_results) or plain text (logs)
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return res.json();
    }
    return res.text();
  }

  // ── Audit Logs ──
  // NOTE: Audit logs use the v2 API — there is no v3 equivalent as of 2026-03.

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
    return this.request<DbtActivityEvent[]>("GET", this.v2(path));
  }
}

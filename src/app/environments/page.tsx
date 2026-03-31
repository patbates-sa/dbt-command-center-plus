"use client";

import { useState, useMemo } from "react";
import {
  Server,
  GitBranch,
  Database,
  Briefcase,
  FolderGit2,
  Link2,
  Shield,
  ChevronRight,
  Layers,
  ExternalLink,
} from "lucide-react";
import { useProjects, useEnvironments, useJobs } from "@/lib/hooks/use-platform";
import type { DbtProject, DbtEnvironment, DbtJob, EnvironmentType } from "@/types";
import { formatRelativeTime } from "@/lib/utils/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { TableSkeleton, DetailSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ApiSurfaceCallout } from "@/components/shared/api-surface-callout";

const ENV_TYPE_CONFIG: Record<EnvironmentType, { label: string; className: string }> = {
  production: {
    label: "Production",
    className: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20",
  },
  staging: {
    label: "Staging",
    className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  },
  development: {
    label: "Development",
    className: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20",
  },
  deployment: {
    label: "Deployment",
    className: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20",
  },
};

function maskValue(value?: string): string {
  if (!value) return "--";
  return value.slice(0, 2) + "****" + value.slice(-2);
}

export default function EnvironmentsPage() {
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  // Use first project as default once loaded
  const activeProjectId = selectedProjectId || projects?.[0]?.id || "";
  const activeProject = projects?.find((p) => p.id === activeProjectId);

  const { data: environments, isLoading: envsLoading } = useEnvironments(activeProjectId || undefined);
  const { data: jobs, isLoading: jobsLoading } = useJobs(activeProjectId || undefined);

  const isLoading = projectsLoading || envsLoading || jobsLoading;

  // Group jobs by environment
  const jobsByEnv = useMemo(() => {
    if (!jobs) return new Map<string, DbtJob[]>();
    const map = new Map<string, DbtJob[]>();
    for (const job of jobs) {
      const existing = map.get(job.environmentId) || [];
      existing.push(job);
      map.set(job.environmentId, existing);
    }
    return map;
  }, [jobs]);

  // Find production and CI environments
  const productionEnv = environments?.find((e) => e.type === "production");
  const deploymentEnv = environments?.find((e) => e.type === "deployment");

  // Environment variable names shown for reference (values always masked)
  const envVarNames = [
    "DBT_TARGET",
    "DBT_PROFILES_DIR",
    "SNOWFLAKE_ACCOUNT",
    "SNOWFLAKE_PASSWORD",
    "DBT_API_TOKEN",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Environments & Configuration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View project environments, deployment configuration, and connection summaries.
          All sensitive values are masked for security.
        </p>
      </div>

      {/* Project selector */}
      {projects && projects.length > 1 && (
        <div className="max-w-xs">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Project
          </label>
          <Select
            value={activeProjectId}
            onValueChange={setSelectedProjectId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select project..." />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isLoading && <DetailSkeleton />}

      {!isLoading && !activeProject && (
        <EmptyState
          icon={Server}
          title="No Projects Found"
          description="No dbt Cloud projects are available. Check your API configuration."
        />
      )}

      {!isLoading && activeProject && (
        <Tabs defaultValue="environments" className="space-y-6">
          <TabsList>
            <TabsTrigger value="environments">Environments</TabsTrigger>
            <TabsTrigger value="configuration">Configuration</TabsTrigger>
            <TabsTrigger value="jobs-by-env">Jobs by Environment</TabsTrigger>
          </TabsList>

          {/* ── Environments Tab ───────────────────────────── */}
          <TabsContent value="environments" className="space-y-4">
            {environments && environments.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {environments.map((env) => (
                  <EnvironmentCard
                    key={env.id}
                    environment={env}
                    jobCount={jobsByEnv.get(env.id)?.length ?? 0}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Server}
                title="No Environments"
                description="No environments found for this project."
              />
            )}
          </TabsContent>

          {/* ── Configuration Tab ──────────────────────────── */}
          <TabsContent value="configuration" className="space-y-4">
            {/* Project metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FolderGit2 className="h-4 w-4" />
                  Project Metadata
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Name</dt>
                    <dd className="mt-0.5 text-sm font-medium">{activeProject.name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">State</dt>
                    <dd className="mt-0.5">
                      <Badge
                        variant={activeProject.state === "active" ? "success" : "secondary"}
                      >
                        {activeProject.state}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Repository</dt>
                    <dd className="mt-0.5 text-sm font-medium font-mono truncate">
                      {activeProject.repositoryUrl || "--"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Account ID</dt>
                    <dd className="mt-0.5 text-sm font-medium font-mono">
                      {activeProject.accountId}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Created</dt>
                    <dd className="mt-0.5 text-sm font-medium">
                      {formatRelativeTime(activeProject.createdAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Updated</dt>
                    <dd className="mt-0.5 text-sm font-medium">
                      {formatRelativeTime(activeProject.updatedAt)}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Environment variables */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4" />
                  Environment Variables
                </CardTitle>
                <CardDescription>
                  Variable names are shown for reference. Values are always masked.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {envVarNames.map((name) => (
                    <div
                      key={name}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <span className="text-sm font-mono font-medium">{name}</span>
                      <span className="text-sm text-muted-foreground font-mono tracking-wider">
                        {"••••••••"}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Deployment configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers className="h-4 w-4" />
                  Deployment Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Production Environment</p>
                    <p className="mt-1 text-sm font-medium">
                      {productionEnv?.name ?? "Not configured"}
                    </p>
                    {productionEnv && (
                      <Badge
                        variant="outline"
                        className={ENV_TYPE_CONFIG.production.className}
                      >
                        {productionEnv.type}
                      </Badge>
                    )}
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">CI / Deployment Environment</p>
                    <p className="mt-1 text-sm font-medium">
                      {deploymentEnv?.name ?? "Not configured"}
                    </p>
                    {deploymentEnv && (
                      <Badge
                        variant="outline"
                        className={ENV_TYPE_CONFIG.deployment.className}
                      >
                        {deploymentEnv.type}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Relationship diagram */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Link2 className="h-4 w-4" />
                  Project Relationships
                </CardTitle>
                <CardDescription>
                  How environments and jobs connect within this project.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* Project root */}
                  <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 font-medium text-sm">
                    <FolderGit2 className="h-4 w-4 text-muted-foreground" />
                    {activeProject.name}
                  </div>

                  {/* Environments tree */}
                  {environments?.map((env) => {
                    const envJobs = jobsByEnv.get(env.id) || [];
                    return (
                      <div key={env.id} className="ml-6 space-y-1">
                        <div className="flex items-center gap-2 rounded-md border px-3 py-1.5">
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          <Server className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">{env.name}</span>
                          <Badge
                            variant="outline"
                            className={`ml-auto text-[10px] ${ENV_TYPE_CONFIG[env.type].className}`}
                          >
                            {ENV_TYPE_CONFIG[env.type].label}
                          </Badge>
                        </div>
                        {envJobs.map((job) => (
                          <div
                            key={job.id}
                            className="ml-8 flex items-center gap-2 rounded-md border border-dashed px-3 py-1"
                          >
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            <Briefcase className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs">{job.name}</span>
                            {job.lastRunStatus && (
                              <StatusBadge
                                status={job.lastRunStatus}
                                className="ml-auto text-[10px]"
                              />
                            )}
                          </div>
                        ))}
                        {envJobs.length === 0 && (
                          <p className="ml-8 text-xs text-muted-foreground italic">
                            No jobs in this environment
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Jobs by Environment Tab ────────────────────── */}
          <TabsContent value="jobs-by-env" className="space-y-4">
            {environments && environments.length > 0 ? (
              environments.map((env) => {
                const envJobs = jobsByEnv.get(env.id) || [];
                return (
                  <Card key={env.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Server className="h-4 w-4" />
                          {env.name}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className={ENV_TYPE_CONFIG[env.type].className}
                        >
                          {ENV_TYPE_CONFIG[env.type].label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {envJobs.length > 0 ? (
                        <div className="space-y-2">
                          {envJobs.map((job) => (
                            <JobRow key={job.id} job={job} />
                          ))}
                        </div>
                      ) : (
                        <p className="py-4 text-center text-sm text-muted-foreground">
                          No jobs configured in this environment.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <EmptyState
                icon={Briefcase}
                title="No Environments"
                description="No environments found to display jobs."
              />
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* API Surface callout */}
      <ApiSurfaceCallout
        title="Powered by Administrative API v3 — /projects, /environments, /connections"
        endpoints={[
          "GET /api/v3/accounts/{accountId}/projects/",
          "GET /api/v3/accounts/{accountId}/environments/",
          "GET /api/v3/accounts/{accountId}/connections/",
          "GET /api/v3/accounts/{accountId}/jobs/",
        ]}
      />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function EnvironmentCard({
  environment,
  jobCount,
}: {
  environment: DbtEnvironment;
  jobCount: number;
}) {
  const typeConfig = ENV_TYPE_CONFIG[environment.type];

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-muted p-2">
              <Server className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">{environment.name}</h3>
              <Badge variant="outline" className={`mt-1 ${typeConfig.className}`}>
                {typeConfig.label}
              </Badge>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {jobCount} job{jobCount !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Details grid */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">dbt Version</p>
            <p className="mt-0.5 text-sm font-medium">{environment.dbtVersion}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Target Name</p>
            <p className="mt-0.5 text-sm font-medium">{environment.targetName || "--"}</p>
          </div>
          {environment.useCustomBranch && environment.customBranch && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Custom Branch</p>
              <p className="mt-0.5 flex items-center gap-1 text-sm font-medium font-mono">
                <GitBranch className="h-3 w-3" />
                {environment.customBranch}
              </p>
            </div>
          )}
        </div>

        {/* Connection summary */}
        {environment.credentials && (
          <div className="mt-3 rounded-md border border-dashed p-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Connection
            </p>
            <div className="mt-1 flex items-center gap-3">
              <Database className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">
                  {environment.credentials.type}
                  {environment.credentials.name ? ` — ${environment.credentials.name}` : ""}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  DB: {environment.credentials.database || "••••••"} / Schema:{" "}
                  {environment.credentials.schema || "••••••"}
                </p>
              </div>
              <Badge
                variant={environment.credentials.state === "active" ? "success" : "secondary"}
                className="text-[10px]"
              >
                {environment.credentials.state}
              </Badge>
            </div>
          </div>
        )}

        {/* Footer link */}
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
            <a href={`/jobs?env=${environment.id}`}>
              View Jobs
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function JobRow({ job }: { job: DbtJob }) {
  const triggerType = job.triggers.schedule
    ? "schedule"
    : job.triggers.githubWebhook
      ? "github_pull_request"
      : job.triggers.onMerge
        ? "on_merge"
        : "manual";

  return (
    <div className="flex items-center gap-3 rounded-md border px-3 py-2">
      <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{job.name}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {triggerType}
          </Badge>
          {job.scheduleCron && (
            <span className="text-[10px] text-muted-foreground font-mono">
              {job.scheduleCron}
            </span>
          )}
        </div>
      </div>
      {job.lastRunStatus && <StatusBadge status={job.lastRunStatus} className="text-[10px]" />}
    </div>
  );
}

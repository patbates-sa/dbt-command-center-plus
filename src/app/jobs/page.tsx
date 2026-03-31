"use client";

import { useState, useMemo } from "react";
import { Search, Briefcase } from "lucide-react";
import { useJobs, useProjects, useEnvironments } from "@/lib/hooks";
import type { RunStatus } from "@/types";
import { ApiSurfaceCallout } from "@/components/shared/api-surface-callout";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { JobCard } from "@/components/jobs/job-card";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: "All Statuses", value: "__all__" },
  { label: "Success", value: "success" },
  { label: "Error", value: "error" },
  { label: "Running", value: "running" },
  { label: "Queued", value: "queued" },
  { label: "Cancelled", value: "cancelled" },
];

export default function JobsPage() {
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("__all__");
  const [envFilter, setEnvFilter] = useState("__all__");
  const [statusFilter, setStatusFilter] = useState("__all__");

  const jobsQuery = useJobs();
  const projectsQuery = useProjects();
  const environmentsQuery = useEnvironments();

  const isLoading = jobsQuery.isLoading || projectsQuery.isLoading || environmentsQuery.isLoading;

  const projects = projectsQuery.data ?? [];
  const environments = environmentsQuery.data ?? [];
  const jobs = jobsQuery.data ?? [];

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  );
  const envMap = useMemo(
    () => new Map(environments.map((e) => [e.id, e])),
    [environments],
  );

  const filteredJobs = useMemo(() => {
    let result = jobs;

    if (projectFilter !== "__all__") {
      result = result.filter((j) => j.projectId === projectFilter);
    }
    if (envFilter !== "__all__") {
      result = result.filter((j) => j.environmentId === envFilter);
    }
    if (statusFilter !== "__all__") {
      result = result.filter((j) => j.lastRunStatus === (statusFilter as RunStatus));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (j) =>
          j.name.toLowerCase().includes(q) ||
          j.executeSteps.some((s) => s.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [jobs, projectFilter, envFilter, statusFilter, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Jobs & Orchestration</h2>
        <p className="text-muted-foreground mt-1">
          Monitor, manage, and trigger dbt Cloud jobs across all projects and environments.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={envFilter} onValueChange={setEnvFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Environments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Environments</SelectItem>
            {environments.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : filteredJobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs found"
          description={
            search || projectFilter !== "__all__" || envFilter !== "__all__" || statusFilter !== "__all__"
              ? "Try adjusting your filters or search query."
              : "No jobs have been configured in your dbt Cloud account yet."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              project={projectMap.get(job.projectId)}
              environment={envMap.get(job.environmentId)}
            />
          ))}
        </div>
      )}

      {/* API Callout */}
      <ApiSurfaceCallout
        title="Powered by Administrative API v3 -- /jobs, /runs, job triggers"
        endpoints={[
          "GET /api/v3/accounts/{id}/jobs -- list all jobs",
          "GET /api/v3/accounts/{id}/runs -- list runs for jobs",
          "POST /api/v3/accounts/{id}/jobs/{jobId}/run -- trigger a job run",
          "GET /api/v3/accounts/{id}/projects -- project metadata",
          "GET /api/v3/accounts/{id}/environments -- environment metadata",
        ]}
      />
    </div>
  );
}

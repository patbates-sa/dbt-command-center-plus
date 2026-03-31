"use client";

import { useState, useMemo } from "react";
import {
  FileArchive,
  Filter,
  Copy,
  Check,
} from "lucide-react";
import { useJobs, useRuns, useArtifacts } from "@/lib/hooks/use-platform";
import type { DbtArtifact } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ApiSurfaceCallout } from "@/components/shared/api-surface-callout";
import { ArtifactCard } from "@/components/artifacts/artifact-card";
import { ArtifactPreview } from "@/components/artifacts/artifact-preview";

const ARTIFACT_TYPES = ["all", "manifest", "run_results", "catalog", "sources", "logs"] as const;

export default function ArtifactsPage() {
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [previewArtifact, setPreviewArtifact] = useState<DbtArtifact | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [curlCopied, setCurlCopied] = useState(false);

  // Cascading selectors: jobs -> runs -> artifacts
  const { data: jobs, isLoading: jobsLoading } = useJobs();
  const { data: runs, isLoading: runsLoading } = useRuns(selectedJobId || undefined);
  const { data: artifacts, isLoading: artifactsLoading } = useArtifacts(selectedRunId);

  // Filter artifacts by type
  const filteredArtifacts = useMemo(() => {
    if (!artifacts) return [];
    if (typeFilter === "all") return artifacts;
    return artifacts.filter((a) => a.type === typeFilter);
  }, [artifacts, typeFilter]);

  const handlePreview = (artifact: DbtArtifact) => {
    setPreviewArtifact(artifact);
    setPreviewOpen(true);
  };

  const handleCopyListEndpoint = async () => {
    const curl = `curl -H "Authorization: Token $DBT_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  "https://cloud.getdbt.com/api/v3/accounts/{account_id}/runs/${selectedRunId}/artifacts/"`;
    await navigator.clipboard.writeText(curl);
    setCurlCopied(true);
    setTimeout(() => setCurlCopied(false), 2000);
  };

  const isLoading = jobsLoading || (selectedJobId && runsLoading) || (selectedRunId && artifactsLoading);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Artifacts & Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Explore the tangible outputs of dbt runs — manifests, run results, catalogs, and logs.
          Select a job and run to browse generated artifacts.
        </p>
      </div>

      {/* Filter controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filter Artifacts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            {/* Job selector */}
            <div className="min-w-[200px] flex-1">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Job
              </label>
              <Select
                value={selectedJobId}
                onValueChange={(value) => {
                  setSelectedJobId(value);
                  setSelectedRunId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a job..." />
                </SelectTrigger>
                <SelectContent>
                  {jobs?.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Run selector */}
            <div className="min-w-[200px] flex-1">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Run
              </label>
              <Select
                value={selectedRunId}
                onValueChange={setSelectedRunId}
                disabled={!selectedJobId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      selectedJobId ? "Select a run..." : "Select a job first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {runs?.map((run) => (
                    <SelectItem key={run.id} value={run.id}>
                      Run #{run.id} — {run.status}
                      {run.finishedAt
                        ? ` (${new Date(run.finishedAt).toLocaleDateString()})`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type filter */}
            <div className="min-w-[160px]">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Artifact Type
              </label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ARTIFACT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type === "all" ? "All Types" : type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Copy API Request for the list endpoint */}
      {selectedRunId && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredArtifacts.length} artifact{filteredArtifacts.length !== 1 ? "s" : ""} found
          </p>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={handleCopyListEndpoint}
          >
            {curlCopied ? (
              <>
                <Check className="mr-1.5 h-3 w-3 text-green-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-1.5 h-3 w-3" />
                Copy API Request
              </>
            )}
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && <TableSkeleton rows={4} />}

      {/* Empty states */}
      {!isLoading && !selectedJobId && (
        <EmptyState
          icon={FileArchive}
          title="Select a Job"
          description="Choose a job from the dropdown above to browse its run artifacts."
        />
      )}
      {!isLoading && selectedJobId && !selectedRunId && runs && runs.length > 0 && (
        <EmptyState
          icon={FileArchive}
          title="Select a Run"
          description="Choose a run from the dropdown to see its generated artifacts."
        />
      )}
      {!isLoading && selectedJobId && !selectedRunId && runs && runs.length === 0 && (
        <EmptyState
          icon={FileArchive}
          title="No Runs Found"
          description="This job has no runs yet. Trigger a run to generate artifacts."
        />
      )}
      {!isLoading && selectedRunId && filteredArtifacts.length === 0 && (
        <EmptyState
          icon={FileArchive}
          title="No Artifacts Found"
          description={
            typeFilter !== "all"
              ? `No ${typeFilter} artifacts found for this run. Try changing the filter.`
              : "This run has no artifacts available."
          }
        />
      )}

      {/* Artifact grid */}
      {!isLoading && filteredArtifacts.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredArtifacts.map((artifact) => (
            <ArtifactCard
              key={artifact.id}
              artifact={artifact}
              onPreview={handlePreview}
            />
          ))}
        </div>
      )}

      {/* Artifact preview dialog */}
      <ArtifactPreview
        artifact={previewArtifact}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />

      {/* API Surface callout */}
      <ApiSurfaceCallout
        title="Powered by Administrative API v3 — /runs/{id}/artifacts/"
        endpoints={[
          "GET /api/v3/accounts/{accountId}/runs/{runId}/artifacts/",
          "GET /api/v3/accounts/{accountId}/runs/{runId}/artifacts/{path}",
        ]}
      />
    </div>
  );
}

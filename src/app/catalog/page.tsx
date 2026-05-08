"use client";

import { useState, useMemo, useEffect } from "react";
import { Search as SearchIcon } from "lucide-react";
import { useAssets, useProjects, useEnvironments } from "@/lib/hooks";
import type { AssetFilters } from "@/types";
import type { ResourceType, FilterOption } from "@/types";
import { FilterBar } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { ApiSurfaceCallout } from "@/components/shared/api-surface-callout";
import { AssetCard } from "@/components/catalog/asset-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

// ── Sort helpers ─────────────────────────────────────────────

type SortOption =
  | "recently_executed"
  | "longest_runtime"
  | "most_downstream"
  | "poor_coverage"
  | "alphabetical";

const sortOptions: FilterOption[] = [
  { label: "Recently Executed", value: "recently_executed" },
  { label: "Longest Runtime", value: "longest_runtime" },
  { label: "Most Downstream", value: "most_downstream" },
  { label: "Poor Coverage", value: "poor_coverage" },
  { label: "Alphabetical", value: "alphabetical" },
];

const resourceTypeOptions: FilterOption[] = [
  { label: "Model", value: "model" },
  { label: "Source", value: "source" },
  { label: "Semantic Model", value: "semantic_model" },
  { label: "Metric", value: "metric" },
  { label: "Seed", value: "seed" },
  { label: "Snapshot", value: "snapshot" },
  { label: "Exposure", value: "exposure" },
];

const materializationOptions: FilterOption[] = [
  { label: "Table", value: "table" },
  { label: "View", value: "view" },
  { label: "Incremental", value: "incremental" },
  { label: "Ephemeral", value: "ephemeral" },
  { label: "Materialized View", value: "materialized_view" },
];

// ── Component ────────────────────────────────────────────────

export default function CatalogPage() {
  // Filter state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [projectId, setProjectId] = useState("all");
  const [environmentId, setEnvironmentId] = useState("all");
  const [resourceType, setResourceType] = useState("all");
  const [tag, setTag] = useState("all");
  const [materialization, setMaterialization] = useState("all");
  const [sort, setSort] = useState<string>("recently_executed");

  const { data: projects = [] } = useProjects();
  const { data: allEnvironments = [] } = useEnvironments();

  // Environments for the selected project (prefer deployment type)
  const projectEnvironments = useMemo(() => {
    if (projectId === "all") return [];
    return allEnvironments
      .filter((e) => e.projectId === projectId)
      .sort((a, b) => {
        // Deployment/production environments first
        const rank = (t: string) => (t === "deployment" || t === "production" ? 0 : 1);
        return rank(a.type) - rank(b.type);
      });
  }, [allEnvironments, projectId]);

  // When project changes, auto-select its best environment
  useEffect(() => {
    if (projectId === "all") {
      setEnvironmentId("all");
    } else {
      setEnvironmentId(projectEnvironments[0]?.id ?? "all");
    }
  }, [projectId, projectEnvironments]);

  // Debounce search input at 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Build API filters
  const filters: AssetFilters = useMemo(() => {
    const f: AssetFilters = {};
    if (debouncedSearch) f.search = debouncedSearch;
    if (resourceType !== "all") f.resourceType = resourceType as ResourceType;
    if (tag !== "all") f.tags = [tag];
    if (materialization !== "all") f.materialization = materialization;
    if (environmentId !== "all") f.environmentId = environmentId;
    return f;
  }, [debouncedSearch, resourceType, tag, materialization, environmentId]);

  const { data: assets, isLoading, isError, error } = useAssets(filters);

  // Collect all available tags from the full asset set for the filter dropdown
  const allAssetsQuery = useAssets();
  const tagOptions: FilterOption[] = useMemo(() => {
    if (!allAssetsQuery.data) return [];
    const tagSet = new Set<string>();
    for (const a of allAssetsQuery.data) {
      for (const t of a.tags) tagSet.add(t);
    }
    return Array.from(tagSet)
      .sort()
      .map((t) => ({ label: t, value: t }));
  }, [allAssetsQuery.data]);

  // Sort the results client-side
  const sortedAssets = useMemo(() => {
    if (!assets) return [];
    const sorted = [...assets];

    switch (sort as SortOption) {
      case "recently_executed":
        sorted.sort((a, b) => {
          const aTime = a.executionInfo?.lastRunAt ?? "";
          const bTime = b.executionInfo?.lastRunAt ?? "";
          return bTime.localeCompare(aTime);
        });
        break;
      case "longest_runtime":
        sorted.sort((a, b) => {
          const aDur = a.executionInfo?.lastRunDuration ?? 0;
          const bDur = b.executionInfo?.lastRunDuration ?? 0;
          return bDur - aDur;
        });
        break;
      case "most_downstream":
        sorted.sort((a, b) => b.downstreamCount - a.downstreamCount);
        break;
      case "poor_coverage":
        sorted.sort((a, b) => {
          const aRatio =
            a.testCount > 0 ? a.passingTestCount / a.testCount : 0;
          const bRatio =
            b.testCount > 0 ? b.passingTestCount / b.testCount : 0;
          return aRatio - bRatio;
        });
        break;
      case "alphabetical":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return sorted;
  }, [assets, sort]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Catalog Explorer</h2>
        <p className="text-muted-foreground mt-1">
          Browse and search all dbt assets across your project.
        </p>
      </div>

      {/* Filter bar */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search assets by name, ID, or description..."
        filters={[
          {
            key: "project",
            label: "Project",
            options: projects.map((p) => ({ label: p.name, value: p.id })),
            value: projectId,
            onChange: setProjectId,
          },
          ...(projectEnvironments.length > 1
            ? [{
                key: "environment",
                label: "Environment",
                options: projectEnvironments.map((e) => ({ label: e.name, value: e.id })),
                value: environmentId,
                onChange: setEnvironmentId,
              }]
            : []),
          {
            key: "resourceType",
            label: "Resource Type",
            options: resourceTypeOptions,
            value: resourceType,
            onChange: setResourceType,
          },
          {
            key: "tag",
            label: "Tags",
            options: tagOptions,
            value: tag,
            onChange: setTag,
          },
          {
            key: "materialization",
            label: "Materialization",
            options: materializationOptions,
            value: materialization,
            onChange: setMaterialization,
          },
          {
            key: "sort",
            label: "Sort By",
            options: sortOptions,
            value: sort,
            onChange: setSort,
          },
        ]}
      />

      {/* Results count */}
      {!isLoading && assets && (
        <p className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-medium text-foreground">
            {sortedAssets.length}
          </span>{" "}
          asset{sortedAssets.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <div className="flex gap-1">
                  <Skeleton className="h-4 w-12 rounded-full" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-destructive font-medium">
              Failed to load catalog data.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {error?.message ?? "An unexpected error occurred."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !isError && sortedAssets.length === 0 && (
        <EmptyState
          icon={SearchIcon}
          title="No assets found"
          description="Try adjusting your search or filters to find what you are looking for."
          action={{
            label: "Clear filters",
            onClick: () => {
              setSearch("");
              setProjectId("all");
              setEnvironmentId("all");
              setResourceType("all");
              setTag("all");
              setMaterialization("all");
            },
          }}
        />
      )}

      {/* Results grid */}
      {!isLoading && sortedAssets.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedAssets.map((asset) => (
            <AssetCard key={asset.uniqueId} asset={asset} />
          ))}
        </div>
      )}

      {/* API Surface Callout */}
      <ApiSurfaceCallout
        title="Powered by Discovery API"
        endpoints={[
          "Discovery API (GraphQL) -- query { environment { applied { models, sources, exposures, metrics } } }",
          "Discovery API (GraphQL) -- asset metadata, columns, tests, lineage counts",
        ]}
      />
    </div>
  );
}

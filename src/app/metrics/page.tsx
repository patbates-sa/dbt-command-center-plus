"use client";

import { useState, useMemo, useCallback } from "react";
import {
  useCapabilities,
  useMetrics,
  useMetricQuery,
} from "@/lib/hooks/use-platform";
import type { DbtMetric } from "@/types";
import type { MetricQueryParams } from "@/types";
import { CapabilityNotice } from "@/components/shared/capability-notice";
import { ApiSurfaceCallout } from "@/components/shared/api-surface-callout";
import { EmptyState } from "@/components/shared/empty-state";
import { SidePanel } from "@/components/shared/side-panel";
import { CodeViewer } from "@/components/shared/code-viewer";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { MetricCard } from "@/components/metrics/metric-card";
import { QueryBuilder } from "@/components/metrics/query-builder";
import { ResultsView } from "@/components/metrics/results-view";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Search,
  BookOpen,
  Info,
  Link as LinkIcon,
} from "lucide-react";

export default function MetricsPage() {
  const { data: capabilities } = useCapabilities();
  const { data: metrics, isLoading: metricsLoading } = useMetrics();

  const [selectedMetric, setSelectedMetric] = useState<DbtMetric | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [queryParams, setQueryParams] = useState<MetricQueryParams | null>(null);
  const [definitionPanelOpen, setDefinitionPanelOpen] = useState(false);

  const semanticLayerAvailable =
    capabilities?.semanticLayer !== false;

  const {
    data: queryResult,
    isLoading: queryLoading,
  } = useMetricQuery(
    queryParams ?? { metricName: "" }
  );

  const filteredMetrics = useMemo(() => {
    if (!metrics) return [];
    if (!searchQuery) return metrics;
    const q = searchQuery.toLowerCase();
    return metrics.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.label.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [metrics, searchQuery]);

  const handleSelectMetric = useCallback((metric: DbtMetric) => {
    setSelectedMetric(metric);
    setQueryParams(null);
  }, []);

  const handleExecuteQuery = useCallback((params: MetricQueryParams) => {
    setQueryParams(params);
  }, []);

  // If semantic layer is unavailable, show notice
  if (capabilities && !semanticLayerAvailable) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Semantic Metrics Workbench
          </h1>
          <p className="mt-1 text-muted-foreground">
            Query governed metrics through the dbt Semantic Layer
          </p>
        </div>
        <CapabilityNotice
          title="Semantic Layer Not Configured"
          description="The Semantic Layer requires a dbt Cloud account with the Semantic Layer enabled and properly configured. Configure your Semantic Layer connection in the app settings to use this feature."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Semantic Metrics Workbench
        </h1>
        <p className="mt-1 text-muted-foreground">
          Discover, explore, and query governed metrics through the dbt Semantic
          Layer. Consistent metric definitions enforced across every consumer.
        </p>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left panel: Metric Discovery */}
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Metric Discovery</CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="h-9 pl-8 text-xs"
                  placeholder="Search metrics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="max-h-[600px] space-y-2 overflow-y-auto">
              {metricsLoading && <TableSkeleton rows={4} />}
              {!metricsLoading && filteredMetrics.length === 0 && (
                <EmptyState
                  icon={BarChart3}
                  title="No metrics found"
                  description={
                    searchQuery
                      ? "Try adjusting your search query."
                      : "No metrics are available in the Semantic Layer."
                  }
                />
              )}
              {filteredMetrics.map((metric) => (
                <MetricCard
                  key={metric.uniqueId}
                  metric={metric}
                  selected={selectedMetric?.uniqueId === metric.uniqueId}
                  onClick={handleSelectMetric}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right panel: Query Builder + Results */}
        <div className="space-y-4 lg:col-span-2">
          {!selectedMetric ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 rounded-full bg-muted p-3">
                  <BarChart3 className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">Select a Metric</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Choose a metric from the discovery panel to build and execute
                  queries against the Semantic Layer.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Metric header */}
              <Card>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">
                        {selectedMetric.label}
                      </h2>
                      <Badge variant="secondary">{selectedMetric.type}</Badge>
                    </div>
                    {selectedMetric.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {selectedMetric.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDefinitionPanelOpen(true)}
                  >
                    <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                    Definition
                  </Button>
                </CardContent>
              </Card>

              {/* Query builder */}
              <QueryBuilder
                metric={selectedMetric}
                onExecute={handleExecuteQuery}
                isLoading={queryLoading}
              />

              {/* Results */}
              {queryLoading && (
                <Card>
                  <CardContent className="p-6">
                    <TableSkeleton rows={5} />
                  </CardContent>
                </Card>
              )}

              {queryResult && queryResult.status === "success" && !queryLoading && (
                <ResultsView
                  result={queryResult}
                  metricName={selectedMetric.name}
                />
              )}

              {queryResult && queryResult.status === "error" && !queryLoading && (
                <Card className="border-destructive">
                  <CardContent className="p-4">
                    <p className="text-sm text-destructive">
                      Query execution failed. Please check your parameters and
                      try again.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Request preview */}
              {queryParams && (
                <CodeViewer
                  code={JSON.stringify(queryParams, null, 2)}
                  language="json"
                  title="Generated Request Preview"
                />
              )}
            </>
          )}

          {/* Context section */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Metrics queried through the Semantic Layer enforce consistent
                  definitions regardless of consumer. This ensures every team
                  and tool sees the same governed metric values, eliminating
                  metric drift and conflicting definitions.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <LinkIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Related upstream assets (semantic models, sources) are
                  available in the{" "}
                  <a href="/catalog" className="text-primary underline underline-offset-2">
                    Catalog
                  </a>{" "}
                  for full lineage exploration.
                </p>
              </div>
            </CardContent>
          </Card>

          <ApiSurfaceCallout
            title="Powered by Semantic Layer API -- metrics, dimensions, createQuery"
            endpoints={[
              "GET /api/v1/semantic-layer/metrics",
              "GET /api/v1/semantic-layer/metrics/{name}/dimensions",
              "POST /api/v1/semantic-layer/query",
              "GET /api/v1/semantic-layer/query/{queryId}/results",
            ]}
          />
        </div>
      </div>

      {/* Metric Definition Side Panel */}
      {selectedMetric && (
        <SidePanel
          open={definitionPanelOpen}
          onClose={() => setDefinitionPanelOpen(false)}
          title={`${selectedMetric.label} — Definition`}
        >
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-medium text-muted-foreground">
                Unique ID
              </h4>
              <p className="mt-0.5 text-sm font-mono">
                {selectedMetric.uniqueId}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-muted-foreground">
                Type
              </h4>
              <Badge variant="secondary" className="mt-0.5">
                {selectedMetric.type}
              </Badge>
            </div>
            {selectedMetric.description && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground">
                  Description
                </h4>
                <p className="mt-0.5 text-sm">
                  {selectedMetric.description}
                </p>
              </div>
            )}
            {selectedMetric.filter && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground">
                  Filter
                </h4>
                <p className="mt-0.5 text-sm font-mono">
                  {selectedMetric.filter}
                </p>
              </div>
            )}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground">
                Dimensions ({selectedMetric.dimensions.length})
              </h4>
              <div className="mt-1 flex flex-wrap gap-1">
                {selectedMetric.dimensions.map((dim) => (
                  <Badge key={dim} variant="outline" className="text-xs">
                    {dim}
                  </Badge>
                ))}
              </div>
            </div>
            {selectedMetric.entities && selectedMetric.entities.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground">
                  Entities
                </h4>
                <div className="mt-1 flex flex-wrap gap-1">
                  {selectedMetric.entities.map((ent) => (
                    <Badge key={ent} variant="outline" className="text-xs">
                      {ent}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {selectedMetric.tags.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground">
                  Tags
                </h4>
                <div className="mt-1 flex flex-wrap gap-1">
                  {selectedMetric.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Full definition as JSON */}
            <div>
              <h4 className="mb-1.5 text-xs font-medium text-muted-foreground">
                Full Definition
              </h4>
              <CodeViewer
                code={JSON.stringify(selectedMetric, null, 2)}
                language="json"
                title="Metric definition"
                showLineNumbers={false}
              />
            </div>
          </div>
        </SidePanel>
      )}
    </div>
  );
}

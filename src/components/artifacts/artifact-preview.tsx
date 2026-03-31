"use client";

import type { DbtArtifact, ArtifactSummary } from "@/types";
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  AlertTriangle,
  Clock,
  Package,
  Database,
  Columns3,
  Hash,
  FileJson,
  Terminal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CodeViewer } from "@/components/shared/code-viewer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ArtifactPreviewProps {
  artifact: DbtArtifact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Generate sample raw content for preview when full artifact content is unavailable
function getSampleRawContent(artifact: DbtArtifact): string {
  if (artifact.type === "run_results") {
    return JSON.stringify(
      {
        metadata: {
          dbt_schema_version: "https://schemas.getdbt.com/dbt/run-results/v5.json",
          dbt_version: artifact.parsedSummary?.dbtVersion ?? "1.7.4",
          generated_at: artifact.generatedAt,
          invocation_id: artifact.parsedSummary?.invocationId ?? "unknown",
          env: {},
        },
        results: [
          {
            unique_id: "model.jaffle_shop.stg_customers",
            status: "success",
            execution_time: 1.23,
            message: "CREATE TABLE (42.0 rows, 3.2 KB processed)",
          },
          {
            unique_id: "model.jaffle_shop.stg_orders",
            status: "success",
            execution_time: 0.89,
            message: "CREATE TABLE (99.0 rows, 5.1 KB processed)",
          },
        ],
        elapsed_time: artifact.parsedSummary?.elapsedTime ?? 12.5,
      },
      null,
      2
    );
  }
  if (artifact.type === "manifest") {
    return JSON.stringify(
      {
        metadata: {
          dbt_schema_version: "https://schemas.getdbt.com/dbt/manifest/v11.json",
          dbt_version: artifact.parsedSummary?.dbtVersion ?? "1.7.4",
          generated_at: artifact.generatedAt,
          invocation_id: artifact.parsedSummary?.invocationId ?? "unknown",
          project_name: "jaffle_shop",
        },
        nodes: {
          "model.jaffle_shop.stg_customers": { resource_type: "model", package_name: "jaffle_shop" },
          "model.jaffle_shop.stg_orders": { resource_type: "model", package_name: "jaffle_shop" },
          "model.jaffle_shop.customers": { resource_type: "model", package_name: "jaffle_shop" },
        },
        sources: {},
        macros: {},
      },
      null,
      2
    );
  }
  if (artifact.type === "catalog") {
    return JSON.stringify(
      {
        metadata: {
          dbt_schema_version: "https://schemas.getdbt.com/dbt/catalog/v1.json",
          generated_at: artifact.generatedAt,
        },
        nodes: {
          "model.jaffle_shop.customers": {
            columns: {
              customer_id: { type: "INTEGER", index: 1 },
              first_name: { type: "VARCHAR", index: 2 },
              last_name: { type: "VARCHAR", index: 3 },
            },
            stats: { row_count: { value: 100 } },
          },
        },
      },
      null,
      2
    );
  }
  return JSON.stringify({ fileName: artifact.fileName, type: artifact.type }, null, 2);
}

export function ArtifactPreview({ artifact, open, onOpenChange }: ArtifactPreviewProps) {
  if (!artifact) return null;

  const rawContent = getSampleRawContent(artifact);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-muted-foreground" />
            {artifact.fileName}
          </DialogTitle>
          <DialogDescription>
            Generated from run {artifact.runId} — {artifact.type} artifact
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="summary" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-fit">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="raw">Raw JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="flex-1 overflow-auto">
            <SummaryView artifact={artifact} />
          </TabsContent>

          <TabsContent value="raw" className="flex-1 overflow-auto">
            <CodeViewer
              code={rawContent}
              language="json"
              title={artifact.fileName}
              showLineNumbers
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function SummaryView({ artifact }: { artifact: DbtArtifact }) {
  const summary = artifact.parsedSummary;

  if (artifact.type === "run_results") {
    return <RunResultsSummary summary={summary} />;
  }
  if (artifact.type === "manifest") {
    return <ManifestSummary summary={summary} />;
  }
  if (artifact.type === "catalog") {
    return <CatalogSummary summary={summary} />;
  }
  return <GenericSummary artifact={artifact} />;
}

function RunResultsSummary({ summary }: { summary?: ArtifactSummary }) {
  if (!summary) {
    return <p className="text-sm text-muted-foreground py-4">No parsed summary available.</p>;
  }

  const total = (summary.successNodes ?? 0) + (summary.errorNodes ?? 0) + (summary.skippedNodes ?? 0);

  return (
    <div className="space-y-4">
      {/* Node status overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Node Execution Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              icon={CheckCircle2}
              iconColor="text-green-500"
              bgColor="bg-green-500/10"
              value={summary.successNodes ?? 0}
              label="Succeeded"
            />
            <StatCard
              icon={XCircle}
              iconColor="text-red-500"
              bgColor="bg-red-500/10"
              value={summary.errorNodes ?? 0}
              label="Failed"
            />
            <StatCard
              icon={MinusCircle}
              iconColor="text-zinc-500"
              bgColor="bg-zinc-500/10"
              value={summary.skippedNodes ?? 0}
              label="Skipped"
            />
            <StatCard
              icon={AlertTriangle}
              iconColor="text-yellow-500"
              bgColor="bg-yellow-500/10"
              value={summary.warningNodes ?? 0}
              label="Warnings"
            />
          </div>
        </CardContent>
      </Card>

      {/* Duration & invocation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Execution Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {summary.elapsedTime != null ? `${summary.elapsedTime.toFixed(1)}s` : "--"}
                </p>
                <p className="text-xs text-muted-foreground">Total Duration</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{total}</p>
                <p className="text-xs text-muted-foreground">Total Nodes</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="truncate text-sm font-medium font-mono">
                  {summary.invocationId ?? "--"}
                </p>
                <p className="text-xs text-muted-foreground">Invocation ID</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{summary.dbtVersion ?? "--"}</p>
                <p className="text-xs text-muted-foreground">dbt Version</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Failing nodes */}
      {(summary.errorNodes ?? 0) > 0 && (
        <Card className="border-red-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-red-600 dark:text-red-400">
              Failing Nodes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {(summary.metadata?.failingNodes as string)?.split(",").map((node: string) => (
                <div key={node} className="flex items-center gap-2 rounded-md bg-red-500/5 px-2 py-1">
                  <XCircle className="h-3 w-3 text-red-500" />
                  <span className="text-xs font-mono">{node.trim()}</span>
                </div>
              )) ?? (
                <p className="text-xs text-muted-foreground">
                  {summary.errorNodes} node(s) failed — check raw artifact for details.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coverage */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Coverage Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Test Coverage</p>
              <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500"
                  style={{
                    width: `${total > 0 ? Math.round(((summary.successNodes ?? 0) / total) * 100) : 0}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs font-medium">
                {total > 0 ? Math.round(((summary.successNodes ?? 0) / total) * 100) : 0}% pass rate
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Environment</p>
              <p className="mt-1 text-sm font-medium">
                {summary.metadata?.environment as string ?? "Default"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ManifestSummary({ summary }: { summary?: ArtifactSummary }) {
  if (!summary) {
    return <p className="text-sm text-muted-foreground py-4">No parsed summary available.</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Manifest Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard
              icon={Package}
              iconColor="text-blue-500"
              bgColor="bg-blue-500/10"
              value={summary.totalNodes ?? 0}
              label="Total Nodes"
            />
            <StatCard
              icon={Database}
              iconColor="text-purple-500"
              bgColor="bg-purple-500/10"
              value={Number(summary.metadata?.sourceCount ?? 0)}
              label="Sources"
            />
            <StatCard
              icon={Hash}
              iconColor="text-orange-500"
              bgColor="bg-orange-500/10"
              value={Number(summary.metadata?.testCount ?? 0)}
              label="Tests"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Package Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              <Package className="mr-1 h-3 w-3" />
              {summary.metadata?.projectName as string ?? "jaffle_shop"}
            </Badge>
            <Badge variant="secondary">
              dbt {summary.dbtVersion ?? "--"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Node Counts by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { label: "Models", count: summary.totalNodes ?? 0, color: "bg-blue-500" },
              { label: "Sources", count: Number(summary.metadata?.sourceCount ?? 0), color: "bg-purple-500" },
              { label: "Tests", count: Number(summary.metadata?.testCount ?? 0), color: "bg-orange-500" },
              { label: "Seeds", count: Number(summary.metadata?.seedCount ?? 0), color: "bg-green-500" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="w-16 text-xs text-muted-foreground">{item.label}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{
                      width: `${Math.min(100, (item.count / Math.max(summary.totalNodes ?? 1, 1)) * 100)}%`,
                    }}
                  />
                </div>
                <span className="w-8 text-right text-xs font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CatalogSummary({ summary }: { summary?: ArtifactSummary }) {
  if (!summary) {
    return <p className="text-sm text-muted-foreground py-4">No parsed summary available.</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Catalog Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={Database}
              iconColor="text-blue-500"
              bgColor="bg-blue-500/10"
              value={summary.totalNodes ?? 0}
              label="Tables / Views"
            />
            <StatCard
              icon={Columns3}
              iconColor="text-purple-500"
              bgColor="bg-purple-500/10"
              value={Number(summary.metadata?.totalColumns ?? 0)}
              label="Total Columns"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Documentation Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Column Documentation</span>
                <span className="font-medium">
                  {Number(summary.metadata?.documentedColumns ?? 0)} / {Number(summary.metadata?.totalColumns ?? 0)}
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500"
                  style={{
                    width: `${
                      Number(summary.metadata?.totalColumns ?? 0) > 0
                        ? Math.round(
                            (Number(summary.metadata?.documentedColumns ?? 0) /
                              Number(summary.metadata?.totalColumns ?? 1)) *
                              100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Table Descriptions</span>
                <span className="font-medium">
                  {Number(summary.metadata?.describedTables ?? 0)} / {summary.totalNodes ?? 0}
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{
                    width: `${
                      (summary.totalNodes ?? 0) > 0
                        ? Math.round(
                            (Number(summary.metadata?.describedTables ?? 0) /
                              (summary.totalNodes ?? 1)) *
                              100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GenericSummary({ artifact }: { artifact: DbtArtifact }) {
  return (
    <Card>
      <CardContent className="py-6 text-center">
        <FileJson className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          Preview not available for {artifact.type} artifacts. Switch to the Raw tab to view content.
        </p>
      </CardContent>
    </Card>
  );
}

function StatCard({
  icon: Icon,
  iconColor,
  bgColor,
  value,
  label,
}: {
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  value: number;
  label: string;
}) {
  return (
    <div className={`flex items-center gap-2 rounded-md ${bgColor} px-3 py-2`}>
      <Icon className={`h-4 w-4 ${iconColor}`} />
      <div>
        <p className="text-sm font-semibold">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

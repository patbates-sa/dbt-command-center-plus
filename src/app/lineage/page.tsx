"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";

import {
  Search,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Crosshair,
  ShieldAlert,
  Zap,
  Layers,
  X,
} from "lucide-react";
import { useAssets, useLineage } from "@/lib/hooks";
import type { ResourceType, LineageNode as LineageNodeType } from "@/types";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SidePanel } from "@/components/shared/side-panel";
import { ApiSurfaceCallout } from "@/components/shared/api-surface-callout";
import { EmptyState } from "@/components/shared/empty-state";
import {
  LineageNode,
  type LineageNodeData,
} from "@/components/lineage/lineage-node";
import { LineageDetailPanel } from "@/components/lineage/lineage-detail-panel";

// ── Node types registry ──────────────────────────────────────

const nodeTypes = {
  lineageNode: LineageNode,
};

// ── Color map ────────────────────────────────────────────────

const resourceTypeColors: Record<ResourceType, string> = {
  model: "#3b82f6",
  source: "#22c55e",
  exposure: "#a855f7",
  metric: "#f97316",
  semantic_model: "#6366f1",
  test: "#10b981",
  seed: "#84cc16",
  snapshot: "#f59e0b",
};

// ── Legend ───────────────────────────────────────────────────

const legendItems: { type: ResourceType; label: string }[] = [
  { type: "model", label: "Model" },
  { type: "source", label: "Source" },
  { type: "semantic_model", label: "Semantic Model" },
  { type: "metric", label: "Metric" },
  { type: "seed", label: "Seed" },
  { type: "snapshot", label: "Snapshot" },
];

function LineageLegend() {
  return (
    <div className="absolute bottom-3 left-3 z-10 rounded-md border bg-background/90 backdrop-blur-sm px-3 py-2 shadow-sm">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Legend</p>
      <div className="flex flex-col gap-1">
        {legendItems.map(({ type, label }) => (
          <div key={type} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: resourceTypeColors[type] }}
            />
            <span className="text-[11px] text-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Layout via dagre ─────────────────────────────────────────

const NODE_WIDTH = 220;
const NODE_HEIGHT = 60;

function layoutNodes(
  nodes: LineageNodeType[],
  edges: { source: string; target: string }[],
  rootId: string
): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 80, marginx: 20, marginy: 20 });

  for (const n of nodes) {
    g.setNode(n.uniqueId, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const e of edges) {
    g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.uniqueId);
    return {
      id: n.uniqueId,
      type: "lineageNode",
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      data: {
        uniqueId: n.uniqueId,
        name: n.name,
        resourceType: n.resourceType,
        status: n.status,
        lastRunDuration: n.lastRunDuration,
        hasDescription: n.hasDescription,
        testCount: n.testCount,
        failingTestCount: n.failingTestCount,
        isRoot: n.uniqueId === rootId,
      } satisfies LineageNodeData,
    };
  });
}

// ── Resource type filter options ─────────────────────────────

const resourceTypeFilters: { type: ResourceType; label: string }[] = [
  { type: "model", label: "Models" },
  { type: "source", label: "Sources" },
  { type: "semantic_model", label: "Semantic Models" },
  { type: "metric", label: "Metrics" },
  { type: "seed", label: "Seeds" },
  { type: "snapshot", label: "Snapshots" },
  { type: "exposure", label: "Exposures" },
];

// ── Mode descriptions ────────────────────────────────────────

type LineageMode = "impact" | "root_cause" | "consumption";
const modeConfig: Record<
  LineageMode,
  { label: string; icon: typeof Crosshair; direction: "downstream" | "upstream" | "both" }
> = {
  impact: {
    label: "Impact Analysis",
    icon: Crosshair,
    direction: "downstream",
  },
  root_cause: {
    label: "Root Cause",
    icon: ShieldAlert,
    direction: "upstream",
  },
  consumption: {
    label: "Consumption",
    icon: Zap,
    direction: "both",
  },
};

// ── Page Component ───────────────────────────────────────────

export default function LineagePage() {
  // Asset combobox state
  const [assetSearch, setAssetSearch] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [comboOpen, setComboOpen] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);

  // Controls
  const [depth, setDepth] = useState(3);
  const [direction, setDirection] = useState<"upstream" | "downstream" | "both">(
    "both"
  );
  const [mode, setMode] = useState<LineageMode>("consumption");
  const [enabledTypes, setEnabledTypes] = useState<Set<ResourceType>>(
    new Set(resourceTypeFilters.map((r) => r.type))
  );

  // Panel
  const [selectedNode, setSelectedNode] = useState<LineageNodeType | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  // React Flow state
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<Node>([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Data
  const assetsQuery = useAssets();
  const lineageQuery = useLineage(
    selectedAssetId,
    depth,
    mode !== "consumption" ? modeConfig[mode].direction : direction
  );

  // Only types that participate in DAG lineage
  const LINEAGE_TYPES = new Set<ResourceType>(["model", "source", "seed", "snapshot", "semantic_model", "metric"]);

  // All lineage-eligible assets sorted alphabetically
  const sortedAssets = useMemo(() => {
    if (!assetsQuery.data) return [];
    return [...assetsQuery.data]
      .filter((a) => LINEAGE_TYPES.has(a.resourceType))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [assetsQuery.data]);

  // Assets filtered by search query
  const filteredAssets = useMemo(() => {
    if (!assetSearch.trim()) return sortedAssets;
    const q = assetSearch.toLowerCase();
    return sortedAssets.filter(
      (a) => a.name.toLowerCase().includes(q) || a.resourceType.includes(q)
    );
  }, [sortedAssets, assetSearch]);

  // Label for the currently selected asset
  const selectedAssetName = useMemo(
    () => sortedAssets.find((a) => a.uniqueId === selectedAssetId)?.name ?? "",
    [sortedAssets, selectedAssetId]
  );

  // Close combobox on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as globalThis.Node)) {
        setComboOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Toggle resource type filter
  const toggleType = useCallback((type: ResourceType) => {
    setEnabledTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  // When mode changes, update direction
  useEffect(() => {
    if (mode !== "consumption") {
      setDirection(modeConfig[mode].direction);
    }
  }, [mode]);

  // Convert lineage data to React Flow format
  useEffect(() => {
    if (!lineageQuery.data || !selectedAssetId) {
      setFlowNodes([]);
      setFlowEdges([]);
      return;
    }

    const { nodes: rawNodes, edges: rawEdges } = lineageQuery.data;

    // Filter by enabled types
    const filteredNodes = rawNodes.filter((n) => enabledTypes.has(n.resourceType));
    const filteredNodeIds = new Set(filteredNodes.map((n) => n.uniqueId));
    const filteredEdges = rawEdges.filter(
      (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
    );

    // Layout
    const laidOutNodes = layoutNodes(
      filteredNodes,
      filteredEdges,
      selectedAssetId
    );

    const rfEdges: Edge[] = filteredEdges.map((e) => ({
      id: `${e.source}__${e.target}`,
      source: e.source,
      target: e.target,
      type: "smoothstep",
      animated: false,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 16,
      },
      style: { stroke: "#94a3b8", strokeWidth: 1.5 },
    }));

    setFlowNodes(laidOutNodes);
    setFlowEdges(rfEdges);
  }, [lineageQuery.data, selectedAssetId, enabledTypes, setFlowNodes, setFlowEdges]);

  // Handle node click
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const rawNodes = lineageQuery.data?.nodes ?? [];
      const found = rawNodes.find((n) => n.uniqueId === node.id);
      if (found) {
        setSelectedNode(found);
        setPanelOpen(true);
      }
    },
    [lineageQuery.data]
  );

  // Compute upstream/downstream counts for selected node
  const selectedNodeCounts = useMemo(() => {
    if (!selectedNode || !lineageQuery.data) {
      return { upstream: 0, downstream: 0 };
    }
    const { edges } = lineageQuery.data;
    const upstream = edges.filter(
      (e) => e.target === selectedNode.uniqueId
    ).length;
    const downstream = edges.filter(
      (e) => e.source === selectedNode.uniqueId
    ).length;
    return { upstream, downstream };
  }, [selectedNode, lineageQuery.data]);

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Lineage Explorer
        </h2>
        <p className="text-muted-foreground mt-1">
          Visualize upstream and downstream dependencies across your dbt
          project.
        </p>
      </div>

      {/* Controls bar */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Row 1: Asset combobox + depth + direction */}
          <div className="flex flex-wrap items-end gap-3">
            {/* Asset combobox */}
            <div className="w-80" ref={comboRef}>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Starting Asset
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder={assetsQuery.isLoading ? "Loading assets…" : "Search assets…"}
                  value={comboOpen ? assetSearch : selectedAssetName}
                  onChange={(e) => {
                    setAssetSearch(e.target.value);
                    setComboOpen(true);
                  }}
                  onFocus={() => {
                    setAssetSearch("");
                    setComboOpen(true);
                  }}
                  className="pl-9 pr-8"
                  disabled={assetsQuery.isLoading}
                />
                {selectedAssetId && !comboOpen && (
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => { setSelectedAssetId(""); setAssetSearch(""); }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {comboOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-72 overflow-y-auto">
                    {filteredAssets.length === 0 ? (
                      <p className="px-3 py-4 text-sm text-muted-foreground text-center">No assets found.</p>
                    ) : (
                      filteredAssets.map((a) => (
                        <button
                          key={a.uniqueId}
                          type="button"
                          className={cn(
                            "flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
                            a.uniqueId === selectedAssetId && "bg-accent"
                          )}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedAssetId(a.uniqueId);
                            setAssetSearch("");
                            setComboOpen(false);
                          }}
                        >
                          <span className="font-medium truncate flex-1">{a.name}</span>
                          <span className="text-xs text-muted-foreground capitalize shrink-0">
                            {a.resourceType.replace("_", " ")}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Depth */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Depth
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((d) => (
                  <Button
                    key={d}
                    variant={depth === d ? "default" : "outline"}
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => setDepth(d)}
                  >
                    {d}
                  </Button>
                ))}
              </div>
            </div>

            {/* Direction */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Direction
              </label>
              <div className="flex items-center gap-1">
                <Button
                  variant={direction === "upstream" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setDirection("upstream");
                    setMode("consumption");
                  }}
                >
                  <ArrowUpRight className="mr-1 h-3.5 w-3.5" />
                  Upstream
                </Button>
                <Button
                  variant={direction === "downstream" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setDirection("downstream");
                    setMode("consumption");
                  }}
                >
                  <ArrowDownRight className="mr-1 h-3.5 w-3.5" />
                  Downstream
                </Button>
                <Button
                  variant={direction === "both" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setDirection("both");
                    setMode("consumption");
                  }}
                >
                  <ArrowLeftRight className="mr-1 h-3.5 w-3.5" />
                  Both
                </Button>
              </div>
            </div>
          </div>

          {/* Row 2: Mode + resource type filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Mode */}
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-muted-foreground mr-1">
                Mode:
              </span>
              {(
                Object.entries(modeConfig) as [
                  LineageMode,
                  (typeof modeConfig)[LineageMode]
                ][]
              ).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <Button
                    key={key}
                    variant={mode === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMode(key)}
                  >
                    <Icon className="mr-1 h-3.5 w-3.5" />
                    {config.label}
                  </Button>
                );
              })}
            </div>

            {/* Resource type filters */}
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-xs font-medium text-muted-foreground mr-1">
                Types:
              </span>
              {resourceTypeFilters.map((rt) => (
                <Badge
                  key={rt.type}
                  variant={enabledTypes.has(rt.type) ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer select-none transition-colors",
                    enabledTypes.has(rt.type)
                      ? ""
                      : "opacity-50"
                  )}
                  onClick={() => toggleType(rt.type)}
                >
                  {rt.label}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Graph area */}
      {!selectedAssetId ? (
        <EmptyState
          icon={Layers}
          title="Select a starting asset"
          description="Choose a project and asset above to explore its lineage graph."
        />
      ) : lineageQuery.isError ? (
        <EmptyState
          icon={ShieldAlert}
          title="Failed to load lineage"
          description={(lineageQuery.error as Error)?.message ?? "An error occurred loading the lineage graph."}
        />
      ) : lineageQuery.isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-32">
            <div className="text-center">
              <div className="h-8 w-8 mx-auto mb-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-sm text-muted-foreground">
                Building lineage graph...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="h-[600px] w-full relative">
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.15 }}
              minZoom={0.1}
              maxZoom={2}
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={16} size={1} />
              <Controls />
              <MiniMap
                nodeColor={(node) => {
                  const data = node.data as unknown as LineageNodeData;
                  return resourceTypeColors[data.resourceType] ?? "#71717a";
                }}
                maskColor="rgba(0,0,0,0.1)"
                className="!bg-background/80"
              />
            </ReactFlow>
            <LineageLegend />
          </div>
        </Card>
      )}

      {/* Side panel for selected node */}
      <SidePanel
        open={panelOpen}
        onClose={() => {
          setPanelOpen(false);
          setSelectedNode(null);
        }}
        title={selectedNode?.name ?? "Node Details"}
      >
        {selectedNode && (
          <LineageDetailPanel
            node={selectedNode}
            upstreamCount={selectedNodeCounts.upstream}
            downstreamCount={selectedNodeCounts.downstream}
          />
        )}
      </SidePanel>

      {/* API Surface Callout */}
      <ApiSurfaceCallout
        title="Powered by Discovery API -- lineage, parents, children"
        endpoints={[
          "Discovery API (GraphQL) -- query { environment { applied { models { ... } } } }",
          "Discovery API (GraphQL) -- lineage query with parents and children traversal",
          "Discovery API (GraphQL) -- node metadata, test counts, execution status",
        ]}
      />
    </div>
  );
}

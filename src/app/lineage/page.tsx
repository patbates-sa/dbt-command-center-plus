"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
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

import {
  Search,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Crosshair,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { useAssets, useLineage } from "@/lib/hooks";
import type { ResourceType, LineageNode as LineageNodeType } from "@/types";
import { cn } from "@/lib/utils/cn";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

// ── Color map for minimap ────────────────────────────────────

const minimapColorMap: Record<ResourceType, string> = {
  model: "#3b82f6",
  source: "#22c55e",
  exposure: "#a855f7",
  metric: "#f97316",
  semantic_model: "#6366f1",
  test: "#10b981",
  seed: "#84cc16",
  snapshot: "#f59e0b",
};

// ── Layout helper (simple dagre-like layering) ───────────────

function layoutNodes(
  nodes: LineageNodeType[],
  edges: { source: string; target: string }[],
  rootId: string
): Node[] {
  // Build adjacency
  const children = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  for (const e of edges) {
    if (!children.has(e.source)) children.set(e.source, []);
    children.get(e.source)!.push(e.target);
    if (!parents.has(e.target)) parents.set(e.target, []);
    parents.get(e.target)!.push(e.source);
  }

  // Assign layers via BFS from root (both directions)
  const layerMap = new Map<string, number>();
  layerMap.set(rootId, 0);

  // BFS upstream (negative layers)
  const upQueue = [rootId];
  const visited = new Set([rootId]);
  while (upQueue.length > 0) {
    const current = upQueue.shift()!;
    const currentLayer = layerMap.get(current) ?? 0;
    for (const p of parents.get(current) ?? []) {
      if (!visited.has(p)) {
        visited.add(p);
        layerMap.set(p, currentLayer - 1);
        upQueue.push(p);
      }
    }
  }

  // BFS downstream (positive layers)
  const downQueue = [rootId];
  const visited2 = new Set([rootId]);
  while (downQueue.length > 0) {
    const current = downQueue.shift()!;
    const currentLayer = layerMap.get(current) ?? 0;
    for (const c of children.get(current) ?? []) {
      if (!visited2.has(c)) {
        visited2.add(c);
        layerMap.set(c, currentLayer + 1);
        downQueue.push(c);
      }
    }
  }

  // Any remaining nodes not connected
  for (const n of nodes) {
    if (!layerMap.has(n.uniqueId)) {
      layerMap.set(n.uniqueId, 0);
    }
  }

  // Group by layer
  const layers = new Map<number, string[]>();
  for (const [id, layer] of layerMap) {
    if (!layers.has(layer)) layers.set(layer, []);
    layers.get(layer)!.push(id);
  }

  const sortedLayers = Array.from(layers.keys()).sort((a, b) => a - b);
  const minLayer = sortedLayers[0] ?? 0;

  const xSpacing = 280;
  const ySpacing = 80;

  const nodeMap = new Map(nodes.map((n) => [n.uniqueId, n]));
  const result: Node[] = [];

  for (const layer of sortedLayers) {
    const ids = layers.get(layer) ?? [];
    const x = (layer - minLayer) * xSpacing;
    const totalHeight = (ids.length - 1) * ySpacing;
    const startY = -totalHeight / 2;

    ids.forEach((id, idx) => {
      const nodeData = nodeMap.get(id);
      if (!nodeData) return;
      result.push({
        id: nodeData.uniqueId,
        type: "lineageNode",
        position: { x, y: startY + idx * ySpacing },
        data: {
          uniqueId: nodeData.uniqueId,
          name: nodeData.name,
          resourceType: nodeData.resourceType,
          status: nodeData.status,
          lastRunDuration: nodeData.lastRunDuration,
          hasDescription: nodeData.hasDescription,
          testCount: nodeData.testCount,
          failingTestCount: nodeData.failingTestCount,
          isRoot: nodeData.uniqueId === rootId,
        } satisfies LineageNodeData,
      });
    });
  }

  return result;
}

// ── Resource type filter options ─────────────────────────────

const resourceTypeFilters: { type: ResourceType; label: string }[] = [
  { type: "model", label: "Models" },
  { type: "source", label: "Sources" },
  { type: "exposure", label: "Exposures" },
  { type: "metric", label: "Metrics" },
  { type: "seed", label: "Seeds" },
  { type: "snapshot", label: "Snapshots" },
  { type: "test", label: "Tests" },
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
  // Search state
  const [assetSearch, setAssetSearch] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

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
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState([]);

  // Data
  const assetsQuery = useAssets();
  const lineageQuery = useLineage(
    selectedAssetId,
    depth,
    mode !== "consumption" ? modeConfig[mode].direction : direction
  );

  // Filtered assets for search dropdown
  const filteredAssets = useMemo(() => {
    if (!assetsQuery.data || !assetSearch) return [];
    const q = assetSearch.toLowerCase();
    return assetsQuery.data
      .filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.uniqueId.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [assetsQuery.data, assetSearch]);

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
          {/* Row 1: Search + depth + direction */}
          <div className="flex flex-wrap items-end gap-3">
            {/* Asset search */}
            <div className="relative w-72">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Starting Asset
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search for an asset..."
                  value={assetSearch}
                  onChange={(e) => {
                    setAssetSearch(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="pl-9"
                />
              </div>
              {/* Dropdown */}
              {showDropdown && filteredAssets.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-60 overflow-y-auto">
                  {filteredAssets.map((a) => (
                    <button
                      key={a.uniqueId}
                      type="button"
                      className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                      onClick={() => {
                        setSelectedAssetId(a.uniqueId);
                        setAssetSearch(a.name);
                        setShowDropdown(false);
                      }}
                    >
                      <span className="font-medium truncate">{a.name}</span>
                      <span className="text-xs text-muted-foreground capitalize shrink-0">
                        {a.resourceType.replace("_", " ")}
                      </span>
                    </button>
                  ))}
                </div>
              )}
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
          icon={Search}
          title="Select a starting asset"
          description="Use the search above to pick a dbt asset, then explore its lineage graph."
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
          <div className="h-[600px] w-full">
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.1}
              maxZoom={2}
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={16} size={1} />
              <Controls />
              <MiniMap
                nodeColor={(node) => {
                  const data = node.data as unknown as LineageNodeData;
                  return minimapColorMap[data.resourceType] ?? "#71717a";
                }}
                maskColor="rgba(0,0,0,0.1)"
                className="!bg-background/80"
              />
            </ReactFlow>
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

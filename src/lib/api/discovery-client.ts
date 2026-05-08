// ============================================================
// dbt Command Center — Discovery API (GraphQL) Client
// ============================================================

import type {
  DbtAsset,
  DbtExposure,
  LineageGraph,
  LineageNode,
  LineageEdge,
  ResourceType,
} from "@/types";

// ─── GraphQL response shapes ────────────────────────────────

interface GraphQLResponse<T = unknown> {
  data: T;
  errors?: Array<{ message: string; path?: string[]; extensions?: unknown }>;
}

// ─── Filter types ───────────────────────────────────────────

export interface DiscoveryAssetFilters {
  resourceType?: ResourceType | ResourceType[];
  search?: string;
  tags?: string[];
  first?: number;
  after?: string;
}

export interface DiscoveryTestFilters {
  status?: string;
  testType?: string;
  first?: number;
}

// ─── Test result shape ──────────────────────────────────────

export interface DiscoveryTestResult {
  uniqueId: string;
  name: string;
  status?: string;
  executionTime?: number;
  dependsOn: string[];
}

// ─── Client ─────────────────────────────────────────────────

export class DbtDiscoveryClient {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(_url: string, _token: string) {}

  // ── Private GraphQL transport ──

  private async query<T>(
    gql: string,
    variables: Record<string, unknown> = {},
  ): Promise<T> {
    const tag = `[DbtDiscoveryClient] GraphQL query`;
    console.debug(tag, { variables });

    const res = await fetch("/api/discovery", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: gql, variables }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `${tag} failed with status ${res.status}: ${res.statusText}. ${text}`,
      );
    }

    const json = (await res.json()) as GraphQLResponse<T>;

    if (json.errors && json.errors.length > 0) {
      const messages = json.errors.map((e) => e.message).join("; ");
      throw new Error(`${tag} GraphQL errors: ${messages}`);
    }

    return json.data;
  }

  // ── Assets (models, sources, seeds, snapshots, exposures) ──
  // Field names vary per resource type — tested against actual Discovery API schema.

  async getAssets(
    environmentId: string,
    filters?: DiscoveryAssetFilters,
  ): Promise<DbtAsset[]> {
    const requestedTypes: string[] = filters?.resourceType
      ? Array.isArray(filters.resourceType)
        ? filters.resourceType
        : [filters.resourceType]
      : ["model", "source", "seed", "snapshot", "exposure", "semantic_model"];

    const first = filters?.first ?? 200;

    // Inline query blocks per type, using only fields confirmed to exist on each node type.
    const modelBlock = `
      models(first: ${first}) { edges { node {
        uniqueId name resourceType packageName description
        schema database tags meta filePath materializedType
        executionInfo { lastRunId lastRunStatus executionTime }
        parents { uniqueId } children { uniqueId } tests { uniqueId }
        catalog { columns { name description type } }
      } } }`;

    const sourceBlock = `
      sources(first: ${first}) { edges { node {
        uniqueId name resourceType description
        schema database tags meta filePath
        catalog { columns { name description type } }
      } } }`;

    const seedBlock = `
      seeds(first: ${first}) { edges { node {
        uniqueId name resourceType packageName description
        schema database tags meta filePath
        executionInfo { lastRunId lastRunStatus executionTime }
        catalog { columns { name description type } }
      } } }`;

    const snapshotBlock = `
      snapshots(first: ${first}) { edges { node {
        uniqueId name resourceType packageName description
        schema database tags meta filePath
        executionInfo { lastRunId lastRunStatus executionTime }
        parents { uniqueId } children { uniqueId } tests { uniqueId }
        catalog { columns { name description type } }
      } } }`;

    const exposureBlock = `
      exposures(first: ${first}) { edges { node {
        uniqueId name resourceType packageName description tags meta filePath
      } } }`;

    const blocksByType: Record<string, string> = {
      model: modelBlock,
      source: sourceBlock,
      seed: seedBlock,
      snapshot: snapshotBlock,
      exposure: exposureBlock,
    };

    const wantsSemanticModels = requestedTypes.includes("semantic_model");
    const appliedTypes = requestedTypes.filter((t) => t !== "semantic_model");

    const appliedBlocks = appliedTypes
      .filter((t) => blocksByType[t])
      .map((t) => blocksByType[t])
      .join("\n");

    const testStatusBlock = `
      tests(first: 500) { edges { node {
        uniqueId
        executionInfo { lastRunStatus }
      } } }`;

    const semanticModelBlock = wantsSemanticModels ? `
      definition {
        semanticModels(first: 200) { edges { node {
          uniqueId name resourceType description
          parents { uniqueId }
        } } }
      }` : "";

    if (!appliedBlocks && !wantsSemanticModels) return [];

    const appliedSection = appliedBlocks
      ? `applied { ${appliedBlocks} ${testStatusBlock} }`
      : "";

    const gql = `
      query GetAssets($environmentId: BigInt!) {
        environment(id: $environmentId) {
          ${appliedSection}
          ${semanticModelBlock}
        }
      }
    `;

    interface ExecInfo { lastRunId?: number | string; lastRunStatus?: string; executionTime?: number; }
    interface ColInfo { name: string; description?: string | null; type?: string; }
    interface RawNode {
      uniqueId: string; name: string; resourceType: string;
      packageName?: string; description?: string | null;
      schema?: string; database?: string;
      tags?: string[]; meta?: Record<string, unknown>;
      filePath?: string; materializedType?: string;
      executionInfo?: ExecInfo;
      parents?: Array<{ uniqueId: string }>;
      children?: Array<{ uniqueId: string }>;
      tests?: Array<{ uniqueId: string }>;
      catalog?: { columns?: ColInfo[] };
    }
    interface RawTestStatusNode { uniqueId: string; executionInfo?: { lastRunStatus?: string } }
    interface Conn { edges: Array<{ node: RawNode }> }
    interface TestStatusConn { edges: Array<{ node: RawTestStatusNode }> }
    interface Applied { models?: Conn; sources?: Conn; seeds?: Conn; snapshots?: Conn; exposures?: Conn; tests?: TestStatusConn; }
    interface AssetsResponse {
      environment: {
        applied?: Applied;
        definition?: { semanticModels?: Conn };
      }
    }

    const data = await this.query<AssetsResponse>(gql, { environmentId });
    const applied = data.environment.applied ?? {} as Applied;

    // Build a status map from the top-level tests query
    const testStatusMap = new Map<string, string>();
    for (const { node } of applied.tests?.edges ?? []) {
      if (node.executionInfo?.lastRunStatus) {
        testStatusMap.set(node.uniqueId, node.executionInfo.lastRunStatus);
      }
    }

    const connFields: Array<keyof Applied> = ["models", "sources", "seeds", "snapshots", "exposures"];
    const allNodes: DbtAsset[] = [];

    for (const field of connFields) {
      const conn = applied[field] as Conn | undefined;
      if (!conn) continue;
      for (const { node } of conn.edges) {
        const tests = node.tests ?? [];
        const cols = node.catalog?.columns ?? [];
        const passingTestCount = tests.filter((t) => {
          const s = testStatusMap.get(t.uniqueId);
          return s === "pass" || s === "success" || s === "reused";
        }).length;
        const failingTestCount = tests.filter((t) => {
          const s = testStatusMap.get(t.uniqueId);
          return s === "fail" || s === "error";
        }).length;
        allNodes.push({
          uniqueId: node.uniqueId,
          name: node.name,
          resourceType: node.resourceType as DbtAsset["resourceType"],
          packageName: node.packageName ?? "",
          description: node.description ?? undefined,
          schema: node.schema,
          database: node.database,
          tags: node.tags ?? [],
          meta: node.meta ?? {},
          materialization: node.materializedType as DbtAsset["materialization"],
          filePath: node.filePath,
          columns: cols.map((c) => ({
            name: c.name,
            description: c.description ?? undefined,
            type: c.type,
          })),
          executionInfo: node.executionInfo
            ? {
                lastRunStatus: node.executionInfo.lastRunStatus as import("@/types").RunStatus | undefined,
                lastRunDuration: node.executionInfo.executionTime,
                lastRunId:
                  node.executionInfo.lastRunId != null
                    ? String(node.executionInfo.lastRunId)
                    : undefined,
              }
            : undefined,
          upstreamCount: node.parents?.length ?? 0,
          downstreamCount: node.children?.length ?? 0,
          testCount: tests.length,
          passingTestCount,
          failingTestCount,
          hasDescription: !!(node.description),
          documentedColumns: cols.filter((c) => !!c.description).length,
          totalColumns: cols.length,
        });
      }
    }

    // Append semantic models from definition state
    for (const { node } of data.environment.definition?.semanticModels?.edges ?? []) {
      allNodes.push({
        uniqueId: node.uniqueId,
        name: node.name,
        resourceType: "semantic_model",
        packageName: "",
        description: node.description ?? undefined,
        tags: [],
        meta: {},
        columns: [],
        upstreamCount: node.parents?.length ?? 0,
        downstreamCount: 0,
        testCount: 0,
        passingTestCount: 0,
        failingTestCount: 0,
        hasDescription: !!(node.description),
        documentedColumns: 0,
        totalColumns: 0,
      });
    }

    return allNodes;
  }

  // ── Single asset detail ──
  // Route to the correct per-type query by parsing the uniqueId prefix.

  async getAsset(
    environmentId: string,
    uniqueId: string,
  ): Promise<DbtAsset | null> {
    const prefix = uniqueId.split(".")[0];

    // Semantic models live in definition state, not applied — handle separately
    if (prefix === "semantic_model") {
      return this.getSemanticModelAsset(environmentId, uniqueId);
    }

    const typeFieldMap: Record<string, string> = {
      model: "models",
      source: "sources",
      seed: "seeds",
      snapshot: "snapshots",
      exposure: "exposures",
      metric: "metrics",
      test: "tests",
    };
    const fieldName = typeFieldMap[prefix] ?? "models";

    // Field sets per type (confirmed against actual schema)
    const modelFields = `
      uniqueId name resourceType packageName description group
      schema database tags meta filePath materializedType rawCode compiledCode
      executionInfo { lastRunId lastRunStatus executionTime }
      parents { uniqueId name resourceType }
      children { uniqueId name resourceType }
      tests { uniqueId name }
      catalog { columns { name description type meta tags } }
    `;
    const sourceFields = `
      uniqueId name resourceType description schema database tags meta filePath
      catalog { columns { name description type } }
    `;
    const seedFields = `
      uniqueId name resourceType packageName description schema database tags meta filePath
      executionInfo { lastRunId lastRunStatus executionTime }
      tests { uniqueId name }
      catalog { columns { name description type } }
    `;
    const snapshotFields = `
      uniqueId name resourceType packageName description schema database tags meta filePath
      executionInfo { lastRunId lastRunStatus executionTime }
      parents { uniqueId name resourceType }
      children { uniqueId name resourceType }
      tests { uniqueId name }
      catalog { columns { name description type } }
    `;
    const simpleFields = `
      uniqueId name resourceType packageName description tags meta filePath
    `;

    const fieldSetByType: Record<string, string> = {
      models: modelFields,
      sources: sourceFields,
      seeds: seedFields,
      snapshots: snapshotFields,
    };
    const fields = fieldSetByType[fieldName] ?? simpleFields;

    const gql = `
      query GetAsset($environmentId: BigInt!, $uniqueId: String!) {
        environment(id: $environmentId) {
          applied {
            ${fieldName}(first: 1, filter: { uniqueIds: [$uniqueId] }) {
              edges { node { ${fields} } }
            }
          }
        }
      }
    `;

    interface ColInfo { name: string; description?: string | null; type?: string; meta?: unknown; tags?: string[]; }
    interface RelNode { uniqueId: string; name: string; resourceType: string; }
    interface TestNode { uniqueId: string; name?: string; }
    interface ExecInfo { lastRunId?: number | string; lastRunStatus?: string; executionTime?: number; }
    interface RawNode {
      uniqueId: string; name: string; resourceType: string;
      packageName?: string; description?: string | null; group?: string;
      schema?: string; database?: string; tags?: string[]; meta?: Record<string, unknown>;
      filePath?: string; materializedType?: string; rawCode?: string; compiledCode?: string;
      executionInfo?: ExecInfo;
      parents?: RelNode[]; children?: RelNode[]; tests?: TestNode[];
      catalog?: { columns?: ColInfo[] };
    }
    interface AssetResponse {
      environment: { applied: Record<string, { edges: Array<{ node: RawNode }> }> }
    }

    const data = await this.query<AssetResponse>(gql, { environmentId, uniqueId });
    const edges = data.environment.applied[fieldName]?.edges ?? [];
    if (edges.length === 0) return null;

    const node = edges[0].node;
    const cols = node.catalog?.columns ?? [];
    const rawTests = node.tests ?? [];

    const testsWithStatus = rawTests.map((t) => ({
      uniqueId: t.uniqueId,
      name: t.name ?? "",
    }));
    // Discovery API TestAppliedStateNode does not expose execution status —
    // counts remain 0 until a run-artifact-based approach is added.
    const passingTestCount = 0;
    const failingTestCount = 0;

    return {
      uniqueId: node.uniqueId,
      name: node.name,
      resourceType: node.resourceType as DbtAsset["resourceType"],
      packageName: node.packageName ?? "",
      description: node.description ?? undefined,
      group: node.group,
      schema: node.schema,
      database: node.database,
      tags: node.tags ?? [],
      meta: node.meta ?? {},
      materialization: node.materializedType as DbtAsset["materialization"],
      filePath: node.filePath,
      rawCode: node.rawCode,
      compiledCode: node.compiledCode,
      columns: cols.map((c) => ({
        name: c.name,
        description: c.description ?? undefined,
        type: c.type,
        meta: c.meta as Record<string, unknown> | undefined,
        tags: c.tags,
      })),
      executionInfo: node.executionInfo
        ? {
            lastRunStatus: node.executionInfo.lastRunStatus as import("@/types").RunStatus | undefined,
            lastRunDuration: node.executionInfo.executionTime,
            lastRunId: node.executionInfo.lastRunId != null ? String(node.executionInfo.lastRunId) : undefined,
          }
        : undefined,
      parentNodes: node.parents?.map((p) => ({
        uniqueId: p.uniqueId,
        name: p.name,
        resourceType: p.resourceType,
      })),
      upstreamCount: node.parents?.length ?? 0,
      downstreamCount: node.children?.length ?? 0,
      testCount: rawTests.length,
      passingTestCount,
      failingTestCount,
      tests: testsWithStatus,
      hasDescription: !!(node.description),
      documentedColumns: cols.filter((c) => !!c.description).length,
      totalColumns: cols.length,
    };
  }

  // ── Semantic model detail (definition state) ──

  private async getSemanticModelAsset(
    environmentId: string,
    uniqueId: string,
  ): Promise<DbtAsset | null> {
    // Fetch all semantic models and match client-side — definition.semanticModels
    // filter argument support is not guaranteed, so avoid server-side filtering.
    const gql = `
      query GetSemanticModel($environmentId: BigInt!) {
        environment(id: $environmentId) {
          definition {
            semanticModels(first: 200) {
              edges { node {
                uniqueId name resourceType description
                parents { uniqueId name resourceType }
                measures { name description agg }
                dimensions { name description type }
                entities { name description type }
              } }
            }
          }
        }
      }
    `;

    interface RawMeasure { name: string; description?: string | null; agg?: string }
    interface RawDimension { name: string; description?: string | null; type?: string }
    interface RawEntity { name: string; description?: string | null; type?: string }
    interface RawParent { uniqueId: string; name: string; resourceType: string }
    interface RawSemNode {
      uniqueId: string; name: string; resourceType: string; description?: string | null;
      parents?: RawParent[];
      measures?: RawMeasure[];
      dimensions?: RawDimension[];
      entities?: RawEntity[];
    }
    interface SemResponse {
      environment: { definition: { semanticModels: { edges: Array<{ node: RawSemNode }> } } }
    }

    const data = await this.query<SemResponse>(gql, { environmentId });
    const all = data.environment.definition.semanticModels.edges;
    // Match by exact uniqueId, fall back to name-based match
    const name = uniqueId.split(".").at(-1);
    const match = all.find((e) => e.node.uniqueId === uniqueId) ??
      all.find((e) => e.node.name === name);
    const edges = match ? [match] : [];
    if (edges.length === 0) return null;

    const node = edges[0].node;
    return {
      uniqueId: node.uniqueId,
      name: node.name,
      resourceType: "semantic_model",
      packageName: "",
      description: node.description ?? undefined,
      tags: [],
      meta: {},
      columns: [],
      parentNodes: node.parents?.map((p) => ({ uniqueId: p.uniqueId, name: p.name, resourceType: p.resourceType })),
      upstreamCount: node.parents?.length ?? 0,
      downstreamCount: 0,
      testCount: 0,
      passingTestCount: 0,
      failingTestCount: 0,
      hasDescription: !!(node.description),
      documentedColumns: 0,
      totalColumns: 0,
      measures: node.measures?.map((m) => ({ name: m.name, description: m.description ?? undefined, agg: m.agg })),
      dimensions: node.dimensions?.map((d) => ({ name: d.name, description: d.description ?? undefined, type: d.type })),
      entities: node.entities?.map((e) => ({ name: e.name, description: e.description ?? undefined, type: e.type })),
    };
  }

  // ── Lineage ──
  // The Discovery API no longer provides a graph traversal endpoint.
  // We fetch all models/sources with parent/child refs and build the graph client-side.

  async getLineage(
    environmentId: string,
    rootUniqueId: string,
    depth: number = 3,
  ): Promise<LineageGraph> {
    const gql = `
      query GetLineage($environmentId: BigInt!) {
        environment(id: $environmentId) {
          applied {
            models(first: 500) { edges { node {
              uniqueId name resourceType packageName description
              schema database filePath materializedType
              executionInfo { lastRunStatus executionTime }
              parents { uniqueId }
              children { uniqueId }
              tests { uniqueId }
            } } }
            sources(first: 500) { edges { node {
              uniqueId name resourceType description schema database filePath
            } } }
            seeds(first: 200) { edges { node {
              uniqueId name resourceType description schema database filePath
              executionInfo { lastRunStatus executionTime }
              tests { uniqueId }
            } } }
            snapshots(first: 200) { edges { node {
              uniqueId name resourceType description schema database filePath
              executionInfo { lastRunStatus executionTime }
              parents { uniqueId }
              children { uniqueId }
              tests { uniqueId }
            } } }
          }
          definition {
            semanticModels(first: 200) { edges { node {
              uniqueId name resourceType description
              parents { uniqueId }
            } } }
            metrics(first: 200) { edges { node {
              uniqueId name resourceType description
              parents { uniqueId }
            } } }
          }
        }
      }
    `;

    interface RawLineageNode {
      uniqueId: string; name: string; resourceType: string;
      description?: string | null; schema?: string; database?: string;
      filePath?: string; materializedType?: string;
      executionInfo?: { lastRunStatus?: string; executionTime?: number };
      parents?: Array<{ uniqueId: string }>;
      children?: Array<{ uniqueId: string }>;
      tests?: Array<{ uniqueId: string }>;
    }
    interface Conn { edges: Array<{ node: RawLineageNode }> }
    interface LineageAllResponse {
      environment: {
        applied: { models?: Conn; sources?: Conn; seeds?: Conn; snapshots?: Conn }
        definition: { semanticModels?: Conn; metrics?: Conn }
      }
    }

    const data = await this.query<LineageAllResponse>(gql, { environmentId });
    const applied = data.environment.applied;
    const definition = data.environment.definition;

    // Collect all nodes into a lookup map
    const nodeMap = new Map<string, RawLineageNode>();
    for (const field of ["models", "sources", "seeds", "snapshots"] as const) {
      for (const { node } of applied[field]?.edges ?? []) {
        nodeMap.set(node.uniqueId, node);
      }
    }
    for (const field of ["semanticModels", "metrics"] as const) {
      for (const { node } of definition[field]?.edges ?? []) {
        nodeMap.set(node.uniqueId, node);
      }
    }

    // Build parent→child and child→parent adjacency.
    // Models/snapshots use parents[] (objects); semantic models and metrics use dependsOn[] (strings).
    const parentOf = new Map<string, string[]>(); // childId → parentIds
    const childOf = new Map<string, string[]>();   // parentId → childIds

    function addEdge(childId: string, parentId: string) {
      if (!parentOf.has(childId)) parentOf.set(childId, []);
      parentOf.get(childId)!.push(parentId);
      if (!childOf.has(parentId)) childOf.set(parentId, []);
      childOf.get(parentId)!.push(childId);
    }

    for (const { node } of [...(applied.models?.edges ?? []), ...(applied.snapshots?.edges ?? [])]) {
      for (const p of node.parents ?? []) addEdge(node.uniqueId, p.uniqueId);
    }
    for (const { node } of [...(definition.semanticModels?.edges ?? []), ...(definition.metrics?.edges ?? [])]) {
      for (const p of node.parents ?? []) addEdge(node.uniqueId, p.uniqueId);
    }

    // Resolve root: semantic layer metrics use "metric.name" but Discovery API uses "metric.pkg.name"
    let effectiveRootId = rootUniqueId;
    if (!nodeMap.has(rootUniqueId)) {
      const prefix = rootUniqueId.split(".")[0];
      const name = rootUniqueId.split(".").at(-1);
      for (const [id] of nodeMap) {
        if (id.startsWith(prefix + ".") && id.endsWith("." + name)) {
          effectiveRootId = id;
          break;
        }
      }
    }

    // BFS both directions from root up to `depth` hops
    const visited = new Set<string>([effectiveRootId]);
    const queue: Array<{ id: string; hops: number }> = [{ id: effectiveRootId, hops: 0 }];
    while (queue.length > 0) {
      const { id, hops } = queue.shift()!;
      if (hops >= depth) continue;
      const neighbors = [...(parentOf.get(id) ?? []), ...(childOf.get(id) ?? [])];
      for (const nid of neighbors) {
        if (!visited.has(nid)) {
          visited.add(nid);
          queue.push({ id: nid, hops: hops + 1 });
        }
      }
    }

    // Collect edges within the visited subgraph
    const edges: LineageEdge[] = [];
    const edgeSeen = new Set<string>();
    for (const id of visited) {
      for (const parentId of parentOf.get(id) ?? []) {
        if (visited.has(parentId)) {
          const key = `${parentId}→${id}`;
          if (!edgeSeen.has(key)) {
            edgeSeen.add(key);
            edges.push({ source: parentId, target: id });
          }
        }
      }
    }

    // Build LineageNode array
    const nodes: LineageNode[] = [];
    for (const id of visited) {
      const raw = nodeMap.get(id);
      if (!raw) continue;
      const tests = raw.tests ?? [];
      nodes.push({
        id: raw.uniqueId,
        uniqueId: raw.uniqueId,
        name: raw.name,
        resourceType: raw.resourceType.toLowerCase() as LineageNode["resourceType"],
        materialization: raw.materializedType as LineageNode["materialization"],
        schema: raw.schema,
        database: raw.database,
        status: raw.executionInfo?.lastRunStatus as LineageNode["status"],
        lastRunDuration: raw.executionInfo?.executionTime,
        hasDescription: !!(raw.description),
        testCount: tests.length,
        failingTestCount: 0,
      });
    }

    return { nodes, edges };
  }

  // ── Column lineage (inferred by name matching across parent models) ──

  async getParentColumns(
    environmentId: string,
    parentNodes: Array<{ uniqueId: string; name: string; resourceType: string }>,
  ): Promise<Array<{ uniqueId: string; name: string; resourceType: string; columns: Array<{ name: string; type?: string; description?: string }> }>> {
    const modelIds = parentNodes.filter((p) => p.resourceType === "model").map((p) => p.uniqueId);
    const sourceIds = parentNodes.filter((p) => p.resourceType === "source").map((p) => p.uniqueId);

    const modelBlock = modelIds.length > 0
      ? `models(first: 50, filter: { uniqueIds: [${modelIds.map((id) => `"${id}"`).join(", ")}] }) { edges { node { uniqueId name resourceType catalog { columns { name type description } } } } }`
      : null;
    const sourceBlock = sourceIds.length > 0
      ? `sources(first: 50, filter: { uniqueIds: [${sourceIds.map((id) => `"${id}"`).join(", ")}] }) { edges { node { uniqueId name resourceType catalog { columns { name type description } } } } }`
      : null;

    const blocks = [modelBlock, sourceBlock].filter(Boolean).join("\n");
    if (!blocks) return [];

    const gql = `
      query GetParentColumns($environmentId: BigInt!) {
        environment(id: $environmentId) {
          applied {
            ${blocks}
          }
        }
      }
    `;

    interface ColNode { name: string; type?: string; description?: string | null }
    interface ParentNode { uniqueId: string; name: string; resourceType: string; catalog?: { columns?: ColNode[] } }
    interface Conn { edges: Array<{ node: ParentNode }> }
    interface Response { environment: { applied: { models?: Conn; sources?: Conn } } }

    const data = await this.query<Response>(gql, { environmentId });
    const applied = data.environment.applied;
    const results: Array<{ uniqueId: string; name: string; resourceType: string; columns: Array<{ name: string; type?: string; description?: string }> }> = [];

    for (const field of ["models", "sources"] as const) {
      for (const { node } of applied[field]?.edges ?? []) {
        results.push({
          uniqueId: node.uniqueId,
          name: node.name,
          resourceType: node.resourceType,
          columns: (node.catalog?.columns ?? []).map((c) => ({
            name: c.name,
            type: c.type,
            description: c.description ?? undefined,
          })),
        });
      }
    }

    return results;
  }

  // ── Exposures ──

  async getExposures(environmentId: string): Promise<DbtExposure[]> {
    const gql = `
      query GetExposures($environmentId: BigInt!) {
        environment(id: $environmentId) {
          applied {
            exposures {
              edges {
                node {
                  uniqueId
                  name
                  type
                  description
                  owner {
                    name
                    email
                  }
                  url
                  dependsOn
                  tags
                }
              }
            }
          }
        }
      }
    `;

    interface ExposuresResponse {
      environment: {
        applied: {
          exposures: {
            edges: Array<{ node: DbtExposure }>;
          };
        };
      };
    }

    const data = await this.query<ExposuresResponse>(gql, { environmentId });

    return data.environment.applied.exposures.edges.map((e) => e.node);
  }

  // ── Tests ──

  async getTests(
    environmentId: string,
    filters?: DiscoveryTestFilters,
  ): Promise<DiscoveryTestResult[]> {
    const gql = `
      query GetTests(
        $environmentId: BigInt!
        $first: Int
      ) {
        environment(id: $environmentId) {
          applied {
            tests(first: $first) {
              edges {
                node {
                  uniqueId
                  name
                  executionInfo { lastRunStatus executionTime }
                  dependsOn
                }
              }
            }
          }
        }
      }
    `;

    interface RawTestNode {
      uniqueId: string;
      name: string;
      executionInfo?: { lastRunStatus?: string; executionTime?: number };
      dependsOn: string[];
    }
    interface TestsResponse {
      environment: { applied: { tests: { edges: Array<{ node: RawTestNode }> } } };
    }

    const data = await this.query<TestsResponse>(gql, {
      environmentId,
      first: filters?.first ?? 200,
    });

    return data.environment.applied.tests.edges.map((e) => ({
      uniqueId: e.node.uniqueId,
      name: e.node.name,
      status: e.node.executionInfo?.lastRunStatus,
      executionTime: e.node.executionInfo?.executionTime,
      dependsOn: e.node.dependsOn,
    }));
  }
}

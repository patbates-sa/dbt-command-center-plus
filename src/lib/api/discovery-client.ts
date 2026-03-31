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
  status: string;
  executionTime?: number;
  failureMessage?: string;
  dependsOn: string[];
}

// ─── Client ─────────────────────────────────────────────────

export class DbtDiscoveryClient {
  constructor(
    private url: string,
    private token: string,
  ) {}

  // ── Private GraphQL transport ──

  private async query<T>(
    gql: string,
    variables: Record<string, unknown> = {},
  ): Promise<T> {
    const tag = `[DbtDiscoveryClient] GraphQL query`;
    console.debug(tag, { variables });

    const res = await fetch(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
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

  // ── Assets (models, sources, exposures, metrics) ──

  async getAssets(
    environmentId: string,
    filters?: DiscoveryAssetFilters,
  ): Promise<DbtAsset[]> {
    const types = filters?.resourceType
      ? Array.isArray(filters.resourceType)
        ? filters.resourceType
        : [filters.resourceType]
      : null;

    const gql = `
      query GetAssets(
        $environmentId: BigInt!
        $first: Int
        $after: String
        $types: [String!]
        $tags: [String!]
      ) {
        environment(id: $environmentId) {
          applied {
            nodes(first: $first, after: $after, resourceTypes: $types, tags: $tags) {
              edges {
                node {
                  uniqueId
                  name
                  resourceType
                  packageName
                  description
                  schema
                  database
                  tags
                  meta
                  owner {
                    name
                  }
                  materialization
                  filePath
                  columns {
                    name
                    description
                    type
                  }
                  executionInfo {
                    lastRunAt
                    lastRunStatus
                    lastRunDurationSecs
                    lastRunId
                    executionCount
                  }
                  parents {
                    uniqueId
                  }
                  children {
                    uniqueId
                  }
                  tests {
                    uniqueId
                    status
                  }
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
      }
    `;

    interface NodesResponse {
      environment: {
        applied: {
          nodes: {
            edges: Array<{ node: DbtAsset }>;
          };
        };
      };
    }

    const data = await this.query<NodesResponse>(gql, {
      environmentId,
      first: filters?.first ?? 100,
      after: filters?.after ?? null,
      types: types,
      tags: filters?.tags ?? null,
    });

    return data.environment.applied.nodes.edges.map((e) => e.node);
  }

  // ── Single asset detail ──

  async getAsset(
    environmentId: string,
    uniqueId: string,
  ): Promise<DbtAsset | null> {
    const gql = `
      query GetAsset($environmentId: BigInt!, $uniqueId: String!) {
        environment(id: $environmentId) {
          applied {
            node(uniqueId: $uniqueId) {
              uniqueId
              name
              resourceType
              packageName
              description
              schema
              database
              tags
              meta
              owner {
                name
              }
              group
              materialization
              filePath
              rawCode
              compiledCode
              columns {
                name
                description
                type
                meta
                tags
              }
              executionInfo {
                lastRunAt
                lastRunStatus
                lastRunDurationSecs
                lastRunId
                executionCount
                averageDurationSecs
              }
              parents {
                uniqueId
                name
                resourceType
              }
              children {
                uniqueId
                name
                resourceType
              }
              tests {
                uniqueId
                name
                status
                executionTime
              }
            }
          }
        }
      }
    `;

    interface NodeResponse {
      environment: {
        applied: {
          node: DbtAsset | null;
        };
      };
    }

    const data = await this.query<NodeResponse>(gql, {
      environmentId,
      uniqueId,
    });

    return data.environment.applied.node;
  }

  // ── Lineage ──

  async getLineage(
    environmentId: string,
    uniqueId: string,
    depth: number = 3,
  ): Promise<LineageGraph> {
    const gql = `
      query GetLineage($environmentId: BigInt!, $uniqueId: String!, $depth: Int) {
        environment(id: $environmentId) {
          applied {
            lineage(uniqueId: $uniqueId, depth: $depth) {
              nodes {
                uniqueId
                name
                resourceType
                materialization
                schema
                database
                executionInfo {
                  lastRunStatus
                  lastRunDurationSecs
                }
                description
                tests {
                  uniqueId
                  status
                }
              }
              edges {
                source
                target
              }
            }
          }
        }
      }
    `;

    interface LineageResponse {
      environment: {
        applied: {
          lineage: {
            nodes: LineageNode[];
            edges: LineageEdge[];
          };
        };
      };
    }

    const data = await this.query<LineageResponse>(gql, {
      environmentId,
      uniqueId,
      depth,
    });

    return data.environment.applied.lineage;
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
        $status: String
      ) {
        environment(id: $environmentId) {
          applied {
            tests(first: $first, status: $status) {
              edges {
                node {
                  uniqueId
                  name
                  status
                  executionTime
                  failureMessage
                  dependsOn
                }
              }
            }
          }
        }
      }
    `;

    interface TestsResponse {
      environment: {
        applied: {
          tests: {
            edges: Array<{ node: DiscoveryTestResult }>;
          };
        };
      };
    }

    const data = await this.query<TestsResponse>(gql, {
      environmentId,
      first: filters?.first ?? 200,
      status: filters?.status ?? null,
    });

    return data.environment.applied.tests.edges.map((e) => e.node);
  }
}

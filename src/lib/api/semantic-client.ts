// ============================================================
// dbt Command Center — Semantic Layer API (GraphQL) Client
// ============================================================

import type { DbtMetric, DbtSemanticQueryResult } from "@/types";

// ─── Query parameters ───────────────────────────────────────

export interface SemanticQueryParams {
  environmentId: string;
  metrics: Array<{ name: string }>;
  groupBy?: Array<{ name: string; grain?: string }>;
  where?: Array<{ sql: string }>;
  orderBy?: Array<{ name: string; descending?: boolean }>;
  limit?: number;
}

// ─── GraphQL response shapes ────────────────────────────────

interface GraphQLResponse<T = unknown> {
  data: T;
  errors?: Array<{ message: string; path?: string[]; extensions?: unknown }>;
}

// ─── Client ─────────────────────────────────────────────────

export class DbtSemanticClient {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(_url: string, _token: string) {}

  // ── Private GraphQL transport ──

  private async query<T>(
    gql: string,
    variables: Record<string, unknown> = {},
  ): Promise<T> {
    const tag = `[DbtSemanticClient] GraphQL query`;
    console.debug(tag, { variables });

    const res = await fetch("/api/semantic-layer", {
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

  // ── Metrics catalog ──

  async getMetrics(environmentId: string): Promise<DbtMetric[]> {
    const gql = `
      query GetMetrics($environmentId: BigInt!) {
        metrics(environmentId: $environmentId) {
          name
          label
          description
          type
          dimensions {
            name
            type
            description
          }
          entities {
            name
            type
          }
        }
      }
    `;

    interface RawMetric {
      name: string;
      label: string | null;
      description?: string;
      type: string;
      dimensions: Array<{ name: string; type: string; description?: string }>;
      entities: Array<{ name: string; type: string }>;
    }

    interface MetricsResponse {
      metrics: RawMetric[];
    }

    const data = await this.query<MetricsResponse>(gql, { environmentId });
    return data.metrics.map((m) => ({
      uniqueId: m.name,
      name: m.name,
      label: m.label ?? m.name,
      description: m.description,
      type: m.type.toLowerCase(),
      dimensions: m.dimensions.map((d) => d.name),
      entities: m.entities.map((e) => e.name),
      timeGrains: [],
      tags: [],
    }));
  }

  // ── Dimensions for a specific metric ──

  async getDimensions(
    environmentId: string,
    metricName: string,
  ): Promise<Array<{ name: string; type: string; description?: string }>> {
    const gql = `
      query GetDimensions($environmentId: BigInt!, $metrics: [MetricInput!]!) {
        dimensions(environmentId: $environmentId, metrics: $metrics) {
          name
          type
          description
          queryableGranularities
        }
      }
    `;

    interface DimensionsResponse {
      dimensions: Array<{
        name: string;
        type: string;
        description?: string;
        queryableGranularities?: string[];
      }>;
    }

    const data = await this.query<DimensionsResponse>(gql, {
      environmentId,
      metrics: [{ name: metricName }],
    });

    return data.dimensions;
  }

  // ── Execute a semantic query ──

  async queryMetric(params: SemanticQueryParams): Promise<DbtSemanticQueryResult> {
    const gql = `
      mutation CreateQuery(
        $environmentId: BigInt!
        $metrics: [MetricInput!]!
        $groupBy: [GroupByInput!]
        $where: [WhereInput!]
        $orderBy: [OrderByInput!]
        $limit: Int
      ) {
        createQuery(
          environmentId: $environmentId
          metrics: $metrics
          groupBy: $groupBy
          where: $where
          orderBy: $orderBy
          limit: $limit
        ) {
          queryId
          status
          columns
          rows
          totalRows
          executionTimeMs
          generatedSql
        }
      }
    `;

    interface CreateQueryResponse {
      createQuery: DbtSemanticQueryResult;
    }

    const data = await this.query<CreateQueryResponse>(gql, {
      environmentId: params.environmentId,
      metrics: params.metrics,
      groupBy: params.groupBy ?? null,
      where: params.where ?? null,
      orderBy: params.orderBy ?? null,
      limit: params.limit ?? null,
    });

    return data.createQuery;
  }

  // ── Poll query status ──

  async getQueryStatus(queryId: string): Promise<DbtSemanticQueryResult> {
    const gql = `
      query GetQueryResult($queryId: String!) {
        query(queryId: $queryId) {
          queryId
          status
          columns
          rows
          totalRows
          executionTimeMs
          generatedSql
        }
      }
    `;

    interface QueryResultResponse {
      query: DbtSemanticQueryResult;
    }

    const data = await this.query<QueryResultResponse>(gql, { queryId });
    return data.query;
  }
}

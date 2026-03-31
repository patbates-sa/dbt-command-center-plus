# dbt Command Center

A standalone operations dashboard for dbt Cloud, powered entirely by dbt's public APIs. Monitor jobs, explore catalog assets, trace lineage, query the Semantic Layer, and more — all from a single interface.

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/<your-username>/dbt-command-center.git
cd dbt-command-center
npm install

# 2. Configure your dbt Cloud connection
cp .env.example .env.local
# Edit .env.local with your credentials (see Setup below)

# 3. Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and navigate to the **Setup** tab for step-by-step connection instructions.

## Setup

You need two things to connect:

1. **A dbt Cloud service token** — create one at `Account Settings > Service Tokens` with Read-Only + Metadata permissions.
2. **Your Account ID** — visible in your dbt Cloud URL: `https://cloud.getdbt.com/deploy/{ACCOUNT_ID}/...`

Add them to `.env.local`:

```bash
# Required
DBT_CLOUD_API_TOKEN=your_service_token_here
DBT_CLOUD_ACCOUNT_ID=12345
DBT_CLOUD_BASE_URL=https://cloud.getdbt.com

# Required for Catalog, Lineage, and Metrics
DBT_DISCOVERY_API_URL=https://metadata.cloud.getdbt.com/graphql
DBT_DEFAULT_ENVIRONMENT_ID=67890  # Your production environment ID

# Optional — Semantic Layer
DBT_SEMANTIC_LAYER_URL=https://semantic-layer.cloud.getdbt.com/api/graphql
DBT_SEMANTIC_LAYER_TOKEN=
```

Restart the dev server after making changes. The app's **Setup** page (`/setup`) shows real-time connection status for each API.

## Features

| Module | Description | API |
|--------|-------------|-----|
| **Dashboard** | KPI summary, run status charts, runtime trends, attention items | Admin API v3 + Discovery API |
| **Catalog** | Browse and search all dbt assets with column-level detail | Discovery API (GraphQL) |
| **Lineage** | Interactive DAG visualization with upstream/downstream traversal | Discovery API (GraphQL) |
| **Jobs** | List, inspect, trigger, and monitor dbt jobs | Admin API v3 |
| **Runs** | Individual run details with step-level timeline and logs | Admin API v3 |
| **Artifacts** | Browse and preview run artifacts (manifest, catalog, run_results) | Admin API v3 |
| **Environments** | Environment configs, dbt versions, connection summaries | Admin API v3 |
| **Metrics** | Semantic Layer metric browser and ad-hoc query builder | Semantic Layer API |
| **Activity** | Audit event timeline across runs, jobs, and config changes | Admin API v2 |
| **Setup** | Connection instructions and live status indicators | — |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js App Router                    │
│                  (Pages & Components)                    │
├─────────────────────────────────────────────────────────┤
│               React Query Hooks Layer                   │
│         (caching, deduplication, refetching)             │
├─────────────────────────────────────────────────────────┤
│               PlatformService Layer                     │
│            (unified API orchestration)                  │
├────────────┬──────────────┬─────────────────────────────┤
│  Admin     │  Discovery   │  Semantic Layer             │
│  Client    │  Client      │  Client                     │
│  (REST)    │  (GraphQL)   │  (GraphQL)                  │
├────────────┴──────────────┴─────────────────────────────┤
│                  dbt Cloud APIs                         │
└─────────────────────────────────────────────────────────┘
```

The app detects which APIs are reachable based on your configuration and gracefully disables features when an API is unavailable.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DBT_CLOUD_API_TOKEN` | Yes | — | dbt Cloud service token |
| `DBT_CLOUD_ACCOUNT_ID` | Yes | — | dbt Cloud account ID |
| `DBT_CLOUD_BASE_URL` | No | `https://cloud.getdbt.com` | dbt Cloud base URL |
| `DBT_DISCOVERY_API_URL` | No | `https://metadata.cloud.getdbt.com/graphql` | Discovery API endpoint |
| `DBT_DEFAULT_ENVIRONMENT_ID` | Recommended | — | Production environment ID (needed for catalog/lineage/metrics) |
| `DBT_DEFAULT_PROJECT_ID` | No | — | Default project ID |
| `DBT_SEMANTIC_LAYER_URL` | No | — | Semantic Layer GraphQL endpoint |
| `DBT_SEMANTIC_LAYER_TOKEN` | No | — | Semantic Layer auth token |
| `DBT_WEBHOOK_SECRET` | No | — | Webhook HMAC secret |

## Tech Stack

- **Next.js 14** (App Router) + **TypeScript**
- **React Query** (TanStack) for server state
- **Tailwind CSS** + **Radix UI** primitives
- **Recharts** for data visualization
- **React Flow** (@xyflow/react) for lineage DAG
- **Zod** for API response validation

## Project Structure

```
src/
  app/              — Next.js pages
    catalog/        — Catalog list and detail
    jobs/           — Job list and detail
    runs/           — Run detail
    artifacts/      — Artifact browser
    environments/   — Environment config viewer
    lineage/        — Lineage DAG explorer
    metrics/        — Semantic Layer query builder
    activity/       — Audit event timeline
    setup/          — Connection setup instructions
  components/       — React components
    ui/             — Base UI primitives
    layout/         — App shell, navigation
    shared/         — Cross-cutting (status badge, filter bar, etc.)
    dashboard/      — Dashboard components
    catalog/        — Catalog components
    ...
  lib/
    api/            — API client adapters (admin, discovery, semantic)
    services/       — PlatformService (unified orchestration)
    hooks/          — React Query hooks
    utils/          — Formatting utilities
    validators/     — Zod schemas
  types/            — TypeScript type definitions
  config/           — App config and capability detection
```

## Security Notes

- API tokens are stored in `.env.local` (gitignored) and never exposed to the browser.
- Connection credentials are masked in the UI.
- The app is read-heavy; write operations are limited to triggering and cancelling runs.

## License

MIT

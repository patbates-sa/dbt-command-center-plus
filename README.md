# dbt Command Center Plus

A standalone operations dashboard for dbt Cloud, powered entirely by dbt's public APIs. Monitor jobs, explore catalog assets, trace lineage, query the Semantic Layer, and more — all from a single interface.

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/<your-username>/dbt-command-center-plus.git
cd dbt-command-center-plus
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

## Jira Integration (optional)

The **Jira Tickets** page connects to a Jira MCP server over stdio. The Next.js server spawns the MCP server as a child process; you provide the command + credentials via `.env.local`.

### 1. Install a Jira MCP server

The default config points at the community [sooperset/mcp-atlassian](https://github.com/sooperset/mcp-atlassian) server. Install it once on the machine that runs the Next.js app:

```bash
# Recommended — fetch + run via uv (no global install)
brew install uv             # or: pipx install uv
# (uvx will install mcp-atlassian on first run)

# Or install with pip
pip install mcp-atlassian
```

You can substitute any other Jira MCP server by overriding `JIRA_MCP_COMMAND` / `JIRA_MCP_ARGS` and (if needed) `JIRA_MCP_TOOL_NAME`.

### 2. Create a Jira API token

For Jira Cloud, generate one at `https://id.atlassian.com/manage-profile/security/api-tokens`. For self-hosted Server/DC, use a personal access token instead.

### 3. Configure `.env.local`

```bash
# Required
JIRA_MCP_COMMAND=uvx
JIRA_MCP_ARGS=mcp-atlassian
JIRA_URL=https://your-org.atlassian.net
JIRA_USERNAME=you@example.com
JIRA_API_TOKEN=your_api_token

# Optional — exposed to the browser for deep links
NEXT_PUBLIC_JIRA_URL=https://your-org.atlassian.net
NEXT_PUBLIC_JIRA_DEFAULT_PROJECT=KAN     # project key or numeric ID
NEXT_PUBLIC_JIRA_DEFAULT_TYPE=Task       # issue type name or numeric ID

# Optional
# JIRA_PERSONAL_TOKEN=         # for self-hosted Server/DC
# JIRA_MCP_TOOL_NAME=jira_search
JIRA_DEFAULT_JQL=assignee = currentUser() ORDER BY updated DESC
```

Restart `npm run dev` and visit `/jira-tickets`. The page accepts ad-hoc JQL in the search bar.

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
| **Jira Tickets** | Browse Jira tickets via a configurable MCP server (JQL-driven) | Jira MCP (stdio) |
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
| `JIRA_MCP_COMMAND` | No | — | Command used to spawn the Jira MCP server (e.g. `uvx`). Enables `/jira-tickets`. |
| `JIRA_MCP_ARGS` | No | — | Space-separated args for the MCP command (e.g. `mcp-atlassian`) |
| `JIRA_URL` | No | — | Jira base URL (e.g. `https://your-org.atlassian.net`) |
| `NEXT_PUBLIC_JIRA_URL` | No | — | Same URL exposed to the browser (used by the **Create** / **Edit in Jira** buttons) |
| `NEXT_PUBLIC_JIRA_DEFAULT_PROJECT` | No | — | Project to preselect in the **Create** dialog. Project key (e.g. `KAN`) or numeric ID; values like `Name (KEY)` are parsed for the key. |
| `NEXT_PUBLIC_JIRA_DEFAULT_TYPE` | No | — | Issue type to preselect (e.g. `Task`). Use a numeric type ID if name-based preselection is ignored by your Jira instance. |
| `JIRA_USERNAME` | No | — | Jira account email (Cloud) |
| `JIRA_API_TOKEN` | No | — | Jira API token (Cloud) |
| `JIRA_PERSONAL_TOKEN` | No | — | Personal access token (self-hosted Server/DC) |
| `JIRA_MCP_TOOL_NAME` | No | `jira_search` | Tool name exposed by the MCP server |
| `JIRA_DEFAULT_JQL` | No | `assignee = currentUser() ORDER BY updated DESC` | Default JQL when no query is entered |
| `DBT_PROJECT_ROOT` | No | — | Local directory containing your dbt project clones. The **Execute** button scans immediate subdirectories' `dbt_project.yml` and launches VS Code at the one matching the selected project. |

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
    jira-tickets/   — Jira ticket browser (via MCP)
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
    mcp/            — MCP client(s) — currently Jira over stdio
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

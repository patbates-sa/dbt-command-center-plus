# dbt Command Center — PowerPoint handoff

A self-contained brief you can drop into Claude Desktop (or any LLM with a PowerPoint skill) to generate a deck. Each numbered section maps to a suggested slide.

---

## 1. Pitch (title slide)

**dbt Command Center** — a single operations console for data teams running on the dbt platform.
One-line value prop: *bridge Jira ticket flow with dbt platform context so an engineer can go from "I have a ticket" to "the change is merged" without leaving the tool.*

---

## 2. Problem

Data engineers working from Jira tickets currently context-switch across:
- Jira (ticket triage, comments, transitions)
- dbt platform / dbt Cloud (catalog, lineage, jobs, runs)
- Local editor (VS Code) + AI assistant (Claude Code / GitHub Copilot)
- Terminal (`dbt build`, git commits)

No single surface ties the ticket to the dbt asset, the AI context, or the commit. Hand-offs are manual and slow.

---

## 3. What we built (feature inventory)

A Next.js operations app with these pages and capabilities:

**Dashboard** — KPI cards across the top: Total Projects, **Open Jira Tickets** (red >0, green =0, clickable into pre-filtered list), Environments, Total Jobs, Runs (24h), Success Rate, Avg Runtime. Plus charts (run status, runtime trend), an attention panel, and an activity feed.

**Catalog** — dbt asset browser pulling from the Discovery API. Supports models, sources, seeds, snapshots, exposures, semantic models, **metrics** (recently fixed: metric details now query `environment.definition.metrics` instead of `applied.metrics`).

**Lineage** — interactive graph traversal up to N hops from a root node.

**Jobs / Artifacts / Environments / Metrics / Activity** — standard read-views over dbt platform data.

**Jira Tickets** — the centerpiece (see slide 4).

**Setup** — environment configuration & capability checks.

**API Log** — live trace of all `/api/*` requests made by the browser session (method, URL, status, timing, request + response bodies). Module-level store, `useSyncExternalStore`, filter + clear.

---

## 4. Jira Tickets page (the centerpiece)

Single table with end-to-end ticket workflow:

- **Keyword search** (`text ~ "…"` translation server-side; JQL hidden behind an escape hatch).
- **Status filter chips**: All / To Do / In Progress / Done — multi-select, with per-bucket counts. Deep-linkable via `?status=todo,inprogress` (the dashboard's Open Tickets card uses this).
- **Sortable columns** on every field; Work column sorts by Jira-key with `localeCompare({ numeric: true })`; Priority sorts by Jira rank (Blocker → Lowest), not alphabetically; dates sort numerically; missing values always sink to the bottom.
- **Resizable columns** (drag right edge, persisted in localStorage via `useSyncExternalStore`-style state).
- **Hover-to-preview**: hovering the Work cell shows the full ticket description in a Radix tooltip.
- **Multi-select bulk close** with confirmation, optional comment, parallel API calls, partial-success messaging.
- **Execute** dropdown: launches the local clone of the matching dbt project, writes `.jira/<KEY>.md` + `CLAUDE.md` (the AI operating procedure), transitions the ticket to In Progress, assigns it to the current user.
- **Working indicator** end-to-end: per-row spinner + button "Closing…" / "Executing…" + inline "Updating KAN-X…" footer, all cleared together after the background refetch settles.
- **Default sort**: Work column, descending — newest tickets first.

---

## 5. The Execute → AI handoff (the integration's killer move)

When the user hits **Execute → dbt VSCode Extension** on a ticket:

1. API writes **`.jira/<KEY>.md`** — the ticket's summary, description, metadata, and an "Implementation steps" recipe. This is the *task input*.
2. API writes/refreshes a sentinel-managed block in **`CLAUDE.md`** at the project root — the *operating procedure* Claude Code follows for every ticket. Tells the agent to: read the ticket file, implement, annotate new SQL/YAML with the ticket key, validate with `dbt build`, summarize, POST the summary back to `/api/jira/comment` (closing the loop on Jira), ask for commit confirmation, commit.
3. API transitions the ticket to In Progress in Jira and assigns it to the user.
4. API launches VS Code on the project, opens the ticket file, and deep-links to focus the Claude Code sidebar.
5. The user says "do this ticket" → Claude Code reads `CLAUDE.md` + `.jira/<KEY>.md` → executes all 10 steps autonomously.

**Mental model**:
- `.jira/<KEY>.md` = **what** to do (this ticket)
- `CLAUDE.md` = **how** to do it (the recipe for any ticket)

The dbt Studio + GitHub Copilot path is symmetric — same `.jira/<KEY>.md`, but the operating procedure lives in `.github/copilot-instructions.md`. (Parked pending dbt Studio access.)

---

## 6. Demo flow (suggest a live-demo slide here)

1. Dashboard → **Open Jira Tickets** card shows count in red. Click it.
2. Lands on Jira Tickets pre-filtered to non-Done; status chips and counts visible.
3. Sort by Updated, drag the Work column wider, hover a ticket to read the description tooltip.
4. Multi-select two tickets → **Close** → confirm → see spinners on both rows + "Closing 2 tickets…" footer.
5. Single-select another ticket → **Execute → dbt VSCode Extension** → VS Code opens with the ticket file + Claude Code sidebar focused.
6. Tell Claude: "do this ticket." Watch it implement, validate, post a Jira comment via `/api/jira/comment`, and prompt for commit.
7. Back in dbt Command Center: ticket has auto-transitioned to In Progress; comment shows on the ticket; status flips to Done after the commit.

---

## 7. Architecture highlights (one slide)

- **Next.js App Router**, React Query (`@tanstack/react-query`) for client cache + revalidation.
- **MCP integration** for Jira (`@/lib/mcp/jira-client`) — tool calls for search, transitions, comments, updates.
- **dbt Discovery API** for catalog / lineage (GraphQL).
- **Server-side launchers** (`spawn`) for editor integration; deep links via macOS `open` URL scheme.
- **Sentinel-managed AI instructions** in `CLAUDE.md` / `.github/copilot-instructions.md` so they merge cleanly with user content across re-runs.
- **localStorage** for column widths and project selection persistence.

---

## 8. What's next (forward-looking slide)

- **dbt Studio handoff** path (parked, awaiting product access).
- **Cross-tool memory**: thread observability (API Log) → into an audit trail surface.
- **Run-aware ticket linkage**: surface jobs that touched the same models referenced by an in-flight ticket.
- **Semantic Layer integration in tickets**: link metric-impact analysis directly from the ticket card.

---

## 9. Suggested slide deck outline (use this as the LLM prompt)

> Build a 10-slide deck from the brief in this document. Style: minimal, dark theme, accent color emerald or teal. One headline + 3-5 bullets per slide. Slide titles:
> 1. dbt Command Center (title + tagline)
> 2. The problem: data work is fragmented across tools
> 3. The product: one console for ticket-driven dbt work
> 4. Tour: Dashboard, Catalog, Lineage, Jobs (4 screenshots in a 2x2)
> 5. Jira Tickets — the centerpiece (highlight: search, multi-status filter, multi-select close, Execute)
> 6. The Execute handoff — diagram of `.jira/<KEY>.md` + `CLAUDE.md` + VS Code + Claude Code
> 7. Demo flow (numbered, 7 steps)
> 8. Architecture (boxes-and-arrows: Next.js → dbt platform / Jira MCP / local FS / VS Code)
> 9. What's next
> 10. Q&A / Try it

---

*Generated as a handoff doc — see `docs/ppt-handoff.md` in the dbt Command Center repo for the source.*

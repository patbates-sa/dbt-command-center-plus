"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ExternalLink,
  Loader2,
  Play,
  Plus,
  Ticket,
  X as CloseIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CapabilityNotice } from "@/components/shared/capability-notice";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { useCapabilities, useProjects } from "@/lib/hooks/use-platform";
import { useJiraTickets } from "@/lib/hooks/use-jira";
import { useQueryClient } from "@tanstack/react-query";
import { formatRelativeTime } from "@/lib/utils/format";
import type { JiraTicket } from "@/types";

type SortKey =
  | "work"
  | "assignee"
  | "reporter"
  | "priority"
  | "status"
  | "resolution"
  | "created"
  | "updated"
  | "dueDate";

type SortDir = "asc" | "desc";

const COLUMNS: { id: SortKey; label: string; defaultDir: SortDir }[] = [
  { id: "work", label: "Work", defaultDir: "desc" },
  { id: "assignee", label: "Assignee", defaultDir: "asc" },
  { id: "reporter", label: "Reporter", defaultDir: "asc" },
  { id: "priority", label: "Priority", defaultDir: "asc" },
  { id: "status", label: "Status", defaultDir: "asc" },
  { id: "resolution", label: "Resolution", defaultDir: "asc" },
  { id: "created", label: "Created", defaultDir: "desc" },
  { id: "updated", label: "Updated", defaultDir: "desc" },
  { id: "dueDate", label: "Due Date", defaultDir: "asc" },
];

const PRIORITY_RANK: Record<string, number> = {
  blocker: 0,
  highest: 1,
  high: 2,
  medium: 3,
  low: 4,
  lowest: 5,
};

function priorityRank(p?: string): number {
  if (!p) return Number.POSITIVE_INFINITY;
  const v = PRIORITY_RANK[p.toLowerCase()];
  return v === undefined ? Number.POSITIVE_INFINITY : v;
}

function dateValue(d?: string): number {
  if (!d) return Number.POSITIVE_INFINITY;
  const t = Date.parse(d);
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

function compareStrings(a?: string, b?: string, dir: SortDir = "asc"): number {
  const aMissing = !a;
  const bMissing = !b;
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  const cmp = a!.localeCompare(b!, undefined, {
    numeric: true,
    sensitivity: "base",
  });
  return dir === "asc" ? cmp : -cmp;
}

function compareNumbers(a: number, b: number, dir: SortDir): number {
  const aMissing = !Number.isFinite(a);
  const bMissing = !Number.isFinite(b);
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  return dir === "asc" ? a - b : b - a;
}

type StatusCategory = "todo" | "inprogress" | "done";

const STATUS_FILTERS: { id: StatusCategory; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "inprogress", label: "In Progress" },
  { id: "done", label: "Done" },
];

function statusCategory(status?: string): StatusCategory | undefined {
  const s = status?.toLowerCase().trim();
  if (!s) return undefined;
  if (
    s === "done" ||
    s === "closed" ||
    s === "resolved" ||
    s === "complete" ||
    s === "completed" ||
    s === "won't do" ||
    s === "wont do" ||
    s === "cancelled" ||
    s === "canceled"
  ) {
    return "done";
  }
  if (
    s === "in progress" ||
    s === "in review" ||
    s === "in development" ||
    s === "code review" ||
    s === "testing" ||
    s === "qa" ||
    s.includes("progress") ||
    s.includes("review")
  ) {
    return "inprogress";
  }
  return "todo";
}

function priorityVariant(
  priority?: string,
): "default" | "secondary" | "warning" | "destructive" {
  switch (priority?.toLowerCase()) {
    case "highest":
    case "blocker":
      return "destructive";
    case "high":
      return "warning";
    case "low":
    case "lowest":
      return "secondary";
    default:
      return "default";
  }
}

function TicketRow({
  ticket,
  selected,
  onToggle,
  pending,
}: {
  ticket: JiraTicket;
  selected: boolean;
  onToggle: () => void;
  pending?: boolean;
}) {
  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/30">
      <td className="px-3 py-2.5 align-top">
        <input
          type="checkbox"
          aria-label={`Select ${ticket.key}`}
          checked={selected}
          onChange={onToggle}
          className="h-3.5 w-3.5 cursor-pointer rounded border-input"
        />
      </td>
      <td className="px-3 py-2.5 align-top">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col gap-0.5 cursor-default">
              {ticket.url ? (
                <a
                  href={ticket.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-primary hover:underline w-fit"
                >
                  {ticket.key}
                </a>
              ) : (
                <span className="text-xs font-medium">{ticket.key}</span>
              )}
              <span className="text-sm">{ticket.summary || "—"}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            align="start"
            className="max-w-md whitespace-pre-wrap text-xs leading-relaxed"
          >
            {ticket.description?.trim() || "No description."}
          </TooltipContent>
        </Tooltip>
      </td>
      <td className="px-3 py-2.5 align-top text-sm">
        {ticket.assignee || "—"}
      </td>
      <td className="px-3 py-2.5 align-top text-sm">
        {ticket.reporter || "—"}
      </td>
      <td className="px-3 py-2.5 align-top">
        {ticket.priority ? (
          <Badge variant={priorityVariant(ticket.priority)} className="text-[10px]">
            {ticket.priority}
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 align-top">
        <div className="flex items-center gap-1.5">
          {ticket.status ? (
            <Badge variant="secondary" className="text-[10px]">
              {ticket.status}
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
          {pending && (
            <Loader2
              className="h-3 w-3 animate-spin text-muted-foreground"
              aria-label="Updating"
            />
          )}
        </div>
      </td>
      <td className="px-3 py-2.5 align-top text-sm text-muted-foreground">
        {ticket.resolution || "—"}
      </td>
      <td className="px-3 py-2.5 align-top text-sm text-muted-foreground whitespace-nowrap">
        {formatRelativeTime(ticket.created)}
      </td>
      <td className="px-3 py-2.5 align-top text-sm text-muted-foreground whitespace-nowrap">
        {formatRelativeTime(ticket.updated)}
      </td>
      <td className="px-3 py-2.5 align-top text-sm text-muted-foreground whitespace-nowrap">
        {ticket.dueDate
          ? new Date(ticket.dueDate).toLocaleDateString()
          : "—"}
      </td>
    </tr>
  );
}

export default function JiraTicketsPage() {
  const { data: capabilities } = useCapabilities();
  const jiraConfigured = capabilities?.jira ?? false;
  const { data: projects } = useProjects();
  const queryClient = useQueryClient();

  const patchTicketOptimistically = (
    key: string,
    patch: Partial<JiraTicket>,
  ) => {
    const queries = queryClient
      .getQueryCache()
      .findAll({ queryKey: ["jira", "tickets"] });
    for (const q of queries) {
      queryClient.setQueryData<JiraTicket[]>(q.queryKey, (old) =>
        !old ? old : old.map((t) => (t.key === key ? { ...t, ...patch } : t)),
      );
    }
  };

  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState<string | undefined>(
    undefined,
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<Set<StatusCategory>>(
    new Set(),
  );
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "work",
    dir: "desc",
  });

  const onSort = (key: SortKey, defaultDir: SortDir) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: defaultDir },
    );
  };

  const toggleStatusFilter = (id: StatusCategory) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    const stored = window.localStorage.getItem("jira-tickets:projectId");
    if (stored) setSelectedProjectId(stored);
  }, []);

  const onProjectChange = (id: string) => {
    setSelectedProjectId(id);
    window.localStorage.setItem("jira-tickets:projectId", id);
  };

  const {
    data: tickets,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useJiraTickets(activeSearch);

  const visibleTickets = useMemo(() => {
    const filtered =
      statusFilter.size === 0
        ? (tickets ?? [])
        : (tickets ?? []).filter((t) => {
            const cat = statusCategory(t.status);
            return cat ? statusFilter.has(cat) : false;
          });
    const { key, dir } = sort;
    return [...filtered].sort((a, b) => {
      switch (key) {
        case "work":
          return compareStrings(a.key, b.key, dir);
        case "assignee":
          return compareStrings(a.assignee, b.assignee, dir);
        case "reporter":
          return compareStrings(a.reporter, b.reporter, dir);
        case "priority":
          return compareNumbers(priorityRank(a.priority), priorityRank(b.priority), dir);
        case "status":
          return compareStrings(a.status, b.status, dir);
        case "resolution":
          return compareStrings(a.resolution, b.resolution, dir);
        case "created":
          return compareNumbers(dateValue(a.created), dateValue(b.created), dir);
        case "updated":
          return compareNumbers(dateValue(a.updated), dateValue(b.updated), dir);
        case "dueDate":
          return compareNumbers(dateValue(a.dueDate), dateValue(b.dueDate), dir);
      }
    });
  }, [tickets, statusFilter, sort]);

  const statusCounts = useMemo(() => {
    const counts: Record<StatusCategory, number> = {
      todo: 0,
      inprogress: 0,
      done: 0,
    };
    for (const t of tickets ?? []) {
      const cat = statusCategory(t.status);
      if (cat) counts[cat] += 1;
    }
    return counts;
  }, [tickets]);

  const allKeys = useMemo(
    () => new Set(visibleTickets.map((t) => t.key)),
    [visibleTickets],
  );
  const selectedTickets = useMemo(
    () => visibleTickets.filter((t) => selected.has(t.key)),
    [visibleTickets, selected],
  );
  const singleSelected =
    selectedTickets.length === 1 ? selectedTickets[0] : undefined;

  const jiraBaseUrl = process.env.NEXT_PUBLIC_JIRA_URL?.replace(/\/$/, "");

  const openInJira = () => {
    if (singleSelected?.url) {
      window.open(singleSelected.url, "_blank", "noopener,noreferrer");
    }
  };

  const createUrl = useMemo(() => {
    if (!jiraBaseUrl) return undefined;
    const project = process.env.NEXT_PUBLIC_JIRA_DEFAULT_PROJECT;
    const issueType = process.env.NEXT_PUBLIC_JIRA_DEFAULT_TYPE;
    const params = new URLSearchParams();
    if (project) {
      const keyFromParens = project.match(/\(([^)]+)\)\s*$/)?.[1];
      params.set("pid", (keyFromParens ?? project).trim());
    }
    if (issueType) params.set("issuetype", issueType.trim());
    const qs = params.toString();
    return `${jiraBaseUrl}/secure/CreateIssue!default.jspa${qs ? `?${qs}` : ""}`;
  }, [jiraBaseUrl]);

  const openCreateInJira = () => {
    if (!createUrl) return;
    window.open(createUrl, "_blank", "noopener,noreferrer");
  };

  const [executeError, setExecuteError] = useState<string | null>(null);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [pending, setPending] = useState<{
    keys: Set<string>;
    action: "execute" | "close";
  } | null>(null);

  const closeOneTicket = async (
    key: string,
    comment: string | undefined,
  ): Promise<{ ok: true; transitionUsed?: string } | { ok: false; error: string }> => {
    try {
      const res = await fetch("/api/jira/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketKey: key, comment }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        return {
          ok: false,
          error: body?.error ?? `Close failed (HTTP ${res.status})`,
        };
      }
      const okBody = (await res.json().catch(() => ({}))) as {
        transitionUsed?: string;
      };
      return { ok: true, transitionUsed: okBody.transitionUsed };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  };

  const onCloseTicket = async () => {
    setCloseError(null);
    if (selectedTickets.length === 0) {
      setCloseError("Select at least one ticket first.");
      return;
    }
    const n = selectedTickets.length;
    const confirmMsg =
      n === 1
        ? `Close ${selectedTickets[0].key}? This transitions the ticket in Jira.`
        : `Close ${n} tickets? This transitions all selected tickets in Jira.`;
    if (!window.confirm(confirmMsg)) {
      return;
    }
    const promptMsg =
      n === 1
        ? "Optional comment to add with the close (leave blank to skip):"
        : `Optional comment to add to each of the ${n} closes (leave blank to skip):`;
    const comment = window.prompt(promptMsg, "")?.trim() || undefined;

    const keys = selectedTickets.map((t) => t.key);
    setClosing(true);
    setPending({ keys: new Set(keys), action: "close" });
    try {
      const results = await Promise.all(
        keys.map(async (key) => ({ key, result: await closeOneTicket(key, comment) })),
      );

      const succeeded: string[] = [];
      const failed: { key: string; error: string }[] = [];
      for (const { key, result } of results) {
        if (result.ok) {
          succeeded.push(key);
          patchTicketOptimistically(key, {
            status: result.transitionUsed || "Done",
            resolution: "Done",
          });
        } else {
          failed.push({ key, error: result.error });
        }
      }

      if (failed.length > 0) {
        const detail = failed.map((f) => `${f.key}: ${f.error}`).join(" · ");
        setCloseError(
          succeeded.length > 0
            ? `Closed ${succeeded.length} of ${keys.length}. Failed — ${detail}`
            : `Close failed — ${detail}`,
        );
      }

      // Clear pending for any that failed so their row spinners stop; keep
      // successes spinning through the refetch window.
      if (failed.length > 0) {
        const failedKeys = new Set(failed.map((f) => f.key));
        setPending((p) => {
          if (!p) return p;
          const remaining = new Set([...p.keys].filter((k) => !failedKeys.has(k)));
          return remaining.size === 0 ? null : { ...p, keys: remaining };
        });
      }

      if (succeeded.length > 0) {
        setSelected((prev) => {
          const next = new Set(prev);
          for (const k of succeeded) next.delete(k);
          return next;
        });
        const successKeys = new Set(succeeded);
        window.setTimeout(async () => {
          try {
            await refetch();
          } finally {
            setPending((p) => {
              if (!p) return p;
              const remaining = new Set(
                [...p.keys].filter((k) => !successKeys.has(k)),
              );
              return remaining.size === 0 ? null : { ...p, keys: remaining };
            });
          }
        }, 3000);
      }
    } finally {
      setClosing(false);
    }
  };

  const selectedProject = (projects ?? []).find(
    (p) => p.id === selectedProjectId,
  );

  const onExecute = async () => {
    setExecuteError(null);
    if (!selectedProject) {
      setExecuteError("Pick a project from the dropdown at the top first.");
      return;
    }
    if (!singleSelected) {
      setExecuteError("Select exactly one ticket first.");
      return;
    }
    const executedKey = singleSelected.key;
    setExecuting(true);
    setPending({ keys: new Set([executedKey]), action: "execute" });
    try {
      const res = await fetch("/api/jira/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: selectedProject.name,
          ticket: singleSelected,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setExecuteError(
          body?.error ?? `Could not prepare project (HTTP ${res.status})`,
        );
        setPending((p) => {
          if (!p) return p;
          const remaining = new Set([...p.keys].filter((k) => k !== executedKey));
          return remaining.size === 0 ? null : { ...p, keys: remaining };
        });
        return;
      }
      const data = (await res.json()) as {
        isFirstTime?: boolean;
        warnings?: string[];
      };
      if (data.warnings && data.warnings.length > 0) {
        setExecuteError(`Heads up: ${data.warnings.join(" · ")}`);
      }
      if (data.isFirstTime) {
        patchTicketOptimistically(executedKey, {
          status: "In Progress",
        });
        window.setTimeout(async () => {
          try {
            await refetch();
          } finally {
            setPending((p) => {
          if (!p) return p;
          const remaining = new Set([...p.keys].filter((k) => k !== executedKey));
          return remaining.size === 0 ? null : { ...p, keys: remaining };
        });
          }
        }, 3000);
      } else {
        setPending((p) => {
          if (!p) return p;
          const remaining = new Set([...p.keys].filter((k) => k !== executedKey));
          return remaining.size === 0 ? null : { ...p, keys: remaining };
        });
      }
    } catch (e) {
      setExecuteError(
        `Failed to launch VS Code: ${e instanceof Error ? e.message : String(e)}`,
      );
      setPending((p) => (p?.key === executedKey ? null : p));
    } finally {
      setExecuting(false);
    }
  };
  const allSelected =
    allKeys.size > 0 &&
    Array.from(allKeys).every((k) => selected.has(k));

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(allKeys));
  };

  const toggleOne = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const onRunQuery = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchInput.trim() || undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jira Tickets</h1>
          <p className="mt-1 text-muted-foreground">
            Track Jira tickets linked to dbt models, jobs, and incidents.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Project
          </label>
          <Select value={selectedProjectId} onValueChange={onProjectChange}>
            <SelectTrigger className="h-9 w-[260px] text-sm">
              <SelectValue placeholder="Select a dbt project" />
            </SelectTrigger>
            <SelectContent>
              {(projects ?? []).length === 0 && (
                <SelectItem value="__none__" disabled>
                  No projects available
                </SelectItem>
              )}
              {(projects ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {capabilities && !jiraConfigured && (
        <CapabilityNotice
          title="Jira MCP Not Configured"
          description="Set JIRA_MCP_COMMAND (and JIRA_URL / JIRA_USERNAME / JIRA_API_TOKEN) in .env.local, then restart the dev server."
        />
      )}

      {jiraConfigured && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <form
              onSubmit={onRunQuery}
              className="flex flex-wrap items-center gap-3"
            >
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search tickets (matches summary, description, comments, …)"
                className="h-9 min-w-[280px] flex-1 text-sm"
              />
              <Button type="submit" size="sm" disabled={isFetching}>
                {isFetching ? "Searching…" : "Search"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                Refresh
              </Button>
            </form>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Status
              </span>
              <Button
                type="button"
                size="sm"
                variant={statusFilter.size === 0 ? "default" : "outline"}
                onClick={() => setStatusFilter(new Set())}
                className="h-7 px-2.5 text-xs"
              >
                All
              </Button>
              {STATUS_FILTERS.map(({ id, label }) => {
                const active = statusFilter.has(id);
                return (
                  <Button
                    key={id}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    onClick={() => toggleStatusFilter(id)}
                    className="h-7 px-2.5 text-xs"
                  >
                    {label}
                    <span className="ml-1.5 text-[10px] opacity-70">
                      {statusCounts[id]}
                    </span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/5 p-3">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-600 dark:text-red-300">
            {error.message}
          </p>
        </div>
      )}

      {jiraConfigured && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={openCreateInJira}
            disabled={!createUrl}
            title={
              createUrl
                ? undefined
                : "Set NEXT_PUBLIC_JIRA_URL in .env.local"
            }
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={openInJira}
            disabled={!singleSelected?.url}
            title={
              selectedTickets.length === 0
                ? "Select a ticket"
                : selectedTickets.length > 1
                  ? "Select exactly one ticket"
                  : undefined
            }
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Edit in Jira
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={!singleSelected || !selectedProject || executing}
                title={
                  !selectedProject
                    ? "Pick a project from the dropdown above"
                    : selectedTickets.length === 0
                      ? "Select a ticket"
                      : selectedTickets.length > 1
                        ? "Select exactly one ticket"
                        : `Execute against ${selectedProject.name}`
                }
              >
                {executing ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="mr-1.5 h-3.5 w-3.5" />
                )}
                {executing ? "Executing…" : "Execute"}
                <ChevronDown className="ml-1 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[220px]">
              <DropdownMenuItem onSelect={() => void onExecute()}>
                dbt VSCode Extension
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  // placeholder for dbt Studio integration
                }}
              >
                <span>dbt Studio</span>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  coming soon
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="sm"
            variant="outline"
            onClick={onCloseTicket}
            disabled={selectedTickets.length === 0 || closing}
            title={
              selectedTickets.length === 0
                ? "Select one or more tickets"
                : selectedTickets.length === 1
                  ? `Close ${selectedTickets[0].key} in Jira`
                  : `Close ${selectedTickets.length} tickets in Jira`
            }
          >
            {closing ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <CloseIcon className="mr-1.5 h-3.5 w-3.5" />
            )}
            {closing ? "Closing…" : "Close"}
          </Button>
          {pending ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {pending.action === "close" ? "Closing" : "Updating"}{" "}
              {pending.keys.size === 1
                ? `${[...pending.keys][0]}…`
                : `${pending.keys.size} tickets…`}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              {selectedTickets.length === 0
                ? "No ticket selected"
                : `${selectedTickets.length} selected`}
            </span>
          )}
        </div>
      )}

      {executeError && (
        <div className="flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/5 p-3">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-600 dark:text-red-300">
            {executeError}
          </p>
        </div>
      )}

      {closeError && (
        <div className="flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/5 p-3">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-600 dark:text-red-300">
            {closeError}
          </p>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                  <th className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="h-3.5 w-3.5 cursor-pointer rounded border-input"
                    />
                  </th>
                  {COLUMNS.map((col) => {
                    const active = sort.key === col.id;
                    const Icon = !active
                      ? ArrowUpDown
                      : sort.dir === "asc"
                        ? ArrowUp
                        : ArrowDown;
                    return (
                      <th
                        key={col.id}
                        aria-sort={
                          active
                            ? sort.dir === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                        className="whitespace-nowrap px-3 py-2.5 font-medium"
                      >
                        <button
                          type="button"
                          onClick={() => onSort(col.id, col.defaultDir)}
                          className="inline-flex items-center gap-1 -mx-1 px-1 rounded hover:text-foreground hover:bg-muted/60"
                        >
                          {col.label}
                          <Icon
                            className={`h-3 w-3 ${active ? "" : "opacity-40"}`}
                          />
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {jiraConfigured && isLoading && (
                  <tr>
                    <td colSpan={COLUMNS.length + 1} className="p-6">
                      <TableSkeleton rows={5} />
                    </td>
                  </tr>
                )}

                {jiraConfigured && !isLoading && visibleTickets.length > 0 &&
                  visibleTickets.map((t) => (
                    <TicketRow
                      key={t.key}
                      ticket={t}
                      selected={selected.has(t.key)}
                      onToggle={() => toggleOne(t.key)}
                      pending={pending?.keys.has(t.key) ?? false}
                    />
                  ))}

                {jiraConfigured && !isLoading && !error &&
                  visibleTickets.length === 0 && (
                    <tr>
                      <td
                        colSpan={COLUMNS.length + 1}
                        className="px-3 py-10 text-center text-sm text-muted-foreground"
                      >
                        {(tickets?.length ?? 0) === 0
                          ? "No tickets match this query."
                          : "No tickets match the selected status filter."}
                      </td>
                    </tr>
                  )}

                {!jiraConfigured && (
                  <tr>
                    <td colSpan={COLUMNS.length + 1} className="p-6">
                      <EmptyState
                        icon={Ticket}
                        title="No Jira integration configured"
                        description="Configure the Jira MCP server in .env.local to see tickets here."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

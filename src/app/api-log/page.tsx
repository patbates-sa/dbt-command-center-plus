"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { ChevronRight, ScrollText, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import {
  clearEntries,
  getEntries,
  subscribe,
  type ApiLogEntry,
} from "@/lib/api-log/store";

function statusVariant(
  entry: ApiLogEntry,
): "default" | "secondary" | "warning" | "destructive" {
  if (entry.error) return "destructive";
  if (entry.status == null) return "secondary";
  if (entry.status >= 500) return "destructive";
  if (entry.status >= 400) return "destructive";
  if (entry.status >= 300) return "warning";
  return "default";
}

function formatBody(body: string | undefined, contentType?: string): string {
  if (!body) return "";
  if (contentType?.includes("application/json") || body.trimStart().startsWith("{") || body.trimStart().startsWith("[")) {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }
  return body;
}

function formatClockTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour12: false });
}

function LogRow({ entry }: { entry: ApiLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const reqBody = formatBody(entry.requestBody);
  const resBody = formatBody(entry.responseBody, entry.responseContentType);

  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/40"
      >
        <ChevronRight
          className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
        />
        <span className="w-20 shrink-0 font-mono text-[11px] text-muted-foreground">
          {formatClockTime(entry.startedAt)}
        </span>
        <Badge variant={statusVariant(entry)} className="w-14 justify-center text-[10px]">
          {entry.error ? "ERR" : (entry.status ?? "…")}
        </Badge>
        <span className="w-14 shrink-0 font-mono text-[11px] uppercase text-muted-foreground">
          {entry.method}
        </span>
        <span className="flex-1 truncate font-mono text-xs">{entry.url}</span>
        <span className="w-16 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
          {entry.durationMs != null ? `${entry.durationMs} ms` : "—"}
        </span>
      </button>
      {expanded && (
        <div className="space-y-3 border-t bg-muted/20 px-3 py-3">
          {entry.error && (
            <div className="rounded border border-red-500/30 bg-red-500/5 p-2 text-xs text-red-600 dark:text-red-300">
              {entry.error}
            </div>
          )}
          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Request body
            </div>
            <pre className="max-h-64 overflow-auto rounded border bg-background p-2 text-[11px] leading-relaxed">
              {reqBody || <span className="text-muted-foreground">— none —</span>}
            </pre>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Response body
              {entry.responseContentType && (
                <span className="ml-2 font-normal lowercase text-muted-foreground/70">
                  {entry.responseContentType}
                </span>
              )}
            </div>
            <pre className="max-h-96 overflow-auto rounded border bg-background p-2 text-[11px] leading-relaxed">
              {resBody || <span className="text-muted-foreground">— none —</span>}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApiLogPage() {
  const entries = useSyncExternalStore(subscribe, getEntries, () => []);
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      if (e.url.toLowerCase().includes(q)) return true;
      if (e.method.toLowerCase().includes(q)) return true;
      if (e.status != null && String(e.status).includes(q)) return true;
      return false;
    });
  }, [entries, filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Log</h1>
          <p className="mt-1 text-muted-foreground">
            Live trace of API requests and responses for this browser session.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by URL, method, status…"
            className="h-9 w-[260px] text-sm"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => clearEntries()}
            disabled={entries.length === 0}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={ScrollText}
                title="No API calls captured yet"
                description="Navigate around the app — calls to /api/* will appear here as they happen."
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">
              No entries match the filter.
            </div>
          ) : (
            <div className="font-sans">
              {filtered.map((e) => (
                <LogRow key={e.id} entry={e} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Showing the most recent {entries.length} of up to 200 calls. The log
        resets when you reload the page.
      </p>
    </div>
  );
}

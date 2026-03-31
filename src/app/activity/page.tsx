"use client";

import { useState, useMemo } from "react";
import {
  useCapabilities,
  useActivityEvents,
  useProjects,
  useEnvironments,
} from "@/lib/hooks/use-platform";
import type { ActivityFilters } from "@/types";
import { CapabilityNotice } from "@/components/shared/capability-notice";
import { ApiSurfaceCallout } from "@/components/shared/api-surface-callout";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { EventTimeline } from "@/components/activity/event-timeline";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Search, RotateCcw } from "lucide-react";

const EVENT_TYPES = [
  { value: "all", label: "All Events" },
  { value: "run_completed", label: "Run Completed" },
  { value: "run_failed", label: "Run Failed" },
  { value: "run_started", label: "Run Started" },
  { value: "job_triggered", label: "Job Triggered" },
  { value: "config_change", label: "Config Change" },
  { value: "webhook_received", label: "Webhook Received" },
];

const SOURCES = [
  { value: "all", label: "All Sources" },
  { value: "admin_api", label: "Admin API" },
  { value: "webhook", label: "Webhook" },
  { value: "audit_log", label: "Audit Log" },
  { value: "run_event", label: "Run Event" },
];

export default function ActivityPage() {
  const { data: capabilities } = useCapabilities();
  const { data: projects } = useProjects();
  const { data: environments } = useEnvironments();

  const [eventType, setEventType] = useState("all");
  const [source, setSource] = useState("all");
  const [projectId, setProjectId] = useState("all");
  const [environmentId, setEnvironmentId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const auditLogsAvailable = capabilities?.auditLogs !== false;

  const filters: ActivityFilters = useMemo(() => {
    const f: ActivityFilters = {};
    if (eventType !== "all") f.eventType = eventType;
    if (source !== "all") f.source = source;
    if (projectId !== "all") f.projectId = projectId;
    if (environmentId !== "all") f.environmentId = environmentId;
    return f;
  }, [eventType, source, projectId, environmentId]);

  const { data: events, isLoading } = useActivityEvents(filters);

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    if (!searchQuery) return events;
    const q = searchQuery.toLowerCase();
    return events.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        e.eventType.toLowerCase().includes(q) ||
        e.actor?.toLowerCase().includes(q)
    );
  }, [events, searchQuery]);

  const handleResetFilters = () => {
    setEventType("all");
    setSource("all");
    setProjectId("all");
    setEnvironmentId("all");
    setSearchQuery("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Activity & Operations
        </h1>
        <p className="mt-1 text-muted-foreground">
          Monitor platform activity, run events, configuration changes, and
          audit trail across your dbt Cloud account.
        </p>
      </div>

      {/* Audit log notice */}
      {capabilities && !auditLogsAvailable && (
        <CapabilityNotice
          title="Audit Logs Not Available"
          description="Full audit logging is not enabled for this account. The activity feed below is based on job and run events only. Enable audit logs in your dbt Cloud plan for comprehensive activity tracking."
        />
      )}

      {/* Filter bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="h-9 pl-8 text-xs"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Event type filter */}
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger className="h-9 w-[160px] text-xs">
                <SelectValue placeholder="Event type" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((et) => (
                  <SelectItem key={et.value} value={et.value}>
                    {et.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Source filter */}
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="h-9 w-[150px] text-xs">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Project filter */}
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="h-9 w-[160px] text-xs">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Environment filter */}
            <Select value={environmentId} onValueChange={setEnvironmentId}>
              <SelectTrigger className="h-9 w-[160px] text-xs">
                <SelectValue placeholder="Environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Environments</SelectItem>
                {environments?.map((env) => (
                  <SelectItem key={env.id} value={env.id}>
                    {env.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Reset */}
            <Button variant="ghost" size="sm" onClick={handleResetFilters}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      {isLoading && (
        <Card>
          <CardContent className="p-6">
            <TableSkeleton rows={6} />
          </CardContent>
        </Card>
      )}

      {!isLoading && filteredEvents.length === 0 && (
        <EmptyState
          icon={Activity}
          title="No activity events"
          description={
            searchQuery || eventType !== "all" || source !== "all"
              ? "No events match your current filters. Try broadening your search."
              : "No activity events have been recorded yet."
          }
          action={
            searchQuery || eventType !== "all" || source !== "all"
              ? { label: "Clear Filters", onClick: handleResetFilters }
              : undefined
          }
        />
      )}

      {!isLoading && filteredEvents.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
            </p>
          </div>
          <EventTimeline events={filteredEvents} />
        </div>
      )}

      {/* API callout */}
      <ApiSurfaceCallout
        title="Powered by Administrative API v2 (audit logs) + v3 (runs, jobs)"
        endpoints={[
          "GET /api/v2/accounts/{id}/audit-logs",
          "GET /api/v2/accounts/{id}/runs",
          "GET /api/v3/accounts/{id}/runs",
          "GET /api/v2/accounts/{id}/jobs",
          "POST /api/v2/accounts/{id}/webhooks/subscriptions",
        ]}
      />
    </div>
  );
}

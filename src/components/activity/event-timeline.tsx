"use client";

import Link from "next/link";
import type { DbtActivityEvent } from "@/types";
import { formatRelativeTime, formatDuration } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import {
  CheckCircle2,
  XCircle,
  Play,
  Settings,
  AlertTriangle,
  Bell,
  Webhook,
  User,
  Clock,
  GitBranch,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";

interface EventTimelineProps {
  events: DbtActivityEvent[];
  className?: string;
}

const EVENT_CONFIG: Record<
  string,
  { icon: LucideIcon; color: string; dotColor: string }
> = {
  run_completed: {
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    dotColor: "bg-green-500",
  },
  run_failed: {
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    dotColor: "bg-red-500",
  },
  run_started: {
    icon: Play,
    color: "text-blue-600 dark:text-blue-400",
    dotColor: "bg-blue-500",
  },
  job_triggered: {
    icon: Play,
    color: "text-blue-600 dark:text-blue-400",
    dotColor: "bg-blue-500",
  },
  run_cancelled: {
    icon: XCircle,
    color: "text-zinc-500",
    dotColor: "bg-zinc-400",
  },
  config_change: {
    icon: Settings,
    color: "text-purple-600 dark:text-purple-400",
    dotColor: "bg-purple-500",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-yellow-600 dark:text-yellow-400",
    dotColor: "bg-yellow-500",
  },
  webhook_received: {
    icon: Webhook,
    color: "text-cyan-600 dark:text-cyan-400",
    dotColor: "bg-cyan-500",
  },
};

const DEFAULT_EVENT = {
  icon: Bell,
  color: "text-muted-foreground",
  dotColor: "bg-muted-foreground",
};

function getEventConfig(eventType: string) {
  return EVENT_CONFIG[eventType] ?? DEFAULT_EVENT;
}

function getSourceBadgeVariant(source: string) {
  switch (source) {
    case "admin_api":
      return "default" as const;
    case "webhook":
      return "secondary" as const;
    case "audit_log":
      return "outline" as const;
    case "run_event":
      return "success" as const;
    default:
      return "secondary" as const;
  }
}

export function EventTimeline({ events, className }: EventTimelineProps) {
  return (
    <div className={cn("relative", className)}>
      {/* Vertical connecting line */}
      <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />

      <div className="space-y-4">
        {events.map((event) => {
          const config = getEventConfig(event.eventType);
          const Icon = config.icon;

          return (
            <div key={event.id} className="relative flex gap-4">
              {/* Timeline dot */}
              <div className="relative z-10 flex flex-col items-center">
                <div
                  className={cn(
                    "mt-1 h-[10px] w-[10px] rounded-full ring-2 ring-background",
                    config.dotColor
                  )}
                />
              </div>

              {/* Event card */}
              <Card className="flex-1">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", config.color)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{event.description}</p>
                        <span
                          className="shrink-0 text-[10px] text-muted-foreground"
                          title={new Date(event.timestamp).toLocaleString()}
                        >
                          {formatRelativeTime(event.timestamp)}
                        </span>
                      </div>

                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={getSourceBadgeVariant(event.source)}
                          className="text-[10px]"
                        >
                          {event.source.replace("_", " ")}
                        </Badge>

                        {event.eventType && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {event.eventType}
                          </span>
                        )}

                        {event.actor && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <User className="h-2.5 w-2.5" />
                            {event.actor}
                          </span>
                        )}
                      </div>

                      {/* Run event detail */}
                      {event.source === "run_event" && event.metadata && (
                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 rounded-md bg-muted/40 px-3 py-2 text-xs">
                          {event.metadata.duration != null && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDuration(event.metadata.duration as number)}
                            </span>
                          )}
                          {!!event.metadata.gitBranch && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <GitBranch className="h-3 w-3" />
                              {String(event.metadata.gitBranch)}
                            </span>
                          )}
                          {event.jobId && (
                            <Link
                              href={`/jobs`}
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Job {event.jobId}
                            </Link>
                          )}
                          {event.runId && (
                            <Link
                              href={`/runs/${event.runId}`}
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Run {event.runId}
                            </Link>
                          )}
                        </div>
                      )}

                      {/* Audit log linked entities */}
                      {event.source !== "run_event" && (event.projectId || event.jobId || event.runId) && (
                        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                          {event.projectId && (
                            <span className="text-[10px] text-muted-foreground">
                              Project: {event.projectId}
                            </span>
                          )}
                          {event.jobId && (
                            <span className="text-[10px] text-muted-foreground">
                              Job: {event.jobId}
                            </span>
                          )}
                          {event.runId && (
                            <span className="text-[10px] text-muted-foreground">
                              Run: {event.runId}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}

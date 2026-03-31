"use client";

import Link from "next/link";
import {
  Play,
  CheckCircle2,
  XCircle,
  Settings,
  GitBranch,
  AlertCircle,
  Activity,
  Zap,
} from "lucide-react";
import type { DbtActivityEvent } from "@/types";
import { cn } from "@/lib/utils/cn";
import { formatRelativeTime } from "@/lib/utils/format";

interface ActivityFeedProps {
  events: DbtActivityEvent[];
  className?: string;
}

function getEventIcon(eventType: string) {
  switch (eventType) {
    case "run.started":
    case "run.triggered":
      return <Play className="h-3.5 w-3.5 text-blue-500" />;
    case "run.completed":
    case "run.success":
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    case "run.failed":
    case "run.error":
      return <XCircle className="h-3.5 w-3.5 text-red-500" />;
    case "job.created":
    case "job.updated":
      return <Settings className="h-3.5 w-3.5 text-muted-foreground" />;
    case "deploy":
    case "deploy.completed":
      return <GitBranch className="h-3.5 w-3.5 text-purple-500" />;
    case "alert":
    case "alert.triggered":
      return <AlertCircle className="h-3.5 w-3.5 text-amber-500" />;
    case "webhook.received":
      return <Zap className="h-3.5 w-3.5 text-amber-500" />;
    default:
      return <Activity className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function getEventLink(event: DbtActivityEvent): string | null {
  if (event.runId) return `/runs/${event.runId}`;
  if (event.jobId) return `/jobs/${event.jobId}`;
  return null;
}

export function ActivityFeed({ events, className }: ActivityFeedProps) {
  const displayEvents = events.slice(0, 8);

  if (displayEvents.length === 0) {
    return (
      <div className={cn("flex items-center justify-center py-8 text-sm text-muted-foreground", className)}>
        No recent activity.
      </div>
    );
  }

  return (
    <div className={cn("space-y-0.5", className)}>
      {displayEvents.map((event, idx) => {
        const link = getEventLink(event);
        const content = (
          <div className="flex items-start gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted/60">
            <div className="mt-0.5 shrink-0">{getEventIcon(event.eventType)}</div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-foreground">{event.description}</p>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                {event.actor && <span>{event.actor}</span>}
                {event.actor && <span aria-hidden="true">&middot;</span>}
                <span>{formatRelativeTime(event.timestamp)}</span>
              </div>
            </div>
          </div>
        );

        if (link) {
          return (
            <Link key={event.id} href={link} className="block">
              {content}
            </Link>
          );
        }

        return (
          <div key={event.id}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

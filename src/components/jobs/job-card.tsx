"use client";

import Link from "next/link";
import {
  Play,
  Calendar,
  GitPullRequest,
  Webhook,
  MousePointerClick,
  Terminal,
} from "lucide-react";
import type { DbtJob, DbtProject, DbtEnvironment, RunStatus } from "@/types";
import { useTriggerRun } from "@/lib/hooks";
import { formatDuration, formatRelativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { StatusBadge } from "@/components/shared/status-badge";
import { RuntimeSparkline } from "@/components/shared/runtime-sparkline";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface JobCardProps {
  job: DbtJob;
  project?: DbtProject;
  environment?: DbtEnvironment;
}

const statusDotColors: Record<RunStatus, string> = {
  success: "bg-green-500",
  error: "bg-red-500",
  running: "bg-blue-500 animate-pulse",
  queued: "bg-yellow-500",
  starting: "bg-blue-400",
  cancelled: "bg-zinc-400",
  skipped: "bg-zinc-300",
};

function triggerBadges(job: DbtJob) {
  const badges: { label: string; icon: React.ReactNode }[] = [];
  if (job.triggers.schedule) badges.push({ label: "Schedule", icon: <Calendar className="h-3 w-3" /> });
  if (job.triggers.githubWebhook) badges.push({ label: "PR", icon: <GitPullRequest className="h-3 w-3" /> });
  if (job.triggers.gitProviderWebhook) badges.push({ label: "Webhook", icon: <Webhook className="h-3 w-3" /> });
  if (job.triggers.onMerge) badges.push({ label: "On Merge", icon: <GitPullRequest className="h-3 w-3" /> });
  if (job.triggers.custom) badges.push({ label: "API", icon: <Terminal className="h-3 w-3" /> });
  if (badges.length === 0) badges.push({ label: "Manual", icon: <MousePointerClick className="h-3 w-3" /> });
  return badges;
}

export function JobCard({ job, project, environment }: JobCardProps) {
  const triggerRun = useTriggerRun();
  const durations = job.recentRuns
    .filter((r) => r.duration != null)
    .map((r) => r.duration!);

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-5 space-y-4">
        {/* Job name */}
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/jobs/${job.id}`}
            className="text-sm font-bold hover:underline underline-offset-2 leading-tight"
          >
            {job.name}
          </Link>
          {job.lastRunStatus && <StatusBadge status={job.lastRunStatus} />}
        </div>

        {/* Project + environment */}
        <div className="flex flex-wrap gap-1.5">
          {project && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0">
              {project.name}
            </Badge>
          )}
          {environment && (
            <Badge variant="outline" className="text-[10px] px-2 py-0">
              {environment.name}
            </Badge>
          )}
        </div>

        {/* Execute steps */}
        {job.executeSteps.length > 0 && (
          <div className="space-y-1">
            {job.executeSteps.slice(0, 2).map((step, i) => (
              <code
                key={i}
                className="block text-[11px] font-mono bg-muted rounded px-2 py-1 text-muted-foreground truncate"
              >
                {step}
              </code>
            ))}
            {job.executeSteps.length > 2 && (
              <span className="text-[10px] text-muted-foreground">
                +{job.executeSteps.length - 2} more steps
              </span>
            )}
          </div>
        )}

        {/* Trigger badges */}
        <div className="flex flex-wrap gap-1.5">
          {triggerBadges(job).map((t) => (
            <Badge key={t.label} variant="outline" className="text-[10px] gap-1 px-2 py-0">
              {t.icon}
              {t.label}
            </Badge>
          ))}
          {job.scheduleCron && (
            <Badge variant="outline" className="text-[10px] font-mono px-2 py-0">
              {job.scheduleCron}
            </Badge>
          )}
        </div>

        {/* Recent runs dots + sparkline */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1" title="Last 5 runs">
            {job.recentRuns.slice(0, 5).map((run) => (
              <span
                key={run.id}
                className={cn("h-2.5 w-2.5 rounded-full shrink-0", statusDotColors[run.status])}
                title={`${run.status} - ${formatRelativeTime(run.finishedAt)}`}
              />
            ))}
            {job.recentRuns.length === 0 && (
              <span className="text-[10px] text-muted-foreground">No runs yet</span>
            )}
          </div>
          {durations.length >= 2 && <RuntimeSparkline data={durations} />}
        </div>

        {/* Last run info + actions */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <span className="text-[11px] text-muted-foreground">
            {job.lastRunAt ? `Last run ${formatRelativeTime(job.lastRunAt)}` : "Never run"}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            disabled={triggerRun.isPending}
            onClick={(e) => {
              e.preventDefault();
              triggerRun.mutate({ jobId: job.id, cause: "Triggered from Command Center" });
            }}
          >
            <Play className="h-3 w-3" />
            Run Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

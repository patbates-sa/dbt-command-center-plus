import type { RunStatus } from "@/types";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";

const statusConfig: Record<
  RunStatus,
  { label: string; className: string }
> = {
  success: {
    label: "Success",
    className: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20",
  },
  error: {
    label: "Error",
    className: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20",
  },
  running: {
    label: "Running",
    className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20 animate-pulse",
  },
  queued: {
    label: "Queued",
    className: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  },
  starting: {
    label: "Starting",
    className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
  },
  skipped: {
    label: "Skipped",
    className: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
  },
};

interface StatusBadgeProps {
  status: RunStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}

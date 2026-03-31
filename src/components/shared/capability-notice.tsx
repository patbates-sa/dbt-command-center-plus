import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface CapabilityNoticeProps {
  title: string;
  description: string;
  className?: string;
}

export function CapabilityNotice({
  title,
  description,
  className,
}: CapabilityNoticeProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-muted bg-muted/40 px-4 py-3",
        className
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

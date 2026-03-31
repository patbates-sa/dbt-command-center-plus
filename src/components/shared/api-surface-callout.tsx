"use client";

import { useState } from "react";
import { Zap, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ApiSurfaceCalloutProps {
  title: string;
  endpoints?: string[];
  className?: string;
}

export function ApiSurfaceCallout({
  title,
  endpoints,
  className,
}: ApiSurfaceCalloutProps) {
  const [expanded, setExpanded] = useState(false);
  const hasEndpoints = endpoints && endpoints.length > 0;

  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 px-4 py-3",
        className
      )}
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 text-left"
        onClick={() => hasEndpoints && setExpanded(!expanded)}
        disabled={!hasEndpoints}
      >
        <Zap className="h-3.5 w-3.5 shrink-0 text-amber-500" />
        <span className="flex-1 text-xs font-medium text-muted-foreground">
          {title}
        </span>
        {hasEndpoints &&
          (expanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          ))}
      </button>

      {expanded && hasEndpoints && (
        <ul className="mt-2 space-y-1 pl-5">
          {endpoints.map((endpoint) => (
            <li
              key={endpoint}
              className="text-xs font-mono text-muted-foreground"
            >
              {endpoint}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Card, CardContent } from "@/components/ui/card";
import { RuntimeSparkline } from "@/components/shared/runtime-sparkline";

interface KpiStatCardProps {
  label: string;
  value: string | number;
  trend?: number[];
  change?: number;
  changeLabel?: string;
  className?: string;
}

export function KpiStatCard({
  label,
  value,
  trend,
  change,
  changeLabel,
  className,
}: KpiStatCardProps) {
  const isPositive = change != null && change >= 0;

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-5">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <span className="text-2xl font-bold tracking-tight">{value}</span>
          {trend && trend.length > 1 && (
            <RuntimeSparkline data={trend} className="opacity-60" />
          )}
        </div>
        {change != null && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            {isPositive ? (
              <ArrowUp className="h-3 w-3 text-green-600 dark:text-green-400" />
            ) : (
              <ArrowDown className="h-3 w-3 text-red-600 dark:text-red-400" />
            )}
            <span
              className={cn(
                "font-medium",
                isPositive
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {Math.abs(change)}%
            </span>
            {changeLabel && (
              <span className="text-muted-foreground">{changeLabel}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

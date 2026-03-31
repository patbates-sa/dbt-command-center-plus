"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DbtRun } from "@/types";

interface RuntimeTrendChartProps {
  runs: DbtRun[];
}

interface DayRuntime {
  label: string;
  avgRuntime: number;
  count: number;
}

export function RuntimeTrendChart({ runs }: RuntimeTrendChartProps) {
  // Aggregate average runtime per day for last 7 days
  const now = new Date();
  const dayMap = new Map<string, { total: number; count: number }>();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, { total: 0, count: 0 });
  }

  for (const run of runs) {
    if (run.duration == null) continue;
    const dateKey = run.createdAt.slice(0, 10);
    const bucket = dayMap.get(dateKey);
    if (!bucket) continue;
    bucket.total += run.duration;
    bucket.count += 1;
  }

  const chartData: DayRuntime[] = [];
  for (const [date, bucket] of dayMap) {
    chartData.push({
      label: new Date(date + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      avgRuntime: bucket.count > 0 ? Math.round(bucket.total / bucket.count) : 0,
      count: bucket.count,
    });
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: "hsl(215.4 16.3% 46.9%)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "hsl(215.4 16.3% 46.9%)" }}
          axisLine={false}
          tickLine={false}
          width={40}
          tickFormatter={(v: number) => (v >= 60 ? `${Math.round(v / 60)}m` : `${v}s`)}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid hsl(214.3 31.8% 91.4%)",
            fontSize: "12px",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
          }}
          formatter={(value: number) => {
            if (value >= 60) {
              const m = Math.floor(value / 60);
              const s = value % 60;
              return [`${m}m ${s}s`, "Avg Runtime"];
            }
            return [`${value}s`, "Avg Runtime"];
          }}
        />
        <Line
          type="monotone"
          dataKey="avgRuntime"
          name="Avg Runtime"
          stroke="hsl(221.2 83% 53.3%)"
          strokeWidth={2}
          dot={{ r: 3, fill: "hsl(221.2 83% 53.3%)" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

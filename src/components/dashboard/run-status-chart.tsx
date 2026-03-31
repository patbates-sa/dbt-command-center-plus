"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { DbtRun } from "@/types";

interface RunStatusChartProps {
  runs: DbtRun[];
}

interface DayBucket {
  date: string;
  success: number;
  error: number;
  other: number;
}

export function RunStatusChart({ runs }: RunStatusChartProps) {
  // Build last 7 days
  const now = new Date();
  const days: DayBucket[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, success: 0, error: 0, other: 0 });
  }

  const dayMap = new Map(days.map((d) => [d.date, d]));

  for (const run of runs) {
    const dateKey = run.createdAt.slice(0, 10);
    const bucket = dayMap.get(dateKey);
    if (!bucket) continue;
    if (run.status === "success") bucket.success++;
    else if (run.status === "error") bucket.error++;
    else bucket.other++;
  }

  // Format date labels
  const chartData = days.map((d) => ({
    ...d,
    label: new Date(d.date + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: "hsl(215.4 16.3% 46.9%)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 12, fill: "hsl(215.4 16.3% 46.9%)" }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid hsl(214.3 31.8% 91.4%)",
            fontSize: "12px",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
        />
        <Bar
          dataKey="success"
          name="Success"
          fill="#22c55e"
          radius={[2, 2, 0, 0]}
          stackId="stack"
        />
        <Bar
          dataKey="error"
          name="Error"
          fill="#ef4444"
          radius={[0, 0, 0, 0]}
          stackId="stack"
        />
        <Bar
          dataKey="other"
          name="Other"
          fill="#eab308"
          radius={[2, 2, 0, 0]}
          stackId="stack"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

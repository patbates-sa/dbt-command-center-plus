"use client";

import { useState, useMemo, useCallback } from "react";
import type { DbtSemanticQueryResult } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeViewer } from "@/components/shared/code-viewer";
import { formatDuration } from "@/lib/utils/format";
import {
  Download,
  Table as TableIcon,
  BarChart3,
  Code,
  Clock,
  Rows3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ResultsViewProps {
  result: DbtSemanticQueryResult;
  metricName: string;
}

export function ResultsView({ result, metricName }: ResultsViewProps) {
  const [showSql, setShowSql] = useState(false);
  const [view, setView] = useState<"table" | "chart">("table");

  const hasTimeColumn = useMemo(() => {
    const timeCols = ["date", "time", "day", "week", "month", "quarter", "year", "metric_time"];
    return result.columns.some((col) =>
      timeCols.some((tc) => col.toLowerCase().includes(tc))
    );
  }, [result.columns]);

  const numericColumns = useMemo(() => {
    if (result.rows.length === 0) return [];
    return result.columns.filter((col) => {
      const sample = result.rows[0][col];
      return typeof sample === "number";
    });
  }, [result.columns, result.rows]);

  const chartDataKey = useMemo(() => {
    const timeCols = ["date", "time", "day", "week", "month", "quarter", "year", "metric_time"];
    const timeCol = result.columns.find((col) =>
      timeCols.some((tc) => col.toLowerCase().includes(tc))
    );
    return timeCol ?? result.columns[0];
  }, [result.columns]);

  const valueKey = useMemo(() => {
    return numericColumns[0] ?? result.columns[result.columns.length - 1];
  }, [numericColumns, result.columns]);

  const handleExportCsv = useCallback(() => {
    const header = result.columns.join(",");
    const rows = result.rows.map((row) =>
      result.columns.map((col) => {
        const val = row[col];
        if (val == null) return "";
        if (typeof val === "string" && val.includes(",")) return `"${val}"`;
        return String(val);
      }).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${metricName}-query-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result, metricName]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Query Results</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {result.executionTimeMs != null
                ? `${result.executionTimeMs}ms`
                : "N/A"}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Rows3 className="h-3 w-3" />
              {result.totalRows} row{result.totalRows !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* View toggles */}
        <div className="mt-2 flex items-center gap-2">
          <Button
            variant={view === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("table")}
          >
            <TableIcon className="mr-1.5 h-3.5 w-3.5" />
            Table
          </Button>
          <Button
            variant={view === "chart" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("chart")}
            disabled={numericColumns.length === 0}
          >
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
            Chart
          </Button>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => setShowSql(!showSql)}>
            <Code className="mr-1.5 h-3.5 w-3.5" />
            {showSql ? "Hide SQL" : "Show SQL"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Table view */}
        {view === "table" && (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {result.columns.map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {result.columns.map((col) => (
                      <td key={col} className="px-3 py-2 text-xs">
                        {row[col] != null ? String(row[col]) : "null"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Chart view */}
        {view === "chart" && numericColumns.length > 0 && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {hasTimeColumn ? (
                <LineChart data={result.rows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey={chartDataKey}
                    tick={{ fontSize: 11 }}
                    angle={-30}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey={valueKey}
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              ) : (
                <BarChart data={result.rows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey={chartDataKey}
                    tick={{ fontSize: 11 }}
                    angle={-30}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar
                    dataKey={valueKey}
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {/* SQL preview */}
        {showSql && result.generatedSql && (
          <CodeViewer
            code={result.generatedSql}
            language="sql"
            title="Generated SQL"
          />
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useCallback } from "react";
import type { DbtMetric } from "@/types";
import type { MetricQueryParams } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, RotateCcw } from "lucide-react";

interface QueryBuilderProps {
  metric: DbtMetric;
  onExecute: (params: MetricQueryParams) => void;
  isLoading?: boolean;
}

const TIME_GRAINS = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
];

export function QueryBuilder({
  metric,
  onExecute,
  isLoading,
}: QueryBuilderProps) {
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<string>("");
  const [timeGrain, setTimeGrain] = useState<string>("month");
  const [filterText, setFilterText] = useState<string>("");

  const toggleDimension = useCallback((dim: string) => {
    setSelectedDimensions((prev) =>
      prev.includes(dim) ? prev.filter((d) => d !== dim) : [...prev, dim]
    );
  }, []);

  const handleReset = useCallback(() => {
    setSelectedDimensions([]);
    setGroupBy("");
    setTimeGrain("month");
    setFilterText("");
  }, []);

  const handleExecute = useCallback(() => {
    const params: MetricQueryParams = {
      metricName: metric.name,
      dimensions: selectedDimensions.length > 0 ? selectedDimensions : undefined,
      timeGrain,
      filters: filterText
        ? { filter: filterText }
        : undefined,
    };
    onExecute(params);
  }, [metric.name, selectedDimensions, timeGrain, filterText, onExecute]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Query Builder</CardTitle>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
        <div className="mt-1">
          <p className="text-sm font-medium">{metric.label}</p>
          {metric.description && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {metric.description}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dimensions multi-select */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Dimensions
          </label>
          {metric.dimensions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {metric.dimensions.map((dim) => (
                <button
                  key={dim}
                  type="button"
                  onClick={() => toggleDimension(dim)}
                  className="inline-flex items-center gap-1"
                >
                  <Badge
                    variant={selectedDimensions.includes(dim) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                  >
                    {dim}
                  </Badge>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No dimensions available</p>
          )}
        </div>

        {/* Group By */}
        {selectedDimensions.length > 0 && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Group By
            </label>
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select dimension to group by" />
              </SelectTrigger>
              <SelectContent>
                {selectedDimensions.map((dim) => (
                  <SelectItem key={dim} value={dim}>
                    {dim}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Time Grain */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Time Grain
          </label>
          <Select value={timeGrain} onValueChange={setTimeGrain}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Select time grain" />
            </SelectTrigger>
            <SelectContent>
              {TIME_GRAINS.map((grain) => (
                <SelectItem key={grain.value} value={grain.value}>
                  {grain.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filter */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Filter (optional)
          </label>
          <Input
            className="h-9 text-xs"
            placeholder='e.g. status = "active"'
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>

        {/* Execute */}
        <Button
          className="w-full"
          onClick={handleExecute}
          disabled={isLoading}
        >
          <Play className="mr-1.5 h-3.5 w-3.5" />
          {isLoading ? "Running..." : "Run Query"}
        </Button>
      </CardContent>
    </Card>
  );
}

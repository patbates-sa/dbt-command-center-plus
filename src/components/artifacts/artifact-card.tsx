"use client";

import { useState } from "react";
import {
  FileJson,
  FileText,
  File,
  Download,
  Eye,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  MinusCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import type { DbtArtifact, ArtifactSummary } from "@/types";
import { cn } from "@/lib/utils/cn";
import { formatRelativeTime } from "@/lib/utils/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ArtifactCardProps {
  artifact: DbtArtifact;
  onPreview: (artifact: DbtArtifact) => void;
  className?: string;
}

function getFileIcon(fileName: string) {
  if (fileName.endsWith(".json")) return FileJson;
  if (fileName.endsWith(".log") || fileName.endsWith(".txt")) return FileText;
  return File;
}

function getTypeBadgeVariant(type: string): "default" | "secondary" | "outline" {
  switch (type) {
    case "manifest":
      return "default";
    case "run_results":
      return "secondary";
    case "catalog":
      return "outline";
    default:
      return "secondary";
  }
}

function formatFileSize(bytes?: number): string {
  if (bytes == null) return "--";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildCurlCommand(artifact: DbtArtifact): string {
  return `curl -H "Authorization: Token $DBT_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  "https://cloud.getdbt.com/api/v3/accounts/{account_id}/runs/${artifact.runId}/artifacts/${artifact.fileName}"`;
}

export function ArtifactCard({ artifact, onPreview, className }: ArtifactCardProps) {
  const [copied, setCopied] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const Icon = getFileIcon(artifact.fileName);

  const handleCopyRequest = async () => {
    const curl = buildCurlCommand(artifact);
    await navigator.clipboard.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    // In a production deployment, this would fetch the artifact content from the API
    const blob = new Blob([JSON.stringify({ artifact: artifact.fileName, runId: artifact.runId }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = artifact.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className={cn("transition-shadow hover:shadow-md", className)}>
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-muted p-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold">{artifact.fileName}</h3>
              <Badge variant={getTypeBadgeVariant(artifact.type)}>{artifact.type}</Badge>
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{formatFileSize(artifact.size)}</span>
              <span>{formatRelativeTime(artifact.generatedAt)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-3 flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onPreview(artifact)}>
            <Eye className="mr-1 h-3 w-3" />
            Preview
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleDownload}>
            <Download className="mr-1 h-3 w-3" />
            Download
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCopyRequest}>
            {copied ? (
              <>
                <Check className="mr-1 h-3 w-3 text-green-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-1 h-3 w-3" />
                Copy API Request
              </>
            )}
          </Button>
        </div>

        {/* Parsed summary (expandable) */}
        {artifact.parsedSummary && (
          <div className="mt-3 border-t pt-3">
            <button
              className="flex w-full items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setSummaryExpanded(!summaryExpanded)}
            >
              {summaryExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              Parsed Summary
            </button>
            {summaryExpanded && (
              <ArtifactSummaryView summary={artifact.parsedSummary} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ArtifactSummaryView({ summary }: { summary: ArtifactSummary }) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {summary.successNodes != null && (
        <div className="flex items-center gap-1.5 rounded-md bg-green-500/10 px-2 py-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          <div>
            <p className="text-xs font-semibold text-green-700 dark:text-green-400">
              {summary.successNodes}
            </p>
            <p className="text-[10px] text-muted-foreground">Success</p>
          </div>
        </div>
      )}
      {summary.errorNodes != null && (
        <div className="flex items-center gap-1.5 rounded-md bg-red-500/10 px-2 py-1.5">
          <XCircle className="h-3.5 w-3.5 text-red-500" />
          <div>
            <p className="text-xs font-semibold text-red-700 dark:text-red-400">
              {summary.errorNodes}
            </p>
            <p className="text-[10px] text-muted-foreground">Errors</p>
          </div>
        </div>
      )}
      {summary.skippedNodes != null && (
        <div className="flex items-center gap-1.5 rounded-md bg-zinc-500/10 px-2 py-1.5">
          <MinusCircle className="h-3.5 w-3.5 text-zinc-500" />
          <div>
            <p className="text-xs font-semibold">{summary.skippedNodes}</p>
            <p className="text-[10px] text-muted-foreground">Skipped</p>
          </div>
        </div>
      )}
      {summary.warningNodes != null && (
        <div className="flex items-center gap-1.5 rounded-md bg-yellow-500/10 px-2 py-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
          <div>
            <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">
              {summary.warningNodes}
            </p>
            <p className="text-[10px] text-muted-foreground">Warnings</p>
          </div>
        </div>
      )}
      {summary.totalNodes != null && (
        <div className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1.5">
          <FileJson className="h-3.5 w-3.5 text-muted-foreground" />
          <div>
            <p className="text-xs font-semibold">{summary.totalNodes}</p>
            <p className="text-[10px] text-muted-foreground">Total Nodes</p>
          </div>
        </div>
      )}
      {summary.elapsedTime != null && (
        <div className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <div>
            <p className="text-xs font-semibold">{summary.elapsedTime.toFixed(1)}s</p>
            <p className="text-[10px] text-muted-foreground">Duration</p>
          </div>
        </div>
      )}
    </div>
  );
}

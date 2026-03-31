"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Search, ArrowDown, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

interface LogsViewerProps {
  logs: string;
  className?: string;
  autoScroll?: boolean;
}

export function LogsViewer({
  logs,
  className,
  autoScroll: initialAutoScroll = false,
}: LogsViewerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);
  const [autoScroll, setAutoScroll] = useState(initialAutoScroll);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const lines = useMemo(() => logs.split("\n"), [logs]);

  // Auto-scroll to bottom when logs change
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setSearchVisible(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setSearchVisible(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const highlightLine = useCallback(
    (line: string): React.ReactNode => {
      if (!searchQuery) return line;
      const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
      const parts = line.split(regex);
      return parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-300 text-black rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      );
    },
    [searchQuery]
  );

  const getLineClass = (line: string): string => {
    const lower = line.toLowerCase();
    if (lower.includes("error") || lower.includes("fatal") || lower.includes("failure")) {
      return "bg-red-500/10 text-red-400";
    }
    if (lower.includes("warn")) {
      return "bg-yellow-500/10 text-yellow-400";
    }
    return "";
  };

  const isTimestamp = (segment: string): boolean =>
    /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(segment);

  const matchCount = useMemo(() => {
    if (!searchQuery) return 0;
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    return (logs.match(regex) || []).length;
  }, [logs, searchQuery]);

  return (
    <div className={cn("relative flex flex-col overflow-hidden rounded-lg border bg-zinc-950", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-1.5">
        <span className="text-xs font-medium text-zinc-400">
          {lines.length} lines
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white"
            onClick={() => {
              setSearchVisible(!searchVisible);
              if (!searchVisible) {
                setTimeout(() => searchInputRef.current?.focus(), 50);
              } else {
                setSearchQuery("");
              }
            }}
          >
            <Search className="mr-1 h-3 w-3" />
            Search
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 text-xs hover:bg-zinc-800 hover:text-white",
              autoScroll ? "text-blue-400" : "text-zinc-400"
            )}
            onClick={() => setAutoScroll(!autoScroll)}
          >
            <ArrowDown className="mr-1 h-3 w-3" />
            Auto-scroll
          </Button>
        </div>
      </div>

      {/* Search bar */}
      {searchVisible && (
        <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-zinc-500" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
          />
          {searchQuery && (
            <span className="text-xs text-zinc-500">
              {matchCount} match{matchCount !== 1 ? "es" : ""}
            </span>
          )}
          <button
            onClick={() => {
              setSearchVisible(false);
              setSearchQuery("");
            }}
            className="text-zinc-500 hover:text-zinc-300"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Log content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-0 font-mono text-xs leading-5"
        style={{ maxHeight: 500 }}
      >
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, i) => {
              // Hide lines that don't match search
              if (
                searchQuery &&
                !line.toLowerCase().includes(searchQuery.toLowerCase())
              ) {
                return null;
              }

              const lineClass = getLineClass(line);
              // Extract and highlight timestamp at start of line
              const tsMatch = line.match(/^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[.\d]*Z?)\s*/);

              return (
                <tr key={i} className={cn("hover:bg-zinc-900/50", lineClass)}>
                  <td className="select-none border-r border-zinc-800 px-3 py-0 text-right text-zinc-600 align-top">
                    {i + 1}
                  </td>
                  <td className="whitespace-pre-wrap break-all px-3 py-0 text-zinc-300">
                    {tsMatch ? (
                      <>
                        <span className="text-cyan-500">{tsMatch[1]}</span>
                        {highlightLine(line.slice(tsMatch[0].length))}
                      </>
                    ) : (
                      highlightLine(line)
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

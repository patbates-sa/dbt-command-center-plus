"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  GitBranch,
  Play,
  FileArchive,
  Server,
  BarChart3,
  Activity,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCapabilities } from "@/lib/hooks/use-platform";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Catalog", icon: BookOpen, href: "/catalog" },
  { label: "Lineage", icon: GitBranch, href: "/lineage" },
  { label: "Jobs", icon: Play, href: "/jobs" },
  { label: "Artifacts", icon: FileArchive, href: "/artifacts" },
  { label: "Environments", icon: Server, href: "/environments" },
  { label: "Metrics", icon: BarChart3, href: "/metrics" },
  { label: "Activity", icon: Activity, href: "/activity" },
  { label: "Setup", icon: Settings, href: "/setup" },
] as const;

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const capabilitiesQuery = useCapabilities();
  const isConnected = capabilitiesQuery.data?.adminApi ?? false;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar */}
        <aside
          className={cn(
            "flex flex-col border-r bg-zinc-900 text-zinc-300 transition-all duration-200",
            collapsed ? "w-16" : "w-60"
          )}
        >
          {/* Sidebar header */}
          <div className="flex h-14 items-center justify-between border-b border-zinc-800 px-3">
            {!collapsed && (
              <span className="text-sm font-semibold text-white truncate">
                dbt Command Center
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              const linkContent = (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-400 hover:bg-zinc-800/60 hover:text-white",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return <React.Fragment key={item.href}>{linkContent}</React.Fragment>;
            })}
          </nav>

          {/* Sidebar footer */}
          {!collapsed && (
            <div className="border-t border-zinc-800 px-4 py-3">
              <p className="text-[11px] text-zinc-500">
                Powered by dbt APIs
              </p>
            </div>
          )}
        </aside>

        {/* Main area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <header className="flex h-14 items-center justify-between border-b bg-background px-6">
            <h1 className="text-lg font-semibold">dbt Command Center</h1>
            <Badge
              variant={isConnected ? "success" : "warning"}
              className="uppercase text-[11px] tracking-wide"
            >
              {isConnected ? "connected" : "not connected"}
            </Badge>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}

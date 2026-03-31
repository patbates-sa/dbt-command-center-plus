import {
  Box,
  Database,
  Eye,
  TrendingUp,
  Layers,
  CheckCircle,
  Sprout,
  Camera,
  type LucideIcon,
} from "lucide-react";
import type { ResourceType } from "@/types";
import { cn } from "@/lib/utils/cn";

const iconMap: Record<ResourceType, LucideIcon> = {
  model: Box,
  source: Database,
  exposure: Eye,
  metric: TrendingUp,
  semantic_model: Layers,
  test: CheckCircle,
  seed: Sprout,
  snapshot: Camera,
};

const colorMap: Record<ResourceType, string> = {
  model: "text-blue-500",
  source: "text-green-500",
  exposure: "text-purple-500",
  metric: "text-orange-500",
  semantic_model: "text-indigo-500",
  test: "text-emerald-500",
  seed: "text-lime-500",
  snapshot: "text-amber-500",
};

export function getResourceTypeColor(resourceType: ResourceType): string {
  return colorMap[resourceType];
}

interface ResourceTypeIconProps {
  resourceType: ResourceType;
  className?: string;
}

export function ResourceTypeIcon({
  resourceType,
  className,
}: ResourceTypeIconProps) {
  const Icon = iconMap[resourceType];
  const color = colorMap[resourceType];

  return <Icon className={cn("h-4 w-4", color, className)} />;
}

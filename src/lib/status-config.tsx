import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  HelpCircle,
  XCircle,
  RotateCw,
} from "lucide-react";
import type { SwimlaneStatusType } from "./types";

/**
 * Centralized status configuration for consistent styling and behavior
 * across all swimlane components
 */
export const STATUS_CONFIG = {
  completed: {
    label: "Done",
    icon: CheckCircle2,
    colors: {
      text: "text-green-03",
      background: "bg-green-03/60",
      border: "border-transparent",
      icon: "text-green-03",
      iconCompact: "text-white",
    },
  },
  failed: {
    label: "Requires Action",
    icon: XCircle,
    colors: {
      text: "text-pink-03",
      background: "bg-pink-03/60",
      border: "border-transparent",
      icon: "text-pink-03",
      iconCompact: "text-white",
    },
  },
  processing: {
    label: "In Progress",
    icon: RotateCw,
    colors: {
      text: "text-blue-03",
      background: "bg-blue-03/60",
      border: "border-blue-03",
      icon: "text-blue-03",
      iconCompact: "text-white",
    },
    animation: "animate-spin-slow",
  },
  needs_approval: {
    label: "Awaiting Approval",
    icon: HelpCircle,
    colors: {
      text: "text-orange-03",
      background: "bg-orange-03/60",
      border: "border-transparent",
      icon: "text-orange-03",
      iconCompact: "text-white",
    },
  },
  waiting: {
    label: "Waiting",
    icon: Clock,
    colors: {
      text: "text-gray-02",
      background: "bg-gray-03/60",
      border: "border-gray-03",
      icon: "text-gray-02",
      iconCompact: "text-white",
    },
  },
} as const;

/**
 * Get status configuration for a given status type
 */
export function getStatusConfig(status: SwimlaneStatusType) {
  return STATUS_CONFIG[status];
}

/**
 * Get status label with special handling for active processing
 */
export function getStatusLabel(
  status: SwimlaneStatusType,
  isActive?: boolean
): string {
  if (isActive) return "Processing Now";
  return STATUS_CONFIG[status].label;
}

/**
 * Get icon component for a status
 */
export function getStatusIcon(
  status: SwimlaneStatusType,
  variant: "compact" | "detailed",
  isActive?: boolean
) {
  const config = STATUS_CONFIG[status];
  const IconComponent = config.icon;

  const sizeClasses = {
    compact: "w-3 h-3",
    detailed: "w-4 h-4",
  };

  const colorClass =
    variant === "compact" ? config.colors.iconCompact : config.colors.icon;

  const animationClass =
    status === "processing" && isActive ? config.animation || "" : "";

  return (
    <IconComponent
      className={`${sizeClasses[variant]} ${colorClass} ${animationClass}`.trim()}
    />
  );
}

/**
 * Get compact view styles for a status
 */
export function getCompactStyles(
  status: SwimlaneStatusType,
  isActive?: boolean
): string {
  const config = STATUS_CONFIG[status];

  if (status === "processing" && isActive) {
    return `text-white ${config.colors.background} ${config.colors.border} ring-2 ring-blue-03/50 animate-pulse`;
  }

  return `text-white ${config.colors.background} ${config.colors.border}`;
}

/**
 * Get detailed view text color for a status
 */
export function getDetailedTextColor(status: SwimlaneStatusType): string {
  return STATUS_CONFIG[status].colors.text;
}

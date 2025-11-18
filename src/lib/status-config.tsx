import {
  CheckCircle2,
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
      background: "bg-blue-01/50",
      border: "border-blue-02/60",
      icon: "text-blue-03",
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
    status === "processing" && isActive ? (config as any).animation || "" : "";

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
  isActive?: boolean,
  jobExists?: boolean
): string {
  const config = STATUS_CONFIG[status];

  // If job doesn't exist, use a more subtle gray style
  if (jobExists === false) {
    return `text-gray-02 bg-gray-03/30 border-gray-03/50`;
  }

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

/**
 * Get background color for status indicators (with /20 opacity for dialogs)
 */
export function getStatusBackgroundColor(status: SwimlaneStatusType): string {
  const backgroundMap = {
    completed: "bg-green-03/20",
    failed: "bg-pink-03/20",
    processing: "bg-blue-03/20",
    needs_approval: "bg-orange-03/20",
    waiting: "bg-blue-01/20",
  };
  return backgroundMap[status];
}

/**
 * Get Swedish status labels for dialogs
 */
export function getStatusLabelSwedish(
  status: SwimlaneStatusType,
  isActive?: boolean
): string {
  if (status === "processing" && isActive) {
    return "Bearbetar nu";
  }

  const swedishLabels = {
    completed: "Slutförd",
    failed: "Misslyckad",
    processing: "Bearbetar",
    needs_approval: "Väntar på godkännande",
    waiting: "Väntar",
  };

  return swedishLabels[status];
}

/**
 * Stat card color mappings for consistent theming
 */
export const STAT_CARD_COLORS = {
  gray: {
    value: "text-gray-01",
    label: "text-gray-02",
  },
  green: {
    value: "text-green-03",
    label: "text-green-02",
  },
  blue: {
    value: "text-blue-03",
    label: "text-blue-02",
  },
  orange: {
    value: "text-orange-03",
    label: "text-orange-02",
  },
  pink: {
    value: "text-pink-03",
    label: "text-pink-02",
  },
} as const;

/**
 * Get stat card value color
 */
export function getStatCardValueColor(
  color: keyof typeof STAT_CARD_COLORS
): string {
  return STAT_CARD_COLORS[color].value;
}

/**
 * Get stat card label color
 */
export function getStatCardLabelColor(
  color: keyof typeof STAT_CARD_COLORS
): string {
  return STAT_CARD_COLORS[color].label;
}

/**
 * Get step icon for pipeline step status
 */
export function getStepIcon(
  status: "completed" | "processing" | "failed" | "waiting" | "needs_approval"
) {
  const config = getStatusConfig(status);
  const IconComponent = config.icon;

  return (
    <IconComponent
      className={`w-5 h-5 ${config.colors.icon} ${
        "animation" in config ? config.animation : ""
      }`.trim()}
    />
  );
}

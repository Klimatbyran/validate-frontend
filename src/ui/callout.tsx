/**
 * Reusable callout / info box with semantic variants (info, success, warning, error).
 * Use for instructions, success messages, warnings, and errors across tabs.
 */

import React from "react";
import { cn } from "@/lib/utils";

export type CalloutVariant = "info" | "success" | "warning" | "error";

const VARIANT_CLASSES: Record<
  CalloutVariant,
  { wrapper: string; title: string; iconBg: string }
> = {
  info: {
    wrapper: "bg-blue-03/10 rounded-lg p-4 border border-blue-03/20",
    title: "text-lg font-medium text-blue-03",
    iconBg: "bg-blue-03/20",
  },
  success: {
    wrapper: "bg-green-03/10 rounded-lg p-4 border border-green-03/20",
    title: "text-lg font-medium text-green-03",
    iconBg: "bg-green-03/20",
  },
  warning: {
    wrapper: "bg-orange-03/10 rounded-lg p-4 border border-orange-03/20",
    title: "text-lg font-medium text-orange-03",
    iconBg: "bg-orange-03/20",
  },
  error: {
    wrapper: "bg-pink-03/10 rounded-lg p-4 border border-pink-03/20",
    title: "text-lg font-medium text-pink-03",
    iconBg: "bg-pink-03/20",
  },
};

const DESCRIPTION_CLASS: Record<CalloutVariant, string> = {
  info: "text-sm text-blue-03/80",
  success: "text-sm text-green-03/80",
  warning: "text-sm text-orange-03/80",
  error: "text-sm text-pink-03/80",
};

export interface CalloutProps {
  variant: CalloutVariant;
  /** Optional heading */
  title?: React.ReactNode;
  /** Optional short description below title (muted variant color) */
  description?: React.ReactNode;
  /** Optional icon shown in a circle next to the title */
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function Callout({
  variant,
  title,
  description,
  icon,
  children,
  className,
}: CalloutProps) {
  const classes = VARIANT_CLASSES[variant];
  const hasHeader = title != null || icon != null;

  return (
    <div className={cn(classes.wrapper, className)}>
      {hasHeader && (
        <div className={cn("flex items-center space-x-3", description || children ? "mb-4" : "")}>
          {icon != null && (
            <span
              className={cn(
                "flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full [&>svg]:w-5 [&>svg]:h-5",
                classes.iconBg,
                variant === "info" && "[&>svg]:text-blue-03",
                variant === "success" && "[&>svg]:text-green-03",
                variant === "warning" && "[&>svg]:text-orange-03",
                variant === "error" && "[&>svg]:text-pink-03"
              )}
            >
              {icon}
            </span>
          )}
          <div className="flex-1 min-w-0">
            {title != null && <div className={classes.title}>{title}</div>}
            {description != null && (
              <p className={cn("mt-1", DESCRIPTION_CLASS[variant])}>{description}</p>
            )}
          </div>
        </div>
      )}
      {!hasHeader && description != null && (
        <p className={cn("mb-4", DESCRIPTION_CLASS[variant])}>{description}</p>
      )}
      {children}
    </div>
  );
}

import React from "react";
import { cn } from "@/lib/utils";

export function SectionCard({
  children,
  className,
  overflowHidden = false,
}: {
  children: React.ReactNode;
  className?: string;
  overflowHidden?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-gray-04/80 backdrop-blur-sm rounded-lg",
        overflowHidden && "overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionCardHeader({
  title,
  subtitle,
  right,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-6 py-4 border-b border-gray-03/50", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-gray-01">{title}</div>
          {subtitle ? (
            <div className="text-xs text-gray-02 mt-1">{subtitle}</div>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </div>
  );
}

export function SectionCardBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("p-6", className)}>{children}</div>;
}

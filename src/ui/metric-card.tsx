import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: number | string;
};

export function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-gray-03 bg-gray-05/70 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-gray-02">{label}</p>
      <p className="text-lg font-semibold text-gray-01">{value}</p>
    </div>
  );
}

type MetricCardGridProps = {
  children: ReactNode;
  className?: string;
};

export function MetricCardGrid({ children, className }: MetricCardGridProps) {
  return (
    <div className={cn("grid gap-3", className)}>{children}</div>
  );
}

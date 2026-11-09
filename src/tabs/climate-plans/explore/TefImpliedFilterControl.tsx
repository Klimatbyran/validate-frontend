import { cn } from "@/lib/utils";
import {
  TEF_IMPLIED_FILTER_OPTIONS,
  type TefImpliedFilter,
} from "../lib/tef-detail-summary";

export function TefImpliedFilterControl({
  value,
  onChange,
  counts,
  size = "md",
  labels = "short",
  className,
}: {
  value: TefImpliedFilter;
  onChange: (value: TefImpliedFilter) => void;
  /** Optional per-option counts shown next to the label. */
  counts?: Partial<Record<TefImpliedFilter, number>>;
  size?: "sm" | "md";
  labels?: "short" | "full";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex rounded-md overflow-hidden border border-gray-03/40",
        size === "sm" ? "text-xs" : "text-sm",
        className,
      )}
      role="group"
      aria-label="Filter by explicit vs implied TEF match"
      title="Explicit = measure text names the TEF; implied = inferred only. Unlabeled older extracts stay visible unless you choose Only implied."
    >
      {TEF_IMPLIED_FILTER_OPTIONS.map(
        ({ value: option, label, shortLabel }) => {
          const count = counts?.[option];
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={cn(
                "transition-colors",
                size === "sm" ? "px-2.5 py-1" : "px-3 py-2",
                value === option
                  ? "bg-gray-03/50 text-gray-01 font-medium"
                  : "text-gray-02 hover:text-gray-01",
              )}
              aria-pressed={value === option}
            >
              {labels === "full" ? label : shortLabel}
              {typeof count === "number" ? (
                <span className="ml-1 tabular-nums opacity-80">{count}</span>
              ) : null}
            </button>
          );
        },
      )}
    </div>
  );
}

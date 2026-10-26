import { cn } from "@/lib/utils";
import type { QaStatusFilter, StepViewMode } from "../lib/stepReviewQueue";

const QA_FILTERS: Array<{ id: QaStatusFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "with-comment", label: "With comment" },
  { id: "verified", label: "Verified" },
  { id: "not-reviewed", label: "Not reviewed" },
];

interface QaReviewToolbarProps {
  viewMode: StepViewMode;
  onViewModeChange: (mode: StepViewMode) => void;
  qaFilter: QaStatusFilter;
  onQaFilterChange: (filter: QaStatusFilter) => void;
  counts: Record<QaStatusFilter, number>;
}

export function QaReviewToolbar({
  viewMode,
  onViewModeChange,
  qaFilter,
  onQaFilterChange,
  counts,
}: QaReviewToolbarProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onViewModeChange("list")}
          className={cn(
            "rounded-md border px-2.5 py-1 text-xs font-medium",
            viewMode === "list"
              ? "border-gray-01/40 bg-gray-01/10 text-gray-01"
              : "border-gray-03 bg-gray-03/20 text-gray-02 hover:bg-gray-03/40",
          )}
        >
          List
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange("review")}
          className={cn(
            "rounded-md border px-2.5 py-1 text-xs font-medium",
            viewMode === "review"
              ? "border-blue-03/50 bg-blue-03/15 text-blue-03"
              : "border-gray-03 bg-gray-03/20 text-gray-02 hover:bg-gray-03/40",
          )}
        >
          Review mode
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {QA_FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onQaFilterChange(id)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-medium",
              qaFilter === id
                ? "border-gray-01/40 bg-gray-01/10 text-gray-01"
                : "border-gray-03 bg-gray-03/20 text-gray-02 hover:bg-gray-03/40",
            )}
          >
            {label} ({counts[id]})
          </button>
        ))}
      </div>
    </div>
  );
}

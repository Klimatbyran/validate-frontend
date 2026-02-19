/**
 * Rerun-by-worker section for the filter bar (Scope 1, Scope 2, etc. with limit selector).
 */

import { useState } from "react";
import { Activity } from "lucide-react";
import { Button } from "@/ui/button";
import { RERUN_WORKERS, LIMIT_OPTIONS, type RerunWorker } from "../lib/filter-config";

interface FilterBarRerunSectionProps {
  onRerunByWorker: (worker: RerunWorker, limit: number | "all") => void;
}

export function FilterBarRerunSection({ onRerunByWorker }: FilterBarRerunSectionProps) {
  const [rerunLimit, setRerunLimit] = useState<number | "all">(5);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-4 border-t border-gray-03/50">
      <div className="flex items-center gap-2 shrink-0">
        <Activity className="w-4 h-4 text-gray-02" />
        <span className="text-sm font-medium text-gray-01">Kör specifika jobb:</span>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {RERUN_WORKERS.map((worker) => (
          <Button
            key={worker.id}
            variant="ghost"
            size="sm"
            onClick={() => onRerunByWorker(worker.id, rerunLimit)}
            className="!w-auto !min-w-0 h-9 px-4 text-sm border border-gray-03 text-gray-01 hover:bg-gray-03/40"
          >
            {worker.label}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-gray-02">Antal:</span>
        <select
          value={String(rerunLimit)}
          onChange={(e) => {
            const val = e.target.value;
            setRerunLimit(val === "all" ? "all" : Number(val));
          }}
          className="px-2 py-1 rounded-md border border-gray-03 bg-gray-05 text-gray-01 text-sm focus:outline-none focus:ring-2 focus:ring-blue-03/50 focus:border-blue-03"
        >
          {LIMIT_OPTIONS.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/**
 * Rerun-by-worker section for the filter bar (Scope 1, Scope 2, etc. with limit selector).
 */

import { useState } from "react";
import { Activity } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { SingleSelectDropdown } from "@/ui/single-select-dropdown";
import { RERUN_WORKERS, LIMIT_OPTIONS, type RerunWorker } from "../lib/filter-config";

interface FilterBarRerunSectionProps {
  onRerunByWorker: (worker: RerunWorker, limit: number | "all") => void;
}

export function FilterBarRerunSection({ onRerunByWorker }: FilterBarRerunSectionProps) {
  const { t } = useI18n();
  const [rerunLimit, setRerunLimit] = useState<number | "all">(5);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-4 border-t border-gray-03/50">
      <div className="flex items-center gap-2 shrink-0">
        <Activity className="w-4 h-4 text-gray-02" />
        <span className="text-sm font-medium text-gray-01">{t("jobstatus.runSpecificJobs")}:</span>
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
            {t(`jobstatus.rerunWorkers.${worker.id}`)}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-gray-02">{t("jobstatus.count")}:</span>
        <SingleSelectDropdown
          options={LIMIT_OPTIONS.map((opt) => String(opt.value))}
          value={String(rerunLimit)}
          onChange={(val) =>
            setRerunLimit(val === "all" ? "all" : Number(val))
          }
          placeholder={t("jobstatus.count")}
          ariaLabel={t("jobstatus.count")}
          getOptionLabel={(v) =>
            v === "all" ? t("jobstatus.limitAll") : v
          }
          panelMinWidth={120}
        />
      </div>
    </div>
  );
}

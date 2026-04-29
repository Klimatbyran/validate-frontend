/**
 * Batch filter for Job status: multi-select of Garbo `Batch.id` (labels show `batchName`).
 */

import type { GarboBatchOption } from "@/lib/garbo-batch-types";
import { MultiSelectDropdown } from "@/ui/multi-select-dropdown";
import { useI18n } from "@/contexts/I18nContext";

export interface BatchFilterDropdownProps {
  existingBatches: GarboBatchOption[];
  batchesLoading: boolean;
  selectedBatchIds: string[];
  onBatchFilterChange: (ids: string[]) => void;
}

export function BatchFilterDropdown({
  existingBatches,
  batchesLoading,
  selectedBatchIds,
  onBatchFilterChange,
}: BatchFilterDropdownProps) {
  const { t } = useI18n();

  return (
    <MultiSelectDropdown
      options={existingBatches.map((b) => b.id)}
      selectedIds={selectedBatchIds}
      onChange={onBatchFilterChange}
      triggerLabel={t("jobstatus.batch")}
      ariaLabel={t("jobstatus.batch")}
      loading={batchesLoading}
      loadingLabel={t("jobstatus.batchLoading")}
      emptyLabel={t("jobstatus.batchEmpty")}
      getOptionLabel={(id) =>
        existingBatches.find((b) => b.id === id)?.batchName ?? id
      }
    />
  );
}

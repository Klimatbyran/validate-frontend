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
  /** Defaults to {@link useI18n} `jobstatus.batch`. */
  triggerLabel?: string;
  ariaLabel?: string;
  loadingLabel?: string;
  emptyLabel?: string;
}

export function BatchFilterDropdown({
  existingBatches,
  batchesLoading,
  selectedBatchIds,
  onBatchFilterChange,
  triggerLabel,
  ariaLabel,
  loadingLabel,
  emptyLabel,
}: BatchFilterDropdownProps) {
  const { t } = useI18n();
  const resolvedTrigger = triggerLabel ?? t("jobstatus.batch");

  return (
    <MultiSelectDropdown
      options={existingBatches.map((b) => b.id)}
      selectedIds={selectedBatchIds}
      onChange={onBatchFilterChange}
      triggerLabel={resolvedTrigger}
      ariaLabel={ariaLabel ?? resolvedTrigger}
      loading={batchesLoading}
      loadingLabel={loadingLabel ?? t("jobstatus.batchLoading")}
      emptyLabel={emptyLabel ?? t("jobstatus.batchEmpty")}
      getOptionLabel={(id) =>
        existingBatches.find((b) => b.id === id)?.batchName ?? id
      }
    />
  );
}

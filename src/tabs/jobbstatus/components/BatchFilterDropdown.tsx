/**
 * Batch filter for Job status: multi-select of batch IDs using the shared UI component.
 */

import { MultiSelectDropdown } from "@/ui/multi-select-dropdown";
import { useI18n } from "@/contexts/I18nContext";

export interface BatchFilterDropdownProps {
  existingBatches: string[];
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
      options={existingBatches}
      selectedIds={selectedBatchIds}
      onChange={onBatchFilterChange}
      triggerLabel={t("jobstatus.batch")}
      ariaLabel={t("jobstatus.batch")}
      loading={batchesLoading}
      loadingLabel={t("jobstatus.batchLoading")}
      emptyLabel={t("jobstatus.batchEmpty")}
    />
  );
}

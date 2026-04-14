import { useI18n } from "@/contexts/I18nContext";
import { SingleSelectDropdown } from "@/ui/single-select-dropdown";
import { NEW_BATCH_DROPDOWN_VALUE } from "../lib/utils";

export interface UploadBatchOptionsProps {
  existingBatches: string[];
  batchesLoading?: boolean;
  batchDropdownChoice: string;
  onBatchDropdownChoiceChange: (value: string) => void;
  customBatchName: string;
  onCustomBatchNameChange: (value: string) => void;
  usePortal?: boolean;
}

export function UploadBatchOptions({
  existingBatches,
  batchesLoading = false,
  batchDropdownChoice,
  onBatchDropdownChoiceChange,
  customBatchName,
  onCustomBatchNameChange,
  usePortal = true,
}: UploadBatchOptionsProps) {
  const { t } = useI18n();

  return (
    <>
      <span className="text-sm text-gray-02 shrink-0">{t("upload.batch")}:</span>
      <SingleSelectDropdown
        options={["", ...existingBatches, NEW_BATCH_DROPDOWN_VALUE]}
        value={batchDropdownChoice}
        onChange={onBatchDropdownChoiceChange}
        placeholder={t("upload.noBatch")}
        ariaLabel={t("upload.batchAria")}
        loading={batchesLoading}
        loadingLabel={t("upload.batchLoading")}
        emptyLabel={t("upload.noBatch")}
        getOptionLabel={(v) =>
          v === ""
            ? t("upload.noBatch")
            : v === NEW_BATCH_DROPDOWN_VALUE
              ? t("upload.newBatch")
              : v
        }
        panelMinWidth={200}
        usePortal={usePortal}
      />
      {batchDropdownChoice === NEW_BATCH_DROPDOWN_VALUE && (
        <input
          type="text"
          value={customBatchName}
          onChange={(e) => onCustomBatchNameChange(e.target.value)}
          placeholder={t("upload.customBatchPlaceholder")}
          className="h-8 min-w-[180px] rounded-md border border-gray-03 bg-gray-03/20 text-gray-01 text-sm placeholder:text-gray-02 focus:outline-none focus:ring-2 focus:ring-orange-03/50 px-2"
          aria-label={t("upload.customBatchAria")}
        />
      )}
    </>
  );
}


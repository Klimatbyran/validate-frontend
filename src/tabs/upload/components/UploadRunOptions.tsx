import { useI18n } from "@/contexts/I18nContext";
import {
  UploadBatchOptions,
  type UploadBatchOptionsProps,
} from "./UploadBatchOptions";
import {
  UploadTagsOptions,
  type UploadTagsOptionsProps,
} from "./UploadTagsOptions";
import {
  UploadWorkerRunOptions,
  type UploadWorkerRunOptionsProps,
} from "./UploadWorkerRunOptions";

interface UploadRunOptionsProps {
  batch: UploadBatchOptionsProps;
  tags: UploadTagsOptionsProps;
  workers: UploadWorkerRunOptionsProps;
  dropdownUsePortal?: boolean;
}

export function UploadRunOptions({
  batch,
  tags,
  workers,
  dropdownUsePortal = true,
}: UploadRunOptionsProps) {
  const { t } = useI18n();

  return (
    <div className="bg-gray-04/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
      <p className="text-sm font-medium text-gray-01">
        {t("upload.runOptionsTitle")}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <UploadBatchOptions {...batch} usePortal={dropdownUsePortal} />
        <UploadTagsOptions {...tags} usePortal={dropdownUsePortal} />
      </div>

      <UploadWorkerRunOptions {...workers} />
    </div>
  );
}

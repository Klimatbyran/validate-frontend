import { useI18n } from "@/contexts/I18nContext";
import type { PipelineMode } from "@/lib/pipeline-mode";
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
  /** When climate-plans, hide emissions worker options and show a pipeline note. */
  pipelineMode?: PipelineMode;
}

export function UploadRunOptions({
  batch,
  tags,
  workers,
  dropdownUsePortal = true,
  pipelineMode = "emissions",
}: UploadRunOptionsProps) {
  const { t } = useI18n();
  const isClimatePlansPipeline = pipelineMode === "climate-plans";

  return (
    <div className="bg-gray-04/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
      <p className="text-sm font-medium text-gray-01">
        {t("upload.runOptionsTitle")}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <UploadBatchOptions {...batch} usePortal={dropdownUsePortal} />
        {!isClimatePlansPipeline && (
          <UploadTagsOptions {...tags} usePortal={dropdownUsePortal} />
        )}
      </div>

      {isClimatePlansPipeline ? (
        <div className="space-y-1 pt-2 border-t border-gray-03/50">
          <p className="text-sm text-gray-01">
            {t("upload.climatePlansPipelineActive")}
          </p>
          <p className="text-xs text-gray-02">
            {t("upload.climatePlansPipelineActiveDescription")}
          </p>
        </div>
      ) : (
        <UploadWorkerRunOptions {...workers} />
      )}
    </div>
  );
}

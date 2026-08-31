import { Factory, Leaf } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import type { PipelineMode } from "@/lib/pipeline-mode";
import { cn } from "@/lib/utils";
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
  const pipelineLabel = isClimatePlansPipeline
    ? t("nav.pipelineClimatePlans")
    : t("nav.pipelineEmissions");

  return (
    <div className="bg-gray-04/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
      <div
        role="status"
        className={cn(
          "flex items-start gap-3 rounded-lg border p-3",
          isClimatePlansPipeline
            ? "border-green-03/30 bg-green-03/10"
            : "border-blue-03/30 bg-blue-03/10",
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            isClimatePlansPipeline ? "bg-green-03/20" : "bg-blue-03/20",
          )}
        >
          {isClimatePlansPipeline ? (
            <Leaf className="h-4 w-4 text-green-03" aria-hidden />
          ) : (
            <Factory className="h-4 w-4 text-blue-03" aria-hidden />
          )}
        </span>
        <div className="min-w-0 space-y-0.5">
          <p
            className={cn(
              "text-sm font-semibold",
              isClimatePlansPipeline ? "text-green-03" : "text-blue-03",
            )}
          >
            {t("upload.uploadingToTitle", { pipeline: pipelineLabel })}
          </p>
          <p
            className={cn(
              "text-xs",
              isClimatePlansPipeline ? "text-green-03/80" : "text-blue-03/80",
            )}
          >
            {isClimatePlansPipeline
              ? t("upload.climatePlansPipelineActiveDescription")
              : t("upload.emissionsPipelineDescription")}
          </p>
        </div>
      </div>

      <p className="text-sm font-medium text-gray-01">
        {t("upload.runOptionsTitle")}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <UploadBatchOptions {...batch} usePortal={dropdownUsePortal} />
        {!isClimatePlansPipeline && (
          <UploadTagsOptions {...tags} usePortal={dropdownUsePortal} />
        )}
      </div>

      {!isClimatePlansPipeline && <UploadWorkerRunOptions {...workers} />}
    </div>
  );
}

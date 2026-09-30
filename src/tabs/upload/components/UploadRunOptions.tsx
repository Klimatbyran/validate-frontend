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
  /** Climate-plans only — re-run the vision model on every picture instead
   * of reusing docling_test's cached description for that exact image. */
  forceRedescribeImages?: boolean;
  onForceRedescribeImagesChange?: (value: boolean) => void;
}

export function UploadRunOptions({
  batch,
  tags,
  workers,
  dropdownUsePortal = true,
  pipelineMode = "emissions",
  forceRedescribeImages = false,
  onForceRedescribeImagesChange,
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

      {isClimatePlansPipeline && onForceRedescribeImagesChange && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label
              htmlFor="force-redescribe-images"
              className="text-sm text-gray-01 cursor-pointer"
            >
              {t("upload.forceRedescribeImages")}
            </label>
            <button
              id="force-redescribe-images"
              type="button"
              role="switch"
              aria-checked={forceRedescribeImages}
              onClick={() =>
                onForceRedescribeImagesChange(!forceRedescribeImages)
              }
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full",
                "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                forceRedescribeImages ? "bg-orange-03" : "bg-gray-03",
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  forceRedescribeImages ? "translate-x-6" : "translate-x-1",
                )}
              />
            </button>
          </div>
          <p className="text-xs text-gray-02">
            {t("upload.forceRedescribeImagesDescription")}
          </p>
        </div>
      )}
    </div>
  );
}

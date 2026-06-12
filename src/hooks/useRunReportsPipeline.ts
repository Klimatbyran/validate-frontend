import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { useBatches } from "@/hooks/useBatches";
import { DEFAULT_RUN_ONLY, type RunOnlyWorkerId } from "@/lib/run-only-workers";
import { NEW_BATCH_DROPDOWN_VALUE } from "@/lib/garbo-batch-types";
import { resolvePipelineBatchId } from "@/lib/resolve-pipeline-batch-id";
import { useTagOptions } from "@/tabs/upload/hooks/useTagOptions";
import {
  UploadApiError,
  createJobsFromUrls,
} from "@/tabs/upload/lib/upload-api";
import type { UploadBatchOptionsProps } from "@/tabs/upload/components/UploadBatchOptions";
import type { UploadTagsOptionsProps } from "@/tabs/upload/components/UploadTagsOptions";
import type { UploadWorkerRunOptionsProps } from "@/tabs/upload/components/UploadWorkerRunOptions";

export type RunReportsPipelineRunOptions = {
  batch: UploadBatchOptionsProps;
  tags: UploadTagsOptionsProps;
  workers: UploadWorkerRunOptionsProps;
};

export type RunReportsPipelineToastKeys = {
  partial: string;
  success: string;
  error: string;
};

export type RunReportsPipelineConfig = {
  batchesApiUrl?: string;
  batchesListUrl?: string;
  parsePdfEndpoint?: string;
  toastKeys?: Partial<RunReportsPipelineToastKeys>;
};

const DEFAULT_TOAST_KEYS: RunReportsPipelineToastKeys = {
  partial: "registry.runReportsPartial",
  success: "registry.runReportsSuccess",
  error: "registry.runReportsError",
};

/**
 * Shared pipeline run state + `createJobsFromUrls` flow for Registry, Crawler,
 * and Overview “run reports” modals. Pass {@link RunReportsPipelineConfig} for
 * fixed stage endpoints (Prod → Stage tab).
 */
export function useRunReportsPipeline(config?: RunReportsPipelineConfig) {
  const { t } = useI18n();
  const toastKeys = { ...DEFAULT_TOAST_KEYS, ...config?.toastKeys };
  const [isRunningReports, setIsRunningReports] = useState(false);
  const [autoApprove, setAutoApprove] = useState(true);
  const [runAllWorkers, setRunAllWorkers] = useState(false);
  const [selectedWorkers, setSelectedWorkers] =
    useState<RunOnlyWorkerId[]>(DEFAULT_RUN_ONLY);
  const [forceReindex, setForceReindex] = useState(false);
  const [batchDropdownChoice, setBatchDropdownChoice] = useState("");
  const [customBatchName, setCustomBatchName] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const {
    batches: existingBatches,
    isLoading: batchesLoading,
    refetch: refetchBatches,
  } = useBatches(config?.batchesListUrl);
  const {
    tagOptions,
    loading: tagsLoading,
    error: tagsError,
  } = useTagOptions();

  const runOnly =
    !runAllWorkers && selectedWorkers.length > 0 ? selectedWorkers : undefined;
  const tags = selectedTags.length > 0 ? selectedTags : undefined;

  const handleWorkerToggle = useCallback(
    (workerId: RunOnlyWorkerId, checked: boolean) => {
      setSelectedWorkers((current) =>
        checked
          ? [...current, workerId]
          : current.filter((id) => id !== workerId),
      );
    },
    [],
  );

  const runForUrls = useCallback(
    async (
      urls: string[],
      options?: { onSuccess?: () => void },
    ): Promise<void> => {
      if (!urls.length) {
        toast.error(t("registry.noReportUrls"));
        return;
      }

      if (!runAllWorkers && selectedWorkers.length === 0) {
        toast.error(t("upload.selectAtLeastOneWorker"));
        return;
      }

      if (
        batchDropdownChoice === NEW_BATCH_DROPDOWN_VALUE &&
        !customBatchName.trim()
      ) {
        toast.error(t("upload.batchNameRequired"));
        return;
      }

      let pipelineBatchId: string | undefined;
      try {
        pipelineBatchId = await resolvePipelineBatchId({
          batchDropdownChoice,
          customBatchName,
          batchesApiUrl: config?.batchesApiUrl,
        });
      } catch (e) {
        toast.error(
          t("upload.couldNotAddJobs", {
            message: e instanceof Error ? e.message : t("upload.unknownError"),
          }),
        );
        return;
      }

      setIsRunningReports(true);
      try {
        const result = await createJobsFromUrls({
          urls,
          autoApprove,
          forceReindex,
          batchId: pipelineBatchId,
          runOnly,
          tags,
          parsePdfEndpoint: config?.parsePdfEndpoint,
        });

        const envelope =
          !Array.isArray(result) && result && typeof result === "object"
            ? result
            : null;
        const cacheErrors =
          envelope && Array.isArray(envelope.errors) ? envelope.errors : [];

        if (cacheErrors.length > 0) {
          toast.warning(
            t(toastKeys.partial, {
              failed: cacheErrors.length,
              total: urls.length,
              succeeded: urls.length - cacheErrors.length,
            }),
          );
        } else {
          toast.success(t(toastKeys.success, { count: urls.length }));
        }

        if (batchDropdownChoice === NEW_BATCH_DROPDOWN_VALUE) {
          refetchBatches();
        }

        options?.onSuccess?.();
      } catch (error) {
        console.error("Failed to run selected reports", error);
        const errorMessage =
          error instanceof UploadApiError || error instanceof Error
            ? error.message
            : t("upload.unknownError");
        toast.error(t(toastKeys.error, { message: errorMessage }));
      } finally {
        setIsRunningReports(false);
      }
    },
    [
      t,
      toastKeys,
      runAllWorkers,
      selectedWorkers,
      batchDropdownChoice,
      customBatchName,
      autoApprove,
      forceReindex,
      runOnly,
      tags,
      config?.batchesApiUrl,
      config?.parsePdfEndpoint,
      refetchBatches,
    ],
  );

  const runOptions: RunReportsPipelineRunOptions = useMemo(
    () => ({
      batch: {
        existingBatches,
        batchesLoading,
        batchDropdownChoice,
        onBatchDropdownChoiceChange: setBatchDropdownChoice,
        customBatchName,
        onCustomBatchNameChange: setCustomBatchName,
      },
      tags: {
        tagOptions,
        tagsLoading,
        tagsError,
        selectedTags,
        onSelectedTagsChange: setSelectedTags,
      },
      workers: {
        runAllWorkers,
        onRunAllWorkersChange: setRunAllWorkers,
        selectedWorkers,
        onSelectedWorkersChange: handleWorkerToggle,
        forceReindex,
        onForceReindexChange: setForceReindex,
      },
    }),
    [
      existingBatches,
      batchesLoading,
      batchDropdownChoice,
      customBatchName,
      tagOptions,
      tagsLoading,
      tagsError,
      selectedTags,
      runAllWorkers,
      selectedWorkers,
      handleWorkerToggle,
      forceReindex,
    ],
  );

  return {
    isRunningReports,
    autoApprove,
    setAutoApprove,
    runOptions,
    runForUrls,
    tagOptions,
    tagsLoading,
    tagsError,
  };
}

/**
 * Hook for job rerun actions used in JobSpecificDataView:
 * refresh, approve, override wikidata/company name, general rerun, and rerun-and-save.
 */

import { useCallback } from "react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/lib/api-helpers";
import { getPipelineUrl } from "@/config/api-env";
import { buildRerunRequestData } from "@/lib/job-rerun-utils";
import { useI18n } from "@/contexts/I18nContext";

interface UseJobRerunActionsArgs {
  job: { queueId?: string; id?: string } | undefined;
  effectiveJob: { queueId?: string; id?: string; [key: string]: any } | undefined;
  detailed: any;
  setDetailed: React.Dispatch<React.SetStateAction<any | null>>;
}

export function useJobRerunActions({
  job,
  effectiveJob,
  detailed,
  setDetailed,
}: UseJobRerunActionsArgs) {
  const { t } = useI18n();
  const refreshJobData = useCallback(async () => {
    if (!job?.queueId || !job?.id) return;
    try {
      const res = await fetch(
        getPipelineUrl(`/queues/${encodeURIComponent(job.queueId)}/${encodeURIComponent(job.id)}`)
      );
      if (res.ok) {
        const json = await res.json();
        setDetailed(json);
      }
    } catch (e) {
      console.error("Failed to refresh job data:", e);
    }
  }, [job?.queueId, job?.id, setDetailed]);

  const handleWikidataApprove = useCallback(async () => {
    if (!effectiveJob?.queueId || !effectiveJob?.id) {
      toast.error(t("jobstatus.jobdetails.toastCannotApprove"));
      return;
    }
    try {
      const response = await authenticatedFetch(
        getPipelineUrl(`/queues/${encodeURIComponent(effectiveJob.queueId)}/${encodeURIComponent(effectiveJob.id)}/rerun`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: { approval: { approved: true } } }),
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        toast.error(t("jobstatus.jobdetails.toastApproveError", { message: errorText || t("upload.unknownError") }));
        return;
      }
      toast.success(t("jobstatus.jobdetails.toastApproveSuccess"));
      await refreshJobData();
    } catch (error) {
      toast.error(t("jobstatus.jobdetails.toastApproveFailed", { message: error instanceof Error ? error.message : t("upload.unknownError") }));
    }
  }, [effectiveJob?.queueId, effectiveJob?.id, refreshJobData, t]);

  const handleWikidataOverride = useCallback(
    async (overrideWikidataId: string) => {
      if (!effectiveJob?.queueId || !effectiveJob?.id) {
        toast.error(t("jobstatus.jobdetails.toastCannotRerun"));
        return;
      }
      try {
        const response = await authenticatedFetch(
          getPipelineUrl(`/queues/${encodeURIComponent(effectiveJob.queueId)}/${encodeURIComponent(effectiveJob.id)}/rerun`),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: { overrideWikidataId } }),
          }
        );
        if (!response.ok) {
          const errorText = await response.text();
          toast.error(t("jobstatus.jobdetails.toastRerunError", { message: errorText || t("upload.unknownError") }));
          return;
        }
        toast.success(t("jobstatus.jobdetails.toastRerunWikidataSuccess"));
        await refreshJobData();
      } catch (error) {
        toast.error(t("jobstatus.jobdetails.toastRerunFailed", { message: error instanceof Error ? error.message : t("upload.unknownError") }));
      }
    },
    [effectiveJob?.queueId, effectiveJob?.id, refreshJobData, t]
  );

  const handleCompanyNameOverride = useCallback(
    async (overrideCompanyName: string) => {
      if (!effectiveJob?.queueId || !effectiveJob?.id) {
        toast.error(t("jobstatus.jobdetails.toastCannotRerun"));
        return;
      }
      try {
        const response = await authenticatedFetch(
          getPipelineUrl(`/queues/${encodeURIComponent(effectiveJob.queueId)}/${encodeURIComponent(effectiveJob.id)}/rerun`),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              data: { companyName: overrideCompanyName, waitingForCompanyName: true },
            }),
          }
        );
        if (!response.ok) {
          const errorText = await response.text();
          toast.error(t("jobstatus.jobdetails.toastRerunError", { message: errorText || t("upload.unknownError") }));
          return;
        }
        toast.success(t("jobstatus.jobdetails.toastRerunCompanySuccess"));
        await refreshJobData();
      } catch (error) {
        toast.error(t("jobstatus.jobdetails.toastRerunFailed", { message: error instanceof Error ? error.message : t("upload.unknownError") }));
      }
    },
    [effectiveJob?.queueId, effectiveJob?.id, refreshJobData, t]
  );

  const handleRerun = useCallback(async () => {
    if (!effectiveJob?.queueId || !effectiveJob?.id) {
      toast.error(t("jobstatus.jobdetails.toastCannotRerun"));
      return;
    }
    const requestData = buildRerunRequestData(
      effectiveJob.queueId,
      job,
      effectiveJob,
      detailed
    );
    try {
      const response = await authenticatedFetch(
        getPipelineUrl(`/queues/${encodeURIComponent(effectiveJob.queueId)}/${encodeURIComponent(effectiveJob.id)}/rerun`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestData),
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        toast.error(t("jobstatus.jobdetails.toastRerunError", { message: errorText || t("upload.unknownError") }));
        return;
      }
      toast.success(t("jobstatus.jobdetails.toastRerunSuccess"));
      await refreshJobData();
    } catch (error) {
      toast.error(t("jobstatus.jobdetails.toastRerunFailed", { message: error instanceof Error ? error.message : t("upload.unknownError") }));
    }
  }, [effectiveJob, job, detailed, refreshJobData, t]);

  const handleRerunAndSave = useCallback(
    async (queueName: string, scopes: string[], label: string) => {
      if (!effectiveJob?.id) {
        toast.error(t("jobstatus.jobdetails.toastCannotRerun"));
        return;
      }
      try {
        const response = await authenticatedFetch(
          getPipelineUrl(`/queues/${queueName}/${encodeURIComponent(effectiveJob.id)}/rerun-and-save`),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scopes }),
          }
        );
        if (!response.ok) {
          const errorText = await response.text();
          toast.error(t("jobstatus.jobdetails.toastRerunAndSaveError", { label, message: errorText || t("upload.unknownError") }));
          return;
        }
        toast.success(t("jobstatus.jobdetails.toastRerunAndSaveSuccess", { label }));
        await refreshJobData();
      } catch (error) {
        toast.error(t("jobstatus.jobdetails.toastRerunFailed", { message: error instanceof Error ? error.message : t("upload.unknownError") }));
      }
    },
    [effectiveJob?.id, refreshJobData, t]
  );

  return {
    refreshJobData,
    handleWikidataApprove,
    handleWikidataOverride,
    handleCompanyNameOverride,
    handleRerun,
    handleRerunAndSave,
  };
}

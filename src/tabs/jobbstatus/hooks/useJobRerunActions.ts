/**
 * Hook for job rerun actions used in JobSpecificDataView:
 * refresh, approve, override wikidata/company name, general rerun, and rerun-and-save.
 */

import { useCallback } from "react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/lib/api-helpers";
import { buildRerunRequestData } from "@/lib/job-rerun-utils";

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
  const refreshJobData = useCallback(async () => {
    if (!job?.queueId || !job?.id) return;
    try {
      const res = await fetch(
        `/api/queues/${encodeURIComponent(job.queueId)}/${encodeURIComponent(job.id)}`
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
      toast.error("Kunde inte godkänna: saknar jobbinformation");
      return;
    }
    try {
      const response = await authenticatedFetch(
        `/api/queues/${encodeURIComponent(effectiveJob.queueId)}/${encodeURIComponent(effectiveJob.id)}/rerun`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: { approval: { approved: true } } }),
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        toast.error(`Kunde inte godkänna jobbet: ${errorText || "Okänt fel"}`);
        return;
      }
      toast.success("Jobbet godkänt och körs om");
      await refreshJobData();
    } catch (error) {
      toast.error(`Ett fel uppstod vid godkännande: ${error instanceof Error ? error.message : "Okänt fel"}`);
    }
  }, [effectiveJob?.queueId, effectiveJob?.id, refreshJobData]);

  const handleWikidataOverride = useCallback(
    async (overrideWikidataId: string) => {
      if (!effectiveJob?.queueId || !effectiveJob?.id) {
        toast.error("Kunde inte köra om jobbet: saknar jobbinformation");
        return;
      }
      try {
        const response = await authenticatedFetch(
          `/api/queues/${encodeURIComponent(effectiveJob.queueId)}/${encodeURIComponent(effectiveJob.id)}/rerun`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: { overrideWikidataId } }),
          }
        );
        if (!response.ok) {
          const errorText = await response.text();
          toast.error(`Kunde inte köra om jobbet: ${errorText || "Okänt fel"}`);
          return;
        }
        toast.success("Jobbet körs om med det nya Wikidata ID:t");
        await refreshJobData();
      } catch (error) {
        toast.error(`Ett fel uppstod vid omkörning: ${error instanceof Error ? error.message : "Okänt fel"}`);
      }
    },
    [effectiveJob?.queueId, effectiveJob?.id, refreshJobData]
  );

  const handleCompanyNameOverride = useCallback(
    async (overrideCompanyName: string) => {
      if (!effectiveJob?.queueId || !effectiveJob?.id) {
        toast.error("Kunde inte köra om jobbet: saknar jobbinformation");
        return;
      }
      try {
        const response = await authenticatedFetch(
          `/api/queues/${encodeURIComponent(effectiveJob.queueId)}/${encodeURIComponent(effectiveJob.id)}/rerun`,
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
          toast.error(`Kunde inte köra om jobbet: ${errorText || "Okänt fel"}`);
          return;
        }
        toast.success("Jobbet körs om med det nya företagsnamnet");
        await refreshJobData();
      } catch (error) {
        toast.error(`Ett fel uppstod vid omkörning: ${error instanceof Error ? error.message : "Okänt fel"}`);
      }
    },
    [effectiveJob?.queueId, effectiveJob?.id, refreshJobData]
  );

  const handleRerun = useCallback(async () => {
    if (!effectiveJob?.queueId || !effectiveJob?.id) {
      toast.error("Kunde inte köra om jobbet: saknar jobbinformation");
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
        `/api/queues/${encodeURIComponent(effectiveJob.queueId)}/${encodeURIComponent(effectiveJob.id)}/rerun`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestData),
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        toast.error(`Kunde inte köra om jobbet: ${errorText || "Okänt fel"}`);
        return;
      }
      toast.success("Jobbet körs om");
      await refreshJobData();
    } catch (error) {
      toast.error(`Ett fel uppstod vid omkörning: ${error instanceof Error ? error.message : "Okänt fel"}`);
    }
  }, [effectiveJob, job, detailed, refreshJobData]);

  const handleRerunAndSave = useCallback(
    async (queueName: string, scopes: string[], label: string) => {
      if (!effectiveJob?.id) {
        toast.error("Kunde inte köra om jobbet: saknar jobbinformation");
        return;
      }
      try {
        const response = await authenticatedFetch(
          `/api/queues/${queueName}/${encodeURIComponent(effectiveJob.id)}/rerun-and-save`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scopes }),
          }
        );
        if (!response.ok) {
          const errorText = await response.text();
          toast.error(`Kunde inte köra om och spara ${label}: ${errorText || "Okänt fel"}`);
          return;
        }
        toast.success(`${label} körs om och sparas`);
        await refreshJobData();
      } catch (error) {
        toast.error(`Ett fel uppstod vid omkörning: ${error instanceof Error ? error.message : "Okänt fel"}`);
      }
    },
    [effectiveJob?.id, refreshJobData]
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

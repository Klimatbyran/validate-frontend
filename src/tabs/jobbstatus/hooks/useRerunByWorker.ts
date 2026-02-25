/**
 * Hook for bulk rerun-by-worker in Jobbstatus tab.
 * Collects extractEmissions job targets from swimlane companies and calls rerun-and-save per company.
 * Workers match the runOnly keys (industryGics, scope1, scope2, scope3, biogenic, economy, goals, initiatives, baseYear, lei, descriptions).
 */

import { useCallback } from "react";
import type { SwimlaneCompany } from "@/lib/types";
import { authenticatedFetch } from "@/lib/api-helpers";
import { findJobByQueueId } from "@/lib/workflow-utils";
import { buildRerunAndSaveBody } from "@/lib/job-rerun-utils";
import { toast } from "sonner";
import type { RerunWorker } from "../lib/filter-config";
import { RUN_ONLY_TO_SCOPE_KEY } from "@/lib/run-only-workers";
import { useI18n } from "@/contexts/I18nContext";

export function useRerunByWorker(swimlaneCompanies: SwimlaneCompany[]) {
  const { t } = useI18n();
  const handleRerunByWorker = useCallback(
    async (workerName: RerunWorker, limit: number | "all" = 5) => {
      const workerLabel = t(`jobstatus.rerunWorkers.${workerName}`);
      const followUpKey = RUN_ONLY_TO_SCOPE_KEY[workerName];
      if (!followUpKey) return;

      const targets: Array<{
        companyName: string;
        extractEmissionsJobId: string;
        wikidataNode: string | undefined;
      }> = [];

      for (const company of swimlaneCompanies) {
        if (limit !== "all" && targets.length >= limit) break;
        const latestYear = company.years?.[0];
        if (!latestYear) continue;
        const extractEmissionsJob = findJobByQueueId("extractEmissions", latestYear);
        if (!extractEmissionsJob?.id) continue;
        targets.push({
          companyName: company.name,
          extractEmissionsJobId: extractEmissionsJob.id,
          wikidataNode: company.wikidataId,
        });
      }

      if (targets.length === 0) {
        toast.error(t("jobstatus.rerunByWorker.noCompanies", { worker: workerLabel }));
        return;
      }

      toast.info(t("jobstatus.rerunByWorker.starting", { worker: workerLabel, count: targets.length }));

      let successes = 0;
      let failures = 0;

      for (const target of targets) {
        try {
          const response = await authenticatedFetch(
            `/api/queues/extractEmissions/${encodeURIComponent(target.extractEmissionsJobId)}/rerun-and-save`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(buildRerunAndSaveBody([followUpKey], target.wikidataNode)),
            }
          );
          if (response.ok) {
            successes++;
            console.log(`[rerun-by-worker] ${workerName} OK for ${target.companyName}`);
          } else {
            failures++;
            const errorText = await response.text();
            console.error(`[rerun-by-worker] ${workerName} FAILED for ${target.companyName}: ${errorText}`);
          }
        } catch (err) {
          failures++;
          console.error(`[rerun-by-worker] ${workerName} ERROR for ${target.companyName}:`, err);
        }
      }

      if (failures === 0) {
        toast.success(t("jobstatus.rerunByWorker.success", { worker: workerLabel, count: successes }));
      } else {
        toast.warning(t("jobstatus.rerunByWorker.partial", { worker: workerLabel, successes, failures }));
      }
    },
    [swimlaneCompanies, t]
  );

  return handleRerunByWorker;
}

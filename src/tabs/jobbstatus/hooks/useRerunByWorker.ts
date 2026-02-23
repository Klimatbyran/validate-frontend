/**
 * Hook for bulk rerun-by-worker (scope1, scope2, scope3, economy, etc.) in Jobbstatus tab.
 * Collects extractEmissions job targets from swimlane companies and calls rerun-and-save per company.
 */

import { useCallback } from "react";
import type { SwimlaneCompany } from "@/lib/types";
import { authenticatedFetch } from "@/lib/api-helpers";
import { findJobByQueueId } from "@/lib/workflow-utils";
import { buildRerunAndSaveBody } from "@/lib/job-rerun-utils";
import { toast } from "sonner";

export type RerunWorkerName =
  | "scope1"
  | "scope2"
  | "scope1+2"
  | "scope3"
  | "economy"
  | "baseYear"
  | "industryGics";

const WORKER_TO_FOLLOW_UP_KEY: Record<RerunWorkerName, string> = {
  scope1: "scope1",
  scope2: "scope2",
  "scope1+2": "scope1+2",
  scope3: "scope3",
  economy: "economy",
  baseYear: "baseYear",
  industryGics: "industryGics",
};

export function useRerunByWorker(swimlaneCompanies: SwimlaneCompany[]) {
  const handleRerunByWorker = useCallback(
    async (workerName: RerunWorkerName, limit: number | "all" = 5) => {
      const followUpKey = WORKER_TO_FOLLOW_UP_KEY[workerName];
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
        toast.error(`Inga företag hittades att köra om ${workerName} för`);
        return;
      }

      toast.info(`Kör om ${workerName} för ${targets.length} företag...`);

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
        toast.success(`Startade om ${workerName} för ${successes} företag`);
      } else {
        toast.warning(`${workerName}: ${successes} lyckades, ${failures} misslyckades`);
      }
    },
    [swimlaneCompanies]
  );

  return handleRerunByWorker;
}

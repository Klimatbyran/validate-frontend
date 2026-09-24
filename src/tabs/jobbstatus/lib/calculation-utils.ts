/**
 * Utility functions for common calculations
 * Centralizes repetitive math logic throughout the application
 */

import { getQueueAttemptSummary } from "@/lib/workflow-utils";
import { getQueuesForPipelineStep } from "@/lib/workflow-config";

/**
 * Calculate overall statistics for swimlane companies (latest year only)
 * Uses effective jobs (latest per queue+thread) so reruns don't double-count.
 */
export function calculateSwimlaneOverallStats(
  companies: any[],
  getAllPipelineSteps: () => any[],
  calculateStepJobStats: (data: any, stepId: string) => any,
) {
  let totalJobs = 0;
  let completedFields = 0;
  let processingFields = 0;
  let failedFields = 0;
  let waitingFields = 0;
  let needsApprovalFields = 0;

  const pipelineSteps = getAllPipelineSteps();
  const allQueueIds = pipelineSteps.flatMap((step: any) =>
    getQueuesForPipelineStep(step.id),
  );

  // Count aggregate queue outcomes from latest year only for each company
  companies.forEach((company) => {
    const latestYear = company.years[0];
    if (!latestYear) return;
    totalJobs++;

    const canonicalThreadId =
      latestYear.jobs?.[0]?.data?.threadId ||
      (latestYear.jobs?.[0] as any)?.threadId ||
      (latestYear as any).threadId ||
      null;

    allQueueIds.forEach((queueId: string) => {
      const agg = getQueueAttemptSummary(
        queueId,
        latestYear,
        canonicalThreadId,
      );
      if (agg.attempts.length === 0 && agg.status !== "skipped") return;
      switch (agg.status) {
        case "completed":
        case "wikidata_unverified":
        case "skipped":
          completedFields++;
          break;
        case "processing":
          processingFields++;
          break;
        case "failed":
          failedFields++;
          break;
        case "needs_approval":
          needsApprovalFields++;
          break;
        case "waiting":
        default:
          waitingFields++;
          break;
      }
    });
  });

  // Calculate step statistics using the unified function
  const stepStats = pipelineSteps.map((step: any) => {
    const stats = calculateStepJobStats(companies, step.id);
    return {
      name: step.name,
      ...stats,
    };
  });

  const totalFields =
    completedFields +
    processingFields +
    failedFields +
    waitingFields +
    needsApprovalFields;
  const completionRate =
    totalFields > 0 ? (completedFields / totalFields) * 100 : 0;

  const activeJobs = companies.reduce((acc, company) => {
    const latestYear = company.years[0];
    if (!latestYear) return acc;
    const canonicalThreadId =
      latestYear.jobs?.[0]?.data?.threadId ||
      (latestYear.jobs?.[0] as any)?.threadId ||
      (latestYear as any).threadId ||
      null;
    const hasActive = allQueueIds.some((queueId: string) => {
      const agg = getQueueAttemptSummary(
        queueId,
        latestYear,
        canonicalThreadId,
      );
      if (agg.attempts.length === 0) return false;
      return agg.status === "processing" || agg.status === "needs_approval";
    });
    return hasActive ? acc + 1 : acc;
  }, 0);

  // Company counts that match filter semantics (for overview cards that align with filter badges)
  const companiesWithFailed = companies.filter((company) => {
    const latestYear = company.years[0];
    if (!latestYear) return false;
    const canonicalThreadId =
      latestYear.jobs?.[0]?.data?.threadId ||
      (latestYear.jobs?.[0] as any)?.threadId ||
      (latestYear as any).threadId ||
      null;
    return allQueueIds.some((queueId: string) => {
      const agg = getQueueAttemptSummary(
        queueId,
        latestYear,
        canonicalThreadId,
      );
      return agg.attempts.length > 0 && agg.status === "failed";
    });
  }).length;
  const companiesWithNeedsApproval = companies.filter((company) => {
    const latestYear = company.years[0];
    if (!latestYear) return false;
    const canonicalThreadId =
      latestYear.jobs?.[0]?.data?.threadId ||
      (latestYear.jobs?.[0] as any)?.threadId ||
      (latestYear as any).threadId ||
      null;
    return allQueueIds.some((queueId: string) => {
      const agg = getQueueAttemptSummary(
        queueId,
        latestYear,
        canonicalThreadId,
      );
      return agg.attempts.length > 0 && agg.status === "needs_approval";
    });
  }).length;

  return {
    totalJobs,
    totalCompanies: companies.length,
    totalFields,
    completedFields,
    processingFields,
    failedFields,
    waitingFields,
    needsApprovalFields,
    completionRate,
    activeJobs,
    stepStats,
    companiesWithFailed,
    companiesWithNeedsApproval,
  };
}

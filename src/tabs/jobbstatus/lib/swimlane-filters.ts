/**
 * Filter logic for swimlane queue status
 * Contains all filter types and predicate functions
 */

import type { SwimlaneCompany, SwimlaneYearData } from "@/lib/types";
import {
  calculatePipelineStepStatus,
  getQueueAttemptSummary,
} from "@/lib/workflow-utils";
import { getAllPipelineSteps, getQueuesForPipelineStep } from "@/lib/workflow-config";

export type FilterType =
  | "pending_approval"
  | "has_failed"
  | "has_processing"
  | "fully_completed"
  | "has_issues"
  | "preprocessing_issues"
  | "data_extraction_issues"
  | "finalize_issues";

export type RunScope = "latest" | "all";

/**
 * Get years to check based on run scope
 */
function getYearsToCheck(
  company: SwimlaneCompany,
  runScope: RunScope
): SwimlaneYearData[] {
  if (runScope === "all") {
    return company.years;
  }
  // Latest run only - get latest year's latest run
  const latestYear = company.years[0];
  return latestYear ? [latestYear] : [];
}

/**
 * Check if company has pending approval jobs
 */
export function hasPendingApproval(
  company: SwimlaneCompany,
  runScope: RunScope = "latest"
): boolean {
  const yearsToCheck = getYearsToCheck(company, runScope);
  const allQueueIds = getAllPipelineSteps().flatMap((s) =>
    getQueuesForPipelineStep(s.id)
  );
  return yearsToCheck.some((year) => {
    const canonicalThreadId =
      year.jobs?.[0]?.data?.threadId ||
      (year.jobs?.[0] as any)?.threadId ||
      (year as any).threadId ||
      null;
    return allQueueIds.some((queueId) => {
      const agg = getQueueAttemptSummary(queueId, year, canonicalThreadId);
      return agg.attempts.length > 0 && agg.status === "needs_approval";
    });
  });
}

/**
 * Check if company has failed jobs
 */
export function hasFailedJobs(
  company: SwimlaneCompany,
  runScope: RunScope = "latest"
): boolean {
  const yearsToCheck = getYearsToCheck(company, runScope);
  const allQueueIds = getAllPipelineSteps().flatMap((s) =>
    getQueuesForPipelineStep(s.id)
  );
  return yearsToCheck.some((year) => {
    const canonicalThreadId =
      year.jobs?.[0]?.data?.threadId ||
      (year.jobs?.[0] as any)?.threadId ||
      (year as any).threadId ||
      null;
    return allQueueIds.some((queueId) => {
      const agg = getQueueAttemptSummary(queueId, year, canonicalThreadId);
      return agg.attempts.length > 0 && agg.status === "failed";
    });
  });
}

/**
 * Check if company has processing jobs
 */
export function hasProcessingJobs(
  company: SwimlaneCompany,
  runScope: RunScope = "latest"
): boolean {
  const yearsToCheck = getYearsToCheck(company, runScope);
  const allQueueIds = getAllPipelineSteps().flatMap((s) =>
    getQueuesForPipelineStep(s.id)
  );
  return yearsToCheck.some((year) => {
    const canonicalThreadId =
      year.jobs?.[0]?.data?.threadId ||
      (year.jobs?.[0] as any)?.threadId ||
      (year as any).threadId ||
      null;
    return allQueueIds.some((queueId) => {
      const agg = getQueueAttemptSummary(queueId, year, canonicalThreadId);
      return agg.attempts.length > 0 && agg.status === "processing";
    });
  });
}

/**
 * Check if company is fully completed
 */
export function isFullyCompleted(
  company: SwimlaneCompany,
  runScope: RunScope = "latest"
): boolean {
  const yearsToCheck = getYearsToCheck(company, runScope);
  const allQueueIds = getAllPipelineSteps().flatMap((s) =>
    getQueuesForPipelineStep(s.id)
  );
  return yearsToCheck.every((year) => {
    const canonicalThreadId =
      year.jobs?.[0]?.data?.threadId ||
      (year.jobs?.[0] as any)?.threadId ||
      (year as any).threadId ||
      null;
    const attemptedQueueIds = allQueueIds.filter((queueId) => {
      const agg = getQueueAttemptSummary(queueId, year, canonicalThreadId);
      return agg.attempts.length > 0;
    });
    if (attemptedQueueIds.length === 0) return false;
    return attemptedQueueIds.every((queueId) => {
      const agg = getQueueAttemptSummary(queueId, year, canonicalThreadId);
      return agg.status === "completed";
    });
  });
}

/**
 * Check if company has issues (failed or needs approval)
 */
export function hasIssues(
  company: SwimlaneCompany,
  runScope: RunScope = "latest"
): boolean {
  const yearsToCheck = getYearsToCheck(company, runScope);
  const allQueueIds = getAllPipelineSteps().flatMap((s) =>
    getQueuesForPipelineStep(s.id)
  );
  return yearsToCheck.some((year) => {
    const canonicalThreadId =
      year.jobs?.[0]?.data?.threadId ||
      (year.jobs?.[0] as any)?.threadId ||
      (year as any).threadId ||
      null;
    return allQueueIds.some((queueId) => {
      const agg = getQueueAttemptSummary(queueId, year, canonicalThreadId);
      return (
        agg.attempts.length > 0 &&
        (agg.status === "failed" || agg.status === "needs_approval")
      );
    });
  });
}

/**
 * Check if company has issues in a specific pipeline step
 */
export function hasPipelineStepIssues(
  company: SwimlaneCompany,
  stepId: string,
  runScope: RunScope = "latest"
): boolean {
  const yearsToCheck = getYearsToCheck(company, runScope);
  return yearsToCheck.some((year) => {
    const stepStatus = calculatePipelineStepStatus(year, stepId);
    return stepStatus === "failed" || stepStatus === "needs_approval";
  });
}

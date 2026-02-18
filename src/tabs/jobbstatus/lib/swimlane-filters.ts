/**
 * Filter logic for swimlane queue status
 * Contains all filter types and predicate functions
 */

import type { SwimlaneCompany, SwimlaneYearData, QueueJob } from "@/lib/types";
import {
  getJobStatus as getJobStatusFromUtils,
  calculatePipelineStepStatus,
  getEffectiveJobs,
} from "@/lib/workflow-utils";

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
  return yearsToCheck.some((year) =>
    getEffectiveJobs(year).some((job: QueueJob) => {
      const status = getJobStatusFromUtils(job);
      return status === "needs_approval";
    })
  );
}

/**
 * Check if company has failed jobs
 */
export function hasFailedJobs(
  company: SwimlaneCompany,
  runScope: RunScope = "latest"
): boolean {
  const yearsToCheck = getYearsToCheck(company, runScope);
  return yearsToCheck.some((year) =>
    getEffectiveJobs(year).some((job: QueueJob) => {
      const status = getJobStatusFromUtils(job);
      return status === "failed";
    })
  );
}

/**
 * Check if company has processing jobs
 */
export function hasProcessingJobs(
  company: SwimlaneCompany,
  runScope: RunScope = "latest"
): boolean {
  const yearsToCheck = getYearsToCheck(company, runScope);
  return yearsToCheck.some((year) =>
    getEffectiveJobs(year).some((job: QueueJob) => {
      const status = getJobStatusFromUtils(job);
      return status === "processing";
    })
  );
}

/**
 * Check if company is fully completed
 */
export function isFullyCompleted(
  company: SwimlaneCompany,
  runScope: RunScope = "latest"
): boolean {
  const yearsToCheck = getYearsToCheck(company, runScope);
  return yearsToCheck.every((year) => {
    const jobs = getEffectiveJobs(year);
    if (jobs.length === 0) return false;
    return jobs.every((job: QueueJob) => {
      const status = getJobStatusFromUtils(job);
      return status === "completed";
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
  return yearsToCheck.some((year) =>
    getEffectiveJobs(year).some((job: QueueJob) => {
      const status = getJobStatusFromUtils(job);
      return status === "failed" || status === "needs_approval";
    })
  );
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

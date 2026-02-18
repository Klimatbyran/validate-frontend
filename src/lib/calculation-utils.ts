/**
 * Utility functions for common calculations
 * Centralizes repetitive math logic throughout the application
 */

import { getEffectiveJobs } from "./workflow-utils";

/**
 * Calculate percentage with safe division
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

/**
 * Calculate percentage and format to specified decimal places
 */
export function calculatePercentageFormatted(
  value: number,
  total: number,
  decimals: number = 1
): string {
  return calculatePercentage(value, total).toFixed(decimals);
}

/**
 * Calculate completion rate for a set of values
 */
export function calculateCompletionRate(
  completed: number,
  total: number
): number {
  return calculatePercentage(completed, total);
}

/**
 * Calculate step statistics for pipeline steps
 */
export function calculateStepStatistics(
  completed: number,
  processing: number,
  failed: number,
  needsApproval: number,
  waiting: number
) {
  const total = completed + processing + failed + needsApproval + waiting;

  return {
    total,
    completed,
    processing,
    failed,
    needsApproval,
    waiting,
    completionRate: calculateCompletionRate(completed, total),
    completedPercent: calculatePercentage(completed, total),
    processingPercent: calculatePercentage(processing, total),
    failedPercent: calculatePercentage(failed, total),
    needsApprovalPercent: calculatePercentage(needsApproval, total),
    waitingPercent: calculatePercentage(waiting, total),
  };
}

/**
 * Calculate overall statistics across multiple companies
 */
export function calculateOverallStatistics(
  companies: Array<{
    years: Array<{
      jobs?: Array<any>;
      fields?: Record<string, any>;
    }>;
  }>
) {
  let totalJobs = 0;
  let completedFields = 0;
  let processingFields = 0;
  let failedFields = 0;
  let needsApprovalFields = 0;
  let waitingFields = 0;

  companies.forEach((company) => {
    company.years.forEach((year) => {
      totalJobs++;

      // Count field statuses
      Object.values(year.fields || {}).forEach((field: any) => {
        const status = typeof field === "string" ? field : field.status;

        switch (status) {
          case "completed":
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
  });

  const totalFields =
    completedFields +
    processingFields +
    failedFields +
    waitingFields +
    needsApprovalFields;

  return {
    totalJobs,
    totalCompanies: companies.length,
    totalFields,
    completedFields,
    processingFields,
    failedFields,
    needsApprovalFields,
    waitingFields,
    completionRate: calculateCompletionRate(completedFields, totalFields),
  };
}

/**
 * Calculate overall statistics for swimlane companies (latest year only)
 * Uses effective jobs (latest per queue+thread) so reruns don't double-count.
 */
export function calculateSwimlaneOverallStats(
  companies: any[],
  getAllPipelineSteps: () => any[],
  calculateStepJobStats: (data: any, stepId: string) => any,
  getJobStatus: (job: any) => string
) {
  let totalJobs = 0;
  let completedFields = 0;
  let processingFields = 0;
  let failedFields = 0;
  let waitingFields = 0;
  let needsApprovalFields = 0;

  // Count jobs from latest year only for each company (effective = latest per queue+thread)
  companies.forEach((company) => {
    const latestYear = company.years[0];
    if (latestYear) {
      totalJobs++;

      const effectiveJobs = getEffectiveJobs(latestYear);
      effectiveJobs.forEach((job: any) => {
        const status = getJobStatus(job);

        switch (status) {
          case "completed":
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
    }
  });

  // Calculate step statistics using the unified function
  const pipelineSteps = getAllPipelineSteps();
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
    const effective = latestYear ? getEffectiveJobs(latestYear) : [];
    if (
      effective.some(
        (job: any) =>
          (job.processedOn && !job.finishedOn) ||
          (!job.data?.approved && !job.data?.autoApprove)
      )
    ) {
      return acc + 1;
    }
    return acc;
  }, 0);

  // Company counts that match filter semantics (for overview cards that align with filter badges)
  const companiesWithFailed = companies.filter((company) => {
    const latestYear = company.years[0];
    const effective = latestYear ? getEffectiveJobs(latestYear) : [];
    return effective.some((job: any) => getJobStatus(job) === "failed");
  }).length;
  const companiesWithNeedsApproval = companies.filter((company) => {
    const latestYear = company.years[0];
    const effective = latestYear ? getEffectiveJobs(latestYear) : [];
    return effective.some((job: any) => getJobStatus(job) === "needs_approval");
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

/**
 * Utility functions for common calculations
 * Centralizes repetitive math logic throughout the application
 */

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

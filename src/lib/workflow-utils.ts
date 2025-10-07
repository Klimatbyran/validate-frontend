/**
 * Workflow Utility Functions
 *
 * This file contains utility functions for working with workflow data,
 * including status calculations, data transformations, and pipeline logic.
 */

import type {
  SwimlaneStatusType,
  SwimlaneFieldData,
  SwimlaneYearData,
  SwimlaneCompany,
} from "./types";
import {
  getQueuesForPipelineStep,
  getAllFieldNames,
  getAllPipelineSteps,
  PIPELINE_STEPS,
} from "./workflow-config";

/**
 * Single source of truth for job status determination
 * Used by all views to ensure consistency
 */
export function getJobStatus(job: any): SwimlaneStatusType {
  if (!job) return "waiting";

  // Only count as failed if explicitly marked as failed AND finished
  if (job.finishedOn && job.isFailed) {
    return "failed";
  }

  // If finished but not failed, check if it needs approval
  if (job.finishedOn) {
    const needsApproval = !job.data.approved && !job.data.autoApprove;
    return needsApproval ? "needs_approval" : "completed";
  }

  // If actively processing, show as processing
  if (job.processedOn) {
    return "processing";
  }

  // Default to waiting for all other cases
  // This includes jobs that are not processed, not finished, and not explicitly failed
  return "waiting";
}

/**
 * Get the status from a field data object
 */
export function getFieldStatus(
  fieldData: SwimlaneStatusType | SwimlaneFieldData | undefined
): SwimlaneStatusType {
  if (!fieldData) {
    return "waiting";
  }

  if (typeof fieldData === "string") {
    return fieldData;
  }

  return fieldData.status;
}

/**
 * Extract jobs for a specific pipeline step from data
 */
export function getJobsForStep(
  data: SwimlaneYearData | SwimlaneCompany[],
  stepId: string
): any[] {
  const queueIds = getQueuesForPipelineStep(stepId);

  if (Array.isArray(data)) {
    // All companies data
    return data.flatMap((company) =>
      company.years.flatMap(
        (year) =>
          year.jobs?.filter((job) => queueIds.includes(job.queueId)) || []
      )
    );
  } else {
    // Single year data
    return data.jobs?.filter((job) => queueIds.includes(job.queueId)) || [];
  }
}

/**
 * Calculate job statistics for a specific pipeline step
 * Works for both single year data and all companies data
 */
export function calculateStepJobStats(
  data: SwimlaneYearData | SwimlaneCompany[],
  stepId: string
): {
  completed: number;
  processing: number;
  failed: number;
  waiting: number;
  needsApproval: number;
  total: number;
} {
  const jobs = getJobsForStep(data, stepId);

  const result = jobs.reduce(
    (stats, job) => {
      const status = getJobStatus(job);
      stats.total++;
      stats[status]++;
      return stats;
    },
    {
      completed: 0,
      processing: 0,
      failed: 0,
      waiting: 0,
      needsApproval: 0,
      total: 0,
    }
  );

  // Only log if there are unexpected results
  if (result.failed > 0 || result.total === 0) {
  }

  return result;
}

/**
 * Calculate the overall status for a pipeline step based on its fields
 */
export function calculatePipelineStepStatus(
  yearData: SwimlaneYearData,
  stepId: string
): "completed" | "processing" | "failed" | "waiting" | "needs_approval" {
  // Get English queue IDs instead of Swedish display names
  const queueIds = getQueuesForPipelineStep(stepId);

  if (queueIds.length === 0) {
    return "waiting";
  }

  const fieldStatuses = queueIds.map((queueId) => {
    const fieldData = yearData.fields[queueId];
    const status = getFieldStatus(fieldData);

    return status;
  });

  // Priority-based status determination (new order: failed > needs_approval > processing > waiting > completed)
  if (fieldStatuses.some((status) => status === "failed")) {
    return "failed";
  } else if (fieldStatuses.some((status) => status === "needs_approval")) {
    return "needs_approval";
  } else if (fieldStatuses.some((status) => status === "processing")) {
    return "processing";
  } else if (fieldStatuses.every((status) => status === "waiting")) {
    return "waiting";
  } else if (fieldStatuses.every((status) => status === "completed")) {
    return "completed";
  } else {
    return "waiting";
  }
}

/**
 * Check if a field is actively processing
 */
export function isFieldActivelyProcessing(
  fieldData: SwimlaneStatusType | SwimlaneFieldData | undefined
): boolean {
  if (!fieldData) {
    return false;
  }

  if (typeof fieldData === "string") {
    return fieldData === "processing";
  }

  return fieldData.isActivelyProcessing || false;
}

/**
 * Calculate overall statistics for a company across all years
 */
export function calculateCompanyStats(company: SwimlaneCompany) {
  let totalJobs = 0;
  let totalFields = 0;
  let completedFields = 0;
  let processingFields = 0;
  let failedFields = 0;
  let waitingFields = 0;
  let needsApprovalFields = 0;

  const stepStats = PIPELINE_STEPS.map((step) => ({
    name: step.name,
    completed: 0,
    processing: 0,
    failed: 0,
    waiting: 0,
    total: 0,
  }));

  company.years.forEach((year) => {
    totalJobs++;

    getAllFieldNames().forEach((field) => {
      totalFields++;
      const fieldData = year.fields[field];
      const status = getFieldStatus(fieldData);

      if (status === "completed") completedFields++;
      else if (status === "processing") processingFields++;
      else if (status === "failed") failedFields++;
      else if (status === "needs_approval") needsApprovalFields++;
      else waitingFields++;

      // Calculate step statistics
      PIPELINE_STEPS.forEach((step, index) => {
        const stepStatus = calculatePipelineStepStatus(year, step.id);
        stepStats[index].total++;
        if (stepStatus === "completed") stepStats[index].completed++;
        else if (stepStatus === "processing") stepStats[index].processing++;
        else if (stepStatus === "failed") stepStats[index].failed++;
        else stepStats[index].waiting++;
      });
    });
  });

  return {
    totalJobs,
    totalFields,
    completedFields,
    processingFields,
    failedFields,
    waitingFields,
    needsApprovalFields,
    stepStats,
  };
}

/**
 * Convert grouped companies data to swimlane format
 */
export function convertGroupedCompaniesToSwimlaneFormat(
  groupedCompanies: any[]
): SwimlaneCompany[] {
  return groupedCompanies.map((company) => {
    const years: SwimlaneYearData[] = (company.attempts || []).map(
      (attempt: any) => {
        const yearData: SwimlaneYearData = {
          year: attempt.year,
          attempts: attempt.attemptCount || 1, // Use actual attempt count
          fields: {},
          jobs: attempt.jobs || [], // Preserve the actual job data
          latestTimestamp: attempt.latestTimestamp, // Include latest timestamp
        };

        // Populate fields from jobs instead of stages to get complete data
        (attempt.jobs || []).forEach((job: any) => {
          const status = getJobStatus(job);

          yearData.fields[job.queueId] = {
            status,
            isActivelyProcessing: status === "processing",
          } as SwimlaneFieldData;
        });

        // Ensure all expected queue IDs for each step have field data
        // This prevents undefined field data from causing incorrect step statuses
        const allPipelineSteps = getAllPipelineSteps();
        allPipelineSteps.forEach((step) => {
          const queueIds = getQueuesForPipelineStep(step.id);
          queueIds.forEach((queueId) => {
            if (!yearData.fields[queueId]) {
              // If no job exists for this queue ID, default to waiting
              yearData.fields[queueId] = {
                status: "waiting" as SwimlaneStatusType,
                isActivelyProcessing: false,
              } as SwimlaneFieldData;
            }
          });
        });

        return yearData;
      }
    );

    const result = {
      id: company.company,
      name: company.companyName || company.company,
      years,
    };
    return result;
  });
}

/**
 * Get status color classes for different statuses
 */
export function getStatusColorClasses(status: SwimlaneStatusType): string {
  switch (status) {
    case "completed":
      return "text-green-03 bg-green-03/20 border-green-03 ring-green-03";
    case "failed":
      return "text-pink-03 bg-pink-03/20 border-pink-03 ring-pink-03";
    case "processing":
      return "text-blue-03 bg-blue-03/20 border-blue-03 ring-blue-03";
    case "needs_approval":
      return "text-orange-03 bg-orange-03/20 border-orange-03 ring-orange-03";
    case "waiting":
    default:
      return "text-gray-02 bg-gray-03/20 border-gray-03 ring-gray-03";
  }
}

/**
 * Get status icon for different statuses
 */
export function getStatusIcon(status: SwimlaneStatusType): string {
  switch (status) {
    case "completed":
      return "✓";
    case "failed":
      return "⚠";
    case "processing":
      return "⟳";
    case "needs_approval":
      return "?";
    case "waiting":
    default:
      return "○";
  }
}

/**
 * Get status text for different statuses
 */
export function getStatusText(status: SwimlaneStatusType): string {
  switch (status) {
    case "completed":
      return "Klar";
    case "failed":
      return "Misslyckades";
    case "processing":
      return "Bearbetar";
    case "needs_approval":
      return "Behöver godkännande";
    case "waiting":
    default:
      return "Väntar";
  }
}

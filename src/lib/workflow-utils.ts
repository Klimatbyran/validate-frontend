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
  getAllPipelineSteps,
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
    // All companies data - only get jobs from latest year per company
    return data.flatMap((company) => {
      const latestYear = company.years[0]; // Latest year is first in sorted array
      return (
        latestYear?.jobs?.filter((job) => queueIds.includes(job.queueId)) || []
      );
    });
  } else {
    // Single year data
    return data.jobs?.filter((job) => queueIds.includes(job.queueId)) || [];
  }
}

/**
 * Find a job by queue ID in year data
 */
export function findJobByQueueId(
  queueId: string,
  yearData: SwimlaneYearData
): any | undefined {
  if (!yearData.jobs) {
    return undefined;
  }

  return yearData.jobs.find((job: any) => job.queueId === queueId);
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

      // Map status to the correct property name
      switch (status) {
        case "completed":
          stats.completed++;
          break;
        case "processing":
          stats.processing++;
          break;
        case "failed":
          stats.failed++;
          break;
        case "waiting":
          stats.waiting++;
          break;
        case "needs_approval":
          stats.needsApproval++;
          break;
        default:
          stats.waiting++;
          break;
      }

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

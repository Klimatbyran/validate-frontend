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

  // Check for approval status FIRST (before checking other statuses)
  // Jobs waiting for approval might have status "delayed" or "completed"
  const approval = job.data?.approval || (job as any)?.approval;
  const hasApprovalObject = approval && typeof approval === "object";
  const isPendingApproval = hasApprovalObject && approval.approved === false;

  // If job has pending approval, return needs_approval regardless of other status
  if (isPendingApproval) {
    return "needs_approval";
  }

  // Check the raw status field from the API first (for jobs from /process/companies endpoint)
  const rawStatus = job.status;

  // Map API status values to our internal status types
  if (rawStatus === "failed") {
    return "failed";
  }

  if (rawStatus === "active") {
    return "processing";
  }

  // For completed jobs, check if they need approval (fallback check)
  if (rawStatus === "completed" || job.finishedOn) {
    const needsApproval = !job.data?.approved && !job.data?.autoApprove;
    return needsApproval ? "needs_approval" : "completed";
  }

  if (
    rawStatus === "waiting" ||
    rawStatus === "waiting-children" ||
    rawStatus === "delayed"
  ) {
    return "waiting";
  }

  // Only count as failed if explicitly marked as failed AND finished
  if (job.isFailed) {
    return "failed";
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
 * Find the latest job (by timestamp) for a specific queue ID in year data
 */
export function findJobByQueueId(
  queueId: string,
  yearData: SwimlaneYearData
): any | undefined {
  if (!yearData.jobs || yearData.jobs.length === 0) {
    return undefined;
  }

  const jobsForQueue = yearData.jobs.filter(
    (job: any) => job.queueId === queueId
  );

  if (jobsForQueue.length === 0) {
    return undefined;
  }

  return jobsForQueue.reduce((latestJob: any, currentJob: any) => {
    const latestTimestamp = latestJob?.timestamp || 0;
    const currentTimestamp = currentJob?.timestamp || 0;

    if (currentTimestamp > latestTimestamp) {
      return currentJob;
    }

    return latestJob;
  }, jobsForQueue[0]);
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
 * Check if a job has been started (has been processed or finished)
 */
function hasJobBeenStarted(job: any): boolean {
  if (!job) return false;
  // Job has been started if it has been processed or finished
  return !!(
    job.processedOn ||
    job.finishedOn ||
    job.status === "active" ||
    job.status === "completed" ||
    job.status === "failed"
  );
}

/**
 * Check if a job is actively processing
 */
function isJobActivelyProcessing(job: any): boolean {
  if (!job) return false;
  // Job is actively processing if it has processedOn but no finishedOn, or status is "active"
  return (job.processedOn && !job.finishedOn) || job.status === "active";
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

  // Get jobs and their statuses
  const jobsWithStatuses = queueIds.map((queueId) => {
    // First try to get status from fields if available
    const fieldData = yearData.fields[queueId];
    let status: SwimlaneStatusType;
    let job: any;

    if (fieldData) {
      status = getFieldStatus(fieldData);
      // Still need to get the job to check if it's actively processing
      job = findJobByQueueId(queueId, yearData);
    } else {
      job = findJobByQueueId(queueId, yearData);
      status = getJobStatus(job);
    }

    return { queueId, job, status };
  });

  // Special case for finalize step: show green if saveToAPI (API Lagring) is completed
  // This is the most important step for the user
  // But check for delayed jobs first - if any job is delayed, show gray
  if (stepId === "finalize") {
    // Check for delayed jobs first (check raw status, not mapped status)
    const hasDelayed = jobsWithStatuses.some(
      (entry) => entry.job && entry.job.status === "delayed"
    );

    if (hasDelayed) {
      return "waiting"; // Show gray for delayed
    }

    const saveToAPIEntry = jobsWithStatuses.find(
      (entry) => entry.queueId === "saveToAPI"
    );
    if (saveToAPIEntry && saveToAPIEntry.status === "completed") {
      return "completed";
    }
  }

  // For preprocessing and data-extraction steps: special logic
  // - Show processing if any job is actively processing
  // - Show green if all started jobs are completed (ignore waiting jobs that haven't been run)
  // - Show failed if any started job failed
  // - Show gray (waiting) if any job is delayed
  if (stepId === "preprocessing" || stepId === "data-extraction") {
    // Check if any job is actively processing first (highest priority)
    const hasActivelyProcessing = jobsWithStatuses.some((entry) =>
      isJobActivelyProcessing(entry.job)
    );

    if (hasActivelyProcessing) {
      return "processing";
    }

    // Check for delayed jobs (check raw status, not mapped status)
    const hasDelayed = jobsWithStatuses.some(
      (entry) => entry.job && entry.job.status === "delayed"
    );

    if (hasDelayed) {
      return "waiting"; // Show gray for delayed
    }

    // Filter to only jobs that have been started (ignore waiting jobs that haven't been run)
    const startedJobs = jobsWithStatuses.filter((entry) =>
      hasJobBeenStarted(entry.job)
    );

    if (startedJobs.length === 0) {
      // No jobs have been started yet
      return "waiting";
    }

    // Check statuses of started jobs only
    const startedStatuses = startedJobs.map((entry) => entry.status);
    const hasFailed = startedStatuses.some((status) => status === "failed");
    const allCompleted = startedStatuses.every(
      (status) => status === "completed"
    );
    const hasCompleted = startedStatuses.some(
      (status) => status === "completed"
    );

    // If any started job failed, show failed
    if (hasFailed) {
      return "failed";
    }

    // If all started jobs are completed (green), show green
    // This means: no failed, no stuck, no delayed - everything that was run is green
    if (allCompleted && hasCompleted) {
      return "completed";
    }

    // Check for needs_approval (prioritize over waiting)
    if (startedStatuses.some((status) => status === "needs_approval")) {
      return "needs_approval";
    }

    // Default to waiting
    return "waiting";
  }

  // For other steps, use the original logic but also check for delayed
  // Check for delayed jobs (check raw status, not mapped status)
  const hasDelayed = jobsWithStatuses.some(
    (entry) => entry.job && entry.job.status === "delayed"
  );

  if (hasDelayed) {
    return "waiting"; // Show gray for delayed
  }

  const fieldStatuses = jobsWithStatuses.map((entry) => entry.status);
  const hasCompleted = fieldStatuses.some((status) => status === "completed");
  const hasWaiting = fieldStatuses.some((status) => status === "waiting");
  const hasFailed = fieldStatuses.some((status) => status === "failed");

  // Check if all jobs are completed (no waiting, no failed, at least one completed)
  if (hasCompleted && !hasWaiting && !hasFailed) {
    return "completed";
  }

  // Priority-based status determination:
  // 1. If there's at least one red (failed) → show red
  // 2. If there's at least one orange (needs_approval) → show orange (prioritize approval)
  // 3. If there's at least one gray (waiting) → show gray
  // 4. Otherwise, if there's any green (completed) → show green
  const hasNeedsApproval = fieldStatuses.some(
    (status) => status === "needs_approval"
  );
  if (hasFailed) {
    return "failed";
  } else if (hasNeedsApproval) {
    return "needs_approval";
  } else if (hasWaiting) {
    return "waiting";
  } else if (hasCompleted) {
    return "completed";
  } else if (fieldStatuses.some((status) => status === "processing")) {
    return "processing";
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

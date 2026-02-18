import { isMarkdown, isJsonString } from "@/lib/utils";
import { QueueJob, DetailedJobResponse } from "@/lib/types";

/**
 * Maps follow-up queue IDs to the scopes they should run.
 * Used when rerunning a follow-up job to ensure only the relevant scope runs.
 */
export const QUEUE_TO_SCOPES: Record<string, string[]> = {
  followUpScope12: ["scope1", "scope2"],
  followUpScope1: ["scope1"],
  followUpScope2: ["scope2"],
  followUpScope3: ["scope3"],
};

/**
 * Maps follow-up queue IDs to their FollowUpKey used by the backend.
 * Used when triggering a follow-up job that didn't run via the extractEmissions parent.
 */
export const QUEUE_TO_FOLLOW_UP_KEY: Record<string, string> = {
  followUpScope1: "scope1",
  followUpScope2: "scope2",
  followUpScope12: "scope1+2",
  followUpScope3: "scope3",
  followUpBiogenic: "biogenic",
  followUpEconomy: "economy",
  followUpGoals: "goals",
  followUpInitiatives: "initiatives",
  followUpBaseYear: "baseYear",
  followUpIndustryGics: "industryGics",
  followUpFiscalYear: "fiscalYear",
  followUpCompanyTags: "companyTags",
};

/**
 * Check if a queueId is a follow-up queue that can be triggered from extractEmissions.
 */
export function isFollowUpQueue(queueId: string): boolean {
  return queueId in QUEUE_TO_FOLLOW_UP_KEY;
}

/**
 * Builds the request body for POST .../rerun-and-save (extractEmissions parent).
 * Use when triggering one or more follow-up scopes with optional wikidata context.
 */
export function buildRerunAndSaveBody(
  scopes: string[],
  wikidata?: { node?: string } | string | null
): { scopes: string[]; jobData?: { wikidata: { node: string } } } {
  const node =
    typeof wikidata === "string"
      ? wikidata
      : wikidata?.node;
  return {
    scopes,
    ...(node ? { jobData: { wikidata: { node } } } : {}),
  };
}

/**
 * Extracts job data from various possible locations.
 * Job data can be stored in different shapes depending on the API response.
 */
export function getJobData(
  job?: QueueJob | null,
  effectiveJob?: any,
  detailed?: DetailedJobResponse | null
): Record<string, any> {
  return (
    effectiveJob?.data ||
    job?.data ||
    detailed?.data ||
    {}
  );
}

/**
 * Gets the return value from a job.
 */
export function getReturnValue(
  job?: QueueJob | null,
  effectiveJob?: any
): any {
  return effectiveJob?.returnvalue ?? job?.returnvalue;
}

/**
 * Extracts markdown from job data.
 * Checks various possible locations where markdown might be stored.
 */
export function extractMarkdownFromJob(
  job?: QueueJob | null,
  effectiveJob?: any,
  detailed?: DetailedJobResponse | null
): string | undefined {
  const jobData = getJobData(job, effectiveJob, detailed);
  const returnValue = getReturnValue(job, effectiveJob);

  // Check in job data
  if (jobData?.markdown && typeof jobData.markdown === "string") {
    return jobData.markdown;
  }

  // Check in return value
  if (returnValue) {
    let parsedReturnValue = returnValue;
    if (typeof returnValue === "string" && isJsonString(returnValue)) {
      try {
        parsedReturnValue = JSON.parse(returnValue);
      } catch {
        // If parsing fails, check if it's markdown directly
        if (isMarkdown(returnValue)) {
          return returnValue;
        }
        return undefined;
      }
    }

    if (typeof parsedReturnValue === "object" && parsedReturnValue !== null) {
      // Check top-level markdown
      if (
        parsedReturnValue.markdown &&
        typeof parsedReturnValue.markdown === "string"
      ) {
        return parsedReturnValue.markdown;
      }
      // Check in value.markdown
      if (
        parsedReturnValue.value?.markdown &&
        typeof parsedReturnValue.value.markdown === "string"
      ) {
        return parsedReturnValue.value.markdown;
      }
    } else if (
      typeof parsedReturnValue === "string" &&
      isMarkdown(parsedReturnValue)
    ) {
      return parsedReturnValue;
    }
  }

  // Check in detailed job data
  if (detailed?.data?.markdown && typeof detailed.data.markdown === "string") {
    return detailed.data.markdown;
  }

  return undefined;
}

/**
 * Flattens job data by merging any nested `jobData` field into the top level.
 */
export function flattenJobData(rawData: Record<string, any>): Record<string, any> {
  const { jobData: nestedJobData, ...rest } = rawData;
  return {
    ...(nestedJobData || {}),
    ...rest,
  };
}

/**
 * Builds the request data for rerunning a job.
 * Handles scope-specific overrides and markdown context.
 */
export function buildRerunRequestData(
  queueId: string,
  job?: QueueJob | null,
  effectiveJob?: any,
  detailed?: DetailedJobResponse | null
): { data: Record<string, any> } {
  const rawData = getJobData(job, effectiveJob, detailed);
  const flattenedBaseData = flattenJobData(rawData);

  // Get runOnly override based on queue type
  const runOnly = QUEUE_TO_SCOPES[queueId];

  // For extractEmissions jobs, add markdown context if available
  let markdownContext: Record<string, string> = {};
  if (queueId === "extractEmissions") {
    const extractedMarkdown = extractMarkdownFromJob(job, effectiveJob, detailed);
    if (extractedMarkdown) {
      markdownContext = {
        markdownContextScope1: extractedMarkdown,
        markdownContextScope2: extractedMarkdown,
        markdownContextScope12: extractedMarkdown,
      };
    }
  }

  return {
    data: {
      ...flattenedBaseData,
      ...(runOnly ? { runOnly } : {}),
      ...markdownContext,
    },
  };
}

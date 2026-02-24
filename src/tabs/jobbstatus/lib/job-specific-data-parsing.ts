/**
 * Pure helpers for parsing job return value and approval data.
 * Used by JobSpecificDataView to derive scope, economy, and wikidata approval.
 */

import type { QueueJob } from "@/lib/types";
import { isJsonString } from "@/lib/utils";

export function parseReturnValueData(job?: QueueJob): any {
  const rawReturnValue = job?.returnvalue;
  if (!rawReturnValue) return null;

  if (typeof rawReturnValue === "string" && isJsonString(rawReturnValue)) {
    try {
      return JSON.parse(rawReturnValue);
    } catch (e) {
      return null;
    }
  } else if (typeof rawReturnValue === "object") {
    if ("value" in rawReturnValue && (rawReturnValue as any).value) {
      return (rawReturnValue as any).value;
    }
    return rawReturnValue;
  }
  return null;
}

export function getScopeData(returnValueData: any): any {
  const data = returnValueData?.value;
  return data?.scope12 || data?.scope1 || data?.scope2;
}

export function getEconomyData(returnValueData: any): any[] | null {
  if (returnValueData?.economy && Array.isArray(returnValueData.economy)) {
    return returnValueData.economy;
  }
  if (returnValueData?.value?.economy && Array.isArray(returnValueData.value.economy)) {
    return returnValueData.value.economy;
  }
  return null;
}

export function getScope3Data(processedData: any, returnValueData: any): any {
  const hasScope3 =
    (processedData.scope3 && Array.isArray(processedData.scope3)) ||
    (returnValueData && typeof returnValueData === "object" && Array.isArray((returnValueData as any).scope3)) ||
    (returnValueData &&
      typeof returnValueData === "object" &&
      (returnValueData as any).value &&
      Array.isArray((returnValueData as any).value.scope3));
  if (!hasScope3) return null;
  if (processedData.scope3 && Array.isArray(processedData.scope3)) return processedData.scope3;
  if (returnValueData && typeof returnValueData === "object" && Array.isArray((returnValueData as any).scope3)) {
    return (returnValueData as any).scope3;
  }
  if (
    returnValueData &&
    typeof returnValueData === "object" &&
    (returnValueData as any).value &&
    Array.isArray((returnValueData as any).value.scope3)
  ) {
    return (returnValueData as any).value.scope3;
  }
  return null;
}

export function getWikidataApprovalData(job?: QueueJob, effectiveJob?: any): any {
  const jobData = effectiveJob?.data || job?.data;
  const approval = jobData?.approval;

  if (approval && typeof approval === "object") {
    if (
      approval.type === "wikidata" &&
      approval.approved === false &&
      approval.data?.newValue?.wikidata &&
      typeof approval.data.newValue.wikidata === "object" &&
      approval.data.newValue.wikidata.node
    ) {
      return {
        status: "pending_approval",
        wikidata: approval.data.newValue.wikidata,
        message: approval.summary || "Waiting for approval",
        metadata: approval.metadata || {},
      };
    }
    if (
      approval.type === "wikidata" &&
      approval.approved === true &&
      approval.data?.newValue?.wikidata &&
      typeof approval.data.newValue.wikidata === "object" &&
      approval.data.newValue.wikidata.node
    ) {
      return {
        status: "approved",
        wikidata: approval.data.newValue.wikidata,
        message: approval.summary || "Approved",
        metadata: approval.metadata || {},
      };
    }
  }

  if (job?.queueId === "guessWikidata") {
    return {
      status: "pending_approval",
      wikidata: {
        node: "Q123456",
        url: "https://wikidata.org/wiki/Q123456",
        label: "Example Company AB",
        description: "Swedish company",
      },
      message: "Wikidata selection for Example Company AB - waiting for approval",
      metadata: {
        source: "wikidata-search",
        comment: "Wikidata found via search and LLM selection",
      },
    };
  }

  return null;
}

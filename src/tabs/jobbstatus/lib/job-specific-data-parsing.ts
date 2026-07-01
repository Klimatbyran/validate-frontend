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
    } catch {
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
  if (
    returnValueData?.value?.economy &&
    Array.isArray(returnValueData.value.economy)
  ) {
    return returnValueData.value.economy;
  }
  return null;
}

export function getScope3Data(processedData: any, returnValueData: any): any {
  const hasScope3 =
    (processedData.scope3 && Array.isArray(processedData.scope3)) ||
    (returnValueData &&
      typeof returnValueData === "object" &&
      Array.isArray((returnValueData as any).scope3)) ||
    (returnValueData &&
      typeof returnValueData === "object" &&
      (returnValueData as any).value &&
      Array.isArray((returnValueData as any).value.scope3));
  if (!hasScope3) return null;
  if (processedData.scope3 && Array.isArray(processedData.scope3))
    return processedData.scope3;
  if (
    returnValueData &&
    typeof returnValueData === "object" &&
    Array.isArray((returnValueData as any).scope3)
  ) {
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

function wikidataApprovalFromApprovalObject(
  approval: Record<string, unknown>,
  jobData?: Record<string, unknown>,
): {
  status: "approved" | "pending_approval" | "approved_unverified";
  wikidata: {
    node: string;
    url: string;
    label: string;
    description?: string;
  };
  message?: string;
  metadata?: Record<string, unknown>;
  autoApproved?: boolean;
  verifiedByUserId?: string;
} | null {
  const wikidata = (approval.data as any)?.newValue?.wikidata;
  if (!wikidata || typeof wikidata !== "object" || !wikidata.node) {
    return null;
  }

  const autoApproved = Boolean(jobData?.autoApprove);
  const verifiedByUserId =
    typeof approval.verifiedByUserId === "string"
      ? approval.verifiedByUserId
      : undefined;

  if (approval.approved === false) {
    return {
      status: "pending_approval",
      wikidata,
      message:
        (typeof approval.summary === "string" && approval.summary) ||
        "Waiting for approval",
      metadata: (approval.metadata as Record<string, unknown>) || {},
      autoApproved,
      verifiedByUserId,
    };
  }

  if (approval.approved === true) {
    const status =
      autoApproved && !verifiedByUserId ? "approved_unverified" : "approved";
    return {
      status,
      wikidata,
      message:
        (typeof approval.summary === "string" && approval.summary) ||
        (status === "approved_unverified"
          ? "Auto-approved (identifier unverified)"
          : "Approved"),
      metadata: (approval.metadata as Record<string, unknown>) || {},
      autoApproved,
      verifiedByUserId,
    };
  }

  return null;
}

export function getWikidataApprovalData(
  job?: QueueJob,
  effectiveJob?: any,
): ReturnType<typeof wikidataApprovalFromApprovalObject> {
  const jobData = effectiveJob?.data || job?.data;
  const approval = jobData?.approval;

  if (approval && typeof approval === "object" && approval.type === "wikidata") {
    return wikidataApprovalFromApprovalObject(
      approval as Record<string, unknown>,
      jobData as Record<string, unknown> | undefined,
    );
  }

  return null;
}

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

export interface WikidataApprovalWikidata {
  node: string;
  url: string;
  label: string;
  description?: string;
}

export interface WikidataApprovalData {
  status: "approved" | "pending_approval" | "approved_unverified";
  wikidata: WikidataApprovalWikidata;
  message?: string;
  metadata?: {
    source?: string;
    comment?: string;
  };
  autoApproved?: boolean;
  verifiedByUserId?: string;
}

function approvalSummary(
  approval: Record<string, unknown>,
): string | undefined {
  return typeof approval.summary === "string" && approval.summary.trim()
    ? approval.summary
    : undefined;
}

function wikidataApprovalFromApprovalObject(
  approval: Record<string, unknown>,
  jobData?: Record<string, unknown>,
): WikidataApprovalData | null {
  const wikidata = (approval.data as any)?.newValue?.wikidata;
  if (!wikidata || typeof wikidata !== "object" || !wikidata.node) {
    return null;
  }

  const autoApproved = Boolean(jobData?.autoApprove);
  const verifiedByUserId =
    typeof approval.verifiedByUserId === "string"
      ? approval.verifiedByUserId
      : undefined;
  const metadata =
    (approval.metadata as WikidataApprovalData["metadata"]) || {};

  if (approval.approved === false) {
    return {
      status: "pending_approval",
      wikidata,
      message: approvalSummary(approval),
      metadata,
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
      message: approvalSummary(approval),
      metadata,
      autoApproved,
      verifiedByUserId,
    };
  }

  return null;
}

export function getWikidataApprovalData(
  job?: QueueJob,
  effectiveJob?: any,
): WikidataApprovalData | null {
  const jobData = effectiveJob?.data || job?.data;
  const approval = jobData?.approval;

  if (
    approval &&
    typeof approval === "object" &&
    approval.type === "wikidata"
  ) {
    return wikidataApprovalFromApprovalObject(
      approval as Record<string, unknown>,
      jobData as Record<string, unknown> | undefined,
    );
  }

  return null;
}

export interface CompanyLinkCandidate {
  id: string;
  name: string;
  wikidataId?: string | null;
}

export interface CompanyLinkApprovalData {
  status: "approved" | "pending_approval";
  extractedName: string;
  candidates: CompanyLinkCandidate[];
  selectedCompanyId?: string;
  createNew?: boolean;
  allowCreateNew?: boolean;
  wikidataNode?: string;
  message?: string;
  metadata?: {
    source?: string;
    comment?: string;
  };
}

function companyLinkApprovalFromApprovalObject(
  approval: Record<string, unknown>,
): CompanyLinkApprovalData | null {
  const newValue = (approval.data as any)?.newValue;
  const extractedName =
    typeof newValue?.extractedName === "string" ? newValue.extractedName : "";
  const candidates = Array.isArray(newValue?.candidates)
    ? (newValue.candidates as CompanyLinkCandidate[])
    : [];

  if (!extractedName || candidates.length === 0) {
    return null;
  }

  const allowCreateNew = newValue?.allowCreateNew !== false;
  const wikidataNode =
    typeof newValue?.wikidataNode === "string"
      ? newValue.wikidataNode
      : undefined;

  const metadata =
    (approval.metadata as CompanyLinkApprovalData["metadata"]) || {};

  if (approval.approved === false) {
    return {
      status: "pending_approval",
      extractedName,
      candidates,
      allowCreateNew,
      wikidataNode,
      message: approvalSummary(approval),
      metadata,
    };
  }

  if (approval.approved === true) {
    return {
      status: "approved",
      extractedName,
      candidates,
      allowCreateNew,
      wikidataNode,
      selectedCompanyId:
        typeof newValue?.companyId === "string" ? newValue.companyId : undefined,
      createNew: Boolean(newValue?.createNew),
      message: approvalSummary(approval),
      metadata,
    };
  }

  return null;
}

export function getCompanyLinkApprovalData(
  job?: QueueJob,
  effectiveJob?: any,
): CompanyLinkApprovalData | null {
  const jobData = effectiveJob?.data || job?.data;
  const approval = jobData?.approval;

  if (
    approval &&
    typeof approval === "object" &&
    approval.type === "companyLink"
  ) {
    return companyLinkApprovalFromApprovalObject(
      approval as Record<string, unknown>,
    );
  }

  return null;
}

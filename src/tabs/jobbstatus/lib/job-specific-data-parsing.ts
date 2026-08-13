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

export type Scope3CategoryReporting =
  | "FULL"
  | "GROUPED"
  | "CUSTOM_LABELS"
  | "SINGLE_TOTAL";

export type FragmentedValuesReporting =
  | "NONE"
  | "PARTS_WITH_TOTAL"
  | "PARTS_ONLY_NO_TOTAL";

export interface Scope3CategoryFragmentation {
  category: number;
  fragmentedReporting: "PARTS_WITH_TOTAL" | "PARTS_ONLY_NO_TOTAL";
  example: string;
}

export interface ReportingQualityData {
  usesGhgProtocolCategories: Scope3CategoryReporting | null;
  categoryLabelsExample: string | null;
  methodChanges: Array<{ year: number | null; description: string }>;
  missingScopesExplained: boolean | null;
  missingScopesReason: string | null;
  scope2MethodExplicit: boolean | null;
  scope1FragmentedReporting: FragmentedValuesReporting | null;
  scope1FragmentedExample: string | null;
  scope2FragmentedReporting: FragmentedValuesReporting | null;
  scope2FragmentedExample: string | null;
  scope3CategoryFragmentation: Scope3CategoryFragmentation[];
}

/**
 * Reporting quality lives in returnvalue.value.reportingQuality for the
 * follow-up job (LLM extraction) and in job.data.reportingQuality for the
 * diff job (already-extracted flags being saved).
 */
export function getReportingQualityData(
  returnValueData: any,
  processedData: any,
): ReportingQualityData | null {
  const data =
    returnValueData?.value?.reportingQuality ?? processedData?.reportingQuality;
  if (!data || typeof data !== "object") return null;
  return {
    usesGhgProtocolCategories: data.usesGhgProtocolCategories ?? null,
    categoryLabelsExample: data.categoryLabelsExample ?? null,
    methodChanges: Array.isArray(data.methodChanges) ? data.methodChanges : [],
    missingScopesExplained: data.missingScopesExplained ?? null,
    missingScopesReason: data.missingScopesReason ?? null,
    scope2MethodExplicit: data.scope2MethodExplicit ?? null,
    scope1FragmentedReporting: data.scope1FragmentedReporting ?? null,
    scope1FragmentedExample: data.scope1FragmentedExample ?? null,
    scope2FragmentedReporting: data.scope2FragmentedReporting ?? null,
    scope2FragmentedExample: data.scope2FragmentedExample ?? null,
    scope3CategoryFragmentation: Array.isArray(data.scope3CategoryFragmentation)
      ? data.scope3CategoryFragmentation
      : [],
  };
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

function wikidataFromJobData(
  jobData?: Record<string, unknown>,
): WikidataApprovalWikidata | null {
  const wikidata = jobData?.wikidata;
  if (!wikidata || typeof wikidata !== "object") return null;

  const node =
    typeof (wikidata as { node?: unknown }).node === "string"
      ? (wikidata as { node: string }).node.trim()
      : "";
  if (!node) return null;

  const raw = wikidata as {
    url?: string;
    label?: string;
    description?: string;
  };

  return {
    node,
    url: raw.url?.trim() || `https://www.wikidata.org/wiki/${node}`,
    label: raw.label?.trim() || node,
    description: raw.description?.trim(),
  };
}

function wikidataApprovalFromApprovalObject(
  approval: Record<string, unknown>,
  jobData?: Record<string, unknown>,
): WikidataApprovalData | null {
  const wikidata =
    (approval.data as { newValue?: { wikidata?: WikidataApprovalWikidata } })
      ?.newValue?.wikidata ?? wikidataFromJobData(jobData);
  if (!wikidata?.node) {
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

/** True when job.data.approval exists and staff action is still required. */
export function hasPendingStructuredApproval(jobData?: {
  approval?: { approved?: boolean };
}): boolean {
  const approval = jobData?.approval;
  return Boolean(
    approval && typeof approval === "object" && approval.approved === false,
  );
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
  partialNameMatch?: boolean;
  displayName?: string;
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

  const partialNameMatch = Boolean(newValue?.partialNameMatch);
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
      partialNameMatch,
      wikidataNode,
      displayName:
        typeof newValue?.displayName === "string"
          ? newValue.displayName
          : partialNameMatch
            ? extractedName
            : undefined,
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
      partialNameMatch,
      wikidataNode,
      selectedCompanyId:
        typeof newValue?.companyId === "string"
          ? newValue.companyId
          : undefined,
      createNew: Boolean(newValue?.createNew),
      displayName:
        typeof newValue?.displayName === "string"
          ? newValue.displayName
          : undefined,
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

export function hasActionableStructuredApprovalUi(
  job?: QueueJob,
  effectiveJob?: QueueJob,
): boolean {
  const companyLink = getCompanyLinkApprovalData(job, effectiveJob);
  const wikidata = getWikidataApprovalData(job, effectiveJob);
  return (
    companyLink?.status === "pending_approval" ||
    wikidata?.status === "pending_approval"
  );
}

/**
 * Garbo companies API for the editor: list, get by wikidataId, update company,
 * reporting periods, industry, base year. All endpoints require auth (garboAuthFetch).
 */

import { garboAuthFetch } from "@/lib/garbo-auth-fetch";
import {
  WIKIDATA_ID_REGEX,
  type GarboCompanyListItem,
  type GarboCompanyDetail,
  type GarboCompanyReportSummary,
  type GarboMetadata,
  type GarboRegistryReportSummary,
} from "./types";
import { parseGarboCompanyDetail } from "./companies-schemas";
import { apiUrl } from "./api-utils";

function normalizeReportingPeriodUrls(
  company: GarboCompanyDetail,
): GarboCompanyDetail {
  const periods = company.reportingPeriods;
  if (!Array.isArray(periods) || periods.length === 0) return company;

  const normalized = periods.map((rp) => {
    const sourceUrl =
      rp.sourceUrl ?? rp.reportSourceUrl ?? rp.sourceURL ?? null;
    const s3Url = rp.s3Url ?? rp.reportS3Url ?? rp.s3URL ?? null;

    if (sourceUrl === rp.sourceUrl && s3Url === rp.s3Url) return rp;

    return {
      ...rp,
      sourceUrl,
      s3Url,
    };
  });

  return {
    ...company,
    reportingPeriods: normalized,
  };
}

function normalizeIndustrySubIndustryCode(
  company: GarboCompanyDetail,
): GarboCompanyDetail {
  const industry = company.industry as
    | null
    | undefined
    | {
        subIndustryCode?: string;
        industryGics?: { subIndustryCode?: string } | null;
        industryGICS?: { subIndustryCode?: string } | null;
      };

  const codeFromTop =
    industry && typeof industry.subIndustryCode === "string"
      ? industry.subIndustryCode
      : undefined;
  const codeFromIndustryGics =
    industry &&
    industry.industryGics &&
    typeof industry.industryGics.subIndustryCode === "string"
      ? industry.industryGics.subIndustryCode
      : undefined;
  const codeFromIndustryGICS =
    industry &&
    industry.industryGICS &&
    typeof industry.industryGICS.subIndustryCode === "string"
      ? industry.industryGICS.subIndustryCode
      : undefined;

  const resolved = codeFromTop ?? codeFromIndustryGics ?? codeFromIndustryGICS;
  if (!resolved) return company;

  return {
    ...company,
    industry: {
      ...(typeof company.industry === "object" && company.industry
        ? company.industry
        : {}),
      subIndustryCode: resolved,
    },
  };
}

function normalizeCompany(company: GarboCompanyDetail): GarboCompanyDetail {
  return normalizeReportingPeriodUrls(
    normalizeIndustrySubIndustryCode(company),
  );
}

function companiesPath(segment = ""): string {
  const path = "/companies";
  const seg = segment.replace(/^\//, "");
  return seg ? `${path}/${seg}` : path;
}

function pipelineCompaniesPath(segment = ""): string {
  const path = "/pipeline/companies";
  const seg = segment.replace(/^\//, "");
  return seg ? `${path}/${seg}` : path;
}

function reportingPeriodPath(segment = ""): string {
  const path = "/reporting-period";
  const seg = segment.replace(/^\//, "");
  return seg ? `${path}/${seg}` : path;
}

/** List companies for staff editor (GET /api/pipeline/companies — all reporting periods). */
export async function listCompanies(
  signal?: AbortSignal,
): Promise<GarboCompanyListItem[]> {
  const res = await garboAuthFetch(apiUrl(pipelineCompaniesPath()), {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });
  if (res.status === 401) {
    throw new Error("Please log in to list companies.");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to list companies: ${res.status} ${text}`);
  }
  const data = await res.json();
  const list = Array.isArray(data)
    ? data
    : (data.companies ?? data.items ?? []);
  return Array.isArray(list)
    ? (list as unknown[]).map((raw) =>
        normalizeCompany(parseGarboCompanyDetail(raw) as GarboCompanyDetail),
      )
    : [];
}

function companyMatchesEditorRef(
  company: GarboCompanyListItem,
  ref: string,
): boolean {
  if (company.id === ref) return true;
  if (company.wikidataId === ref) return true;
  const idPrefix = company.id.split("-")[0];
  return idPrefix.toLowerCase() === ref.toLowerCase();
}

async function fetchPipelineCompanyByRef(
  pipelineRef: string,
  signal?: AbortSignal,
): Promise<GarboCompanyDetail> {
  const res = await garboAuthFetch(
    apiUrl(pipelineCompaniesPath(encodeURIComponent(pipelineRef))),
    {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    },
  );
  if (res.status === 401) {
    throw new Error("Please log in to view company.");
  }
  if (res.status === 404) {
    throw new Error("Company not found.");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch company: ${res.status} ${text}`);
  }
  const data = parseGarboCompanyDetail(await res.json());
  return normalizeCompany(data as GarboCompanyDetail);
}

/**
 * Editor detail: all reporting periods (pipeline staff API).
 * Pipeline GET /:ref only accepts Wikidata IDs; internal id / UUID prefix is
 * resolved via the pipeline list, then fetched by wikidataId when present.
 */
export async function getCompany(
  identifier: string,
  signal?: AbortSignal,
): Promise<GarboCompanyDetail> {
  const ref = identifier.trim();
  if (WIKIDATA_ID_REGEX.test(ref)) {
    return fetchPipelineCompanyByRef(ref, signal);
  }

  const companies = await listCompanies(signal);
  const match = companies.find((company) =>
    companyMatchesEditorRef(company, ref),
  );
  if (!match) {
    throw new Error("Company not found.");
  }

  if (match.wikidataId) {
    return fetchPipelineCompanyByRef(match.wikidataId, signal);
  }

  return match as GarboCompanyDetail;
}

/** Create company (POST /api/companies). */
export async function createCompany(body: {
  wikidataId?: string;
  name: string;
  descriptions?: Array<{ language: string; text: string; id?: string }>;
  internalComment?: string;
  tags?: string[];
  url?: string;
  logoUrl?: string | null;
  lei?: string;
  metadata?: GarboMetadata;
  verified?: boolean;
}): Promise<{ ok: boolean; id: string }> {
  const res = await garboAuthFetch(apiUrl(companiesPath()), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    throw new Error("Please log in to create company.");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create company: ${res.status} ${text}`);
  }
  return res.json();
}

/** Update company (POST /api/companies/:id). Body: name, descriptions, tags, etc. */
export async function updateCompany(
  companyId: string,
  body: {
    wikidataId?: string;
    name: string;
    descriptions?: Array<{ language: string; text: string; id?: string }>;
    internalComment?: string;
    tags?: string[];
    url?: string;
    logoUrl?: string | null;
    lei?: string;
    metadata?: GarboMetadata;
    verified?: boolean;
  },
): Promise<void> {
  const res = await garboAuthFetch(
    apiUrl(companiesPath(encodeURIComponent(companyId))),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (res.status === 401) {
    throw new Error("Please log in to update company.");
  }
  if (res.status === 400) {
    const data = await res.json().catch(() => ({}));
    const details = (data as { details?: { invalidTags?: string[] } }).details;
    if (details?.invalidTags?.length) {
      throw new Error(`Invalid tags: ${details.invalidTags.join(", ")}`);
    }
    throw new Error(data.message ?? "Validation error.");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update company: ${res.status} ${text}`);
  }
}

/** Create or update reporting periods (POST /api/companies/:id/reporting-periods). */
export async function updateReportingPeriods(
  companyId: string,
  body: {
    reportingPeriods: Array<{
      startDate: string;
      endDate: string;
      reportURL?: string | null;
      reportS3Url?: string | null;
      reportSha256?: string | null;
      emissions?: Record<string, unknown>;
      economy?: Record<string, unknown>;
    }>;
    metadata?: GarboMetadata;
    replaceAllEmissions?: boolean;
  },
): Promise<void> {
  const res = await garboAuthFetch(
    apiUrl(companiesPath(`${encodeURIComponent(companyId)}/reporting-periods`)),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (res.status === 401) {
    throw new Error("Please log in to update reporting periods.");
  }
  if (res.status === 404) {
    throw new Error("Company not found.");
  }
  if (res.status === 403) {
    throw new Error("replaceAllEmissions is not allowed in production.");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Failed to update reporting periods: ${res.status} ${text}`,
    );
  }
}

/** Delete a company by wikidataId (DELETE /api/companies/:wikidataId). */
export async function deleteCompany(wikidataId: string): Promise<void> {
  const res = await garboAuthFetch(
    apiUrl(companiesPath(encodeURIComponent(wikidataId))),
    {
      method: "DELETE",
      headers: { Accept: "application/json" },
    },
  );

  if (res.status === 401) {
    throw new Error("Please log in to delete company.");
  }
  if (res.status === 404) {
    throw new Error("Company not found.");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to delete company: ${res.status} ${text}`);
  }
}

/** Delete a reporting period by id (DELETE /api/companies/reporting-period/:id). */
// Whole CompanyReport delete + empty-shell cleanup after last period — see garbo k8s/jobs/README.md
export async function deleteReportingPeriod(id: string): Promise<void> {
  const encodedId = encodeURIComponent(id);
  const res = await garboAuthFetch(
    apiUrl(companiesPath(reportingPeriodPath(encodedId))),
    {
      method: "DELETE",
      headers: { Accept: "application/json" },
    },
  );

  if (res.status === 401) {
    throw new Error("Please log in to delete reporting period.");
  }
  if (res.status === 404) {
    throw new Error("Reporting period not found.");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to delete reporting period: ${res.status} ${text}`);
  }
}

/** Industry GICS option from GET /api/industry-gics. */
export interface IndustryGicsOption {
  code: string;
  label?: string;
  subIndustryName?: string;
  sector?: string;
  group?: string;
  industry?: string;
}

/** List industry GICS codes (GET /api/industry-gics). Requires auth. */
export async function fetchIndustryGics(
  signal?: AbortSignal,
): Promise<IndustryGicsOption[]> {
  const res = await garboAuthFetch(apiUrl("/industry-gics"), {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });
  if (res.status === 401) {
    throw new Error("Please log in to load industry options.");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to load industry options: ${res.status} ${text}`);
  }
  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (Array.isArray((data as { options?: unknown }).options))
    return (data as { options: IndustryGicsOption[] }).options;
  if (Array.isArray((data as { items?: unknown }).items))
    return (data as { items: IndustryGicsOption[] }).items;

  // Some envs return an object keyed by subIndustryCode, e.g. { "10101010": { sectorName, groupName, ... }, ... }.
  if (data && typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    const mapped: IndustryGicsOption[] = entries
      .map(([code, raw]) => {
        if (!raw || typeof raw !== "object") return null;
        const r = raw as Record<string, unknown>;
        const subIndustryName =
          (typeof r.subIndustryName === "string" && r.subIndustryName) ||
          (typeof r.subIndustry === "string" && r.subIndustry) ||
          undefined;
        const sector =
          (typeof r.sector === "string" && r.sector) ||
          (typeof r.sectorName === "string" && r.sectorName) ||
          undefined;
        const group =
          (typeof r.group === "string" && r.group) ||
          (typeof r.groupName === "string" && r.groupName) ||
          undefined;
        const industry =
          (typeof r.industry === "string" && r.industry) ||
          (typeof r.industryName === "string" && r.industryName) ||
          undefined;
        const label =
          (typeof r.label === "string" && r.label) ||
          (typeof r.name === "string" && r.name) ||
          subIndustryName ||
          undefined;
        return {
          code,
          label,
          subIndustryName,
          sector,
          group,
          industry,
        } satisfies IndustryGicsOption;
      })
      .filter(Boolean) as IndustryGicsOption[];

    return mapped;
  }

  return [];
}

/** Set company industry (POST /api/companies/:id/industry). */
export async function updateCompanyIndustry(
  companyId: string,
  body: {
    industry: { subIndustryCode: string };
    metadata?: GarboMetadata;
    verified?: boolean;
  },
): Promise<void> {
  const res = await garboAuthFetch(
    apiUrl(companiesPath(`${encodeURIComponent(companyId)}/industry`)),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (res.status === 401) throw new Error("Please log in to update industry.");
  if (res.status === 404) throw new Error("Company not found.");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update industry: ${res.status} ${text}`);
  }
}

/** CompanyReport shells for a company (GET /api/companies/:id/company-reports). */
export async function fetchCompanyReports(
  companyId: string,
  signal?: AbortSignal,
): Promise<GarboCompanyReportSummary[]> {
  const res = await garboAuthFetch(
    apiUrl(companiesPath(`${encodeURIComponent(companyId)}/company-reports`)),
    {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    },
  );
  if (res.status === 401) {
    throw new Error("Please log in to list company reports.");
  }
  if (res.status === 404) {
    throw new Error("Company not found.");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to list company reports: ${res.status} ${text}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/** Link unlinked reporting periods to a registry report (POST …/company-reports/link-periods). */
export async function linkReportingPeriodsToCompanyReport(
  companyId: string,
  body: { registryReportId: string; reportingPeriodIds: string[] },
): Promise<{ companyReportId: string; registryReportId: string }> {
  const res = await garboAuthFetch(
    apiUrl(
      companiesPath(
        `${encodeURIComponent(companyId)}/company-reports/link-periods`,
      ),
    ),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (res.status === 401) {
    throw new Error("Please log in to link reporting periods.");
  }
  if (res.status === 404) {
    throw new Error("Company not found.");
  }
  if (res.status === 400) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { message?: string }).message ?? "Invalid link request.",
    );
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to link reporting periods: ${res.status} ${text}`);
  }
  const data = (await res.json()) as {
    companyReportId?: string;
    registryReportId?: string;
  };
  if (!data.companyReportId || !data.registryReportId) {
    throw new Error("Link response missing company report id.");
  }
  return {
    companyReportId: data.companyReportId,
    registryReportId: data.registryReportId,
  };
}

/** Registry Report rows for a company (GET /api/companies/:id/registry-reports). */
export async function fetchCompanyRegistryReports(
  companyId: string,
  signal?: AbortSignal,
): Promise<GarboRegistryReportSummary[]> {
  const res = await garboAuthFetch(
    apiUrl(companiesPath(`${encodeURIComponent(companyId)}/registry-reports`)),
    {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    },
  );
  if (res.status === 401) {
    throw new Error("Please log in to list registry reports.");
  }
  if (res.status === 404) {
    throw new Error("Company not found.");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to list registry reports: ${res.status} ${text}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export type UpdateCompanyReportBody = {
  reportYear?: string;
  registryReportId?: string;
};

/** Update company report shell (PATCH /api/companies/:id/company-reports/:companyReportId). */
export async function updateCompanyReport(
  companyId: string,
  companyReportId: string,
  body: UpdateCompanyReportBody,
): Promise<{
  reportYear: string | null;
  registryReportId: string | null;
}> {
  const res = await garboAuthFetch(
    apiUrl(
      companiesPath(
        `${encodeURIComponent(companyId)}/company-reports/${encodeURIComponent(companyReportId)}`,
      ),
    ),
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (res.status === 401) {
    throw new Error("Please log in to update company report.");
  }
  if (res.status === 404) {
    throw new Error("Company or company report not found.");
  }
  if (res.status === 400) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { message?: string }).message ??
        "Invalid company report update.",
    );
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update company report: ${res.status} ${text}`);
  }
  const data = (await res.json()) as {
    reportYear?: string | null;
    registryReportId?: string | null;
  };
  return {
    reportYear: data.reportYear ?? null,
    registryReportId: data.registryReportId ?? null,
  };
}

/** Set company report document year. */
export async function updateCompanyReportYear(
  companyId: string,
  companyReportId: string,
  reportYear: string,
): Promise<{ reportYear: string | null }> {
  const result = await updateCompanyReport(companyId, companyReportId, {
    reportYear,
  });
  return { reportYear: result.reportYear };
}

/** Set company base year (POST /api/companies/:id/base-year). */
export async function updateCompanyBaseYear(
  companyId: string,
  body: { baseYear: number; metadata?: GarboMetadata; verified?: boolean },
): Promise<void> {
  const res = await garboAuthFetch(
    apiUrl(companiesPath(`${encodeURIComponent(companyId)}/base-year`)),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (res.status === 401) throw new Error("Please log in to update base year.");
  if (res.status === 404) throw new Error("Company not found.");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update base year: ${res.status} ${text}`);
  }
}

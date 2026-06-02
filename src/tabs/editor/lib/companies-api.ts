/**
 * Garbo companies API for the editor: list, get by wikidataId, update company,
 * reporting periods, industry, base year. All endpoints require auth (garboAuthFetch).
 */

import { garboAuthFetch } from "@/lib/garbo-auth-fetch";
import type {
  GarboCompanyListItem,
  GarboCompanyDetail,
  GarboMetadata,
} from "./types";
import { parseGarboCompanyDetail } from "./companies-schemas";
import { apiUrl } from "./api-utils";

function normalizeReportingPeriodUrls(company: GarboCompanyDetail): GarboCompanyDetail {
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
    industry && industry.industryGics && typeof industry.industryGics.subIndustryCode === "string"
      ? industry.industryGics.subIndustryCode
      : undefined;
  const codeFromIndustryGICS =
    industry && industry.industryGICS && typeof industry.industryGICS.subIndustryCode === "string"
      ? industry.industryGICS.subIndustryCode
      : undefined;

  const resolved = codeFromTop ?? codeFromIndustryGics ?? codeFromIndustryGICS;
  if (!resolved) return company;

  return {
    ...company,
    industry: {
      ...(typeof company.industry === "object" && company.industry ? company.industry : {}),
      subIndustryCode: resolved,
    },
  };
}

function normalizeCompany(company: GarboCompanyDetail): GarboCompanyDetail {
  return normalizeReportingPeriodUrls(normalizeIndustrySubIndustryCode(company));
}

function companiesPath(segment = ""): string {
  const path = "/companies";
  const seg = segment.replace(/^\//, "");
  return seg ? `${path}/${seg}` : path;
}

function internalCompaniesPath(segment = ""): string {
  const path = "/internal-companies";
  const seg = segment.replace(/^\//, "");
  return seg ? `${path}/${seg}` : path;
}

function reportingPeriodPath(segment = ""): string {
  const path = "/reporting-period";
  const seg = segment.replace(/^\//, "");
  return seg ? `${path}/${seg}` : path;
}

/** List companies from Garbo (GET /api/companies). Requires auth. */
export async function listCompanies(
  signal?: AbortSignal,
): Promise<GarboCompanyListItem[]> {
  const res = await garboAuthFetch(apiUrl(companiesPath()), {
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
  const list = Array.isArray(data) ? data : (data.companies ?? data.items ?? []);
  return Array.isArray(list)
    ? (list as unknown[]).map((raw) =>
        normalizeCompany(parseGarboCompanyDetail(raw) as GarboCompanyDetail),
      )
    : [];
}

/** Get company detail by wikidataId (GET /api/companies/:wikidataId). Requires auth. */
export async function getCompany(
  wikidataId: string,
  signal?: AbortSignal,
): Promise<GarboCompanyDetail> {
  const res = await garboAuthFetch(
    apiUrl(internalCompaniesPath(encodeURIComponent(wikidataId))),
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

/** Create or update company (POST /api/companies/:wikidataId). Body: name, descriptions, tags, internalComment, url, logoUrl, lei, metadata, verified. */
export async function updateCompany(
  wikidataId: string,
  body: {
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
    apiUrl(companiesPath(encodeURIComponent(wikidataId))),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ wikidataId, ...body }),
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

/** Create or update reporting periods and their emissions/economy (POST /api/companies/:wikidataId/reporting-periods). */
export async function updateReportingPeriods(
  wikidataId: string,
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
    apiUrl(
      companiesPath(`${encodeURIComponent(wikidataId)}/reporting-periods`),
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

/** Delete a reporting period by id (DELETE /api/companies/reporting-period/:id). */
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

/** Set company industry (POST /api/companies/:wikidataId/industry). */
export async function updateCompanyIndustry(
  wikidataId: string,
  body: {
    industry: { subIndustryCode: string };
    metadata?: GarboMetadata;
    verified?: boolean;
  },
): Promise<void> {
  const res = await garboAuthFetch(
    apiUrl(companiesPath(`${encodeURIComponent(wikidataId)}/industry`)),
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

/** Set company base year (POST /api/companies/:wikidataId/base-year). */
export async function updateCompanyBaseYear(
  wikidataId: string,
  body: { baseYear: number; metadata?: GarboMetadata; verified?: boolean },
): Promise<void> {
  const res = await garboAuthFetch(
    apiUrl(companiesPath(`${encodeURIComponent(wikidataId)}/base-year`)),
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

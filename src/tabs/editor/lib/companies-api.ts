/**
 * Garbo companies API for the editor: list, get by wikidataId, update company,
 * tags, reporting periods. All endpoints require auth (garboAuthFetch).
 */

import { getGarboApiBaseUrl } from "@/config/api-env";
import { garboAuthFetch } from "@/lib/garbo-auth-fetch";
import type {
  GarboCompanyListItem,
  GarboCompanyDetail,
  GarboMetadata,
} from "./types";

const BASE = getGarboApiBaseUrl();

function companiesPath(segment = ""): string {
  const path = "/companies";
  const seg = segment.replace(/^\//, "");
  return seg ? `${path}/${seg}` : path;
}

function fullUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${BASE}${p}`.replace(/\/+/g, "/");
}

/** List companies from Garbo (GET /api/companies). Requires auth. */
export async function listCompanies(signal?: AbortSignal): Promise<GarboCompanyListItem[]> {
  const res = await garboAuthFetch(fullUrl(companiesPath()), {
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
  return Array.isArray(data) ? data : data.companies ?? data.items ?? [];
}

/** Get company detail by wikidataId (GET /api/companies/:wikidataId). Requires auth. */
export async function getCompany(
  wikidataId: string,
  signal?: AbortSignal
): Promise<GarboCompanyDetail> {
  const res = await garboAuthFetch(
    fullUrl(companiesPath(encodeURIComponent(wikidataId))),
    {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    }
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
  return res.json();
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
  }
): Promise<void> {
  const res = await garboAuthFetch(
    fullUrl(companiesPath(encodeURIComponent(wikidataId))),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ wikidataId, ...body }),
    }
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

/** Update company tags only (PATCH /api/companies/:wikidataId/tags). Replaces all tags. */
export async function updateCompanyTags(
  wikidataId: string,
  tags: string[]
): Promise<void> {
  const res = await garboAuthFetch(
    fullUrl(companiesPath(`${encodeURIComponent(wikidataId)}/tags`)),
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ tags }),
    }
  );
  if (res.status === 401) {
    throw new Error("Please log in to update tags.");
  }
  if (res.status === 400) {
    const data = await res.json().catch(() => ({}));
    const details = (data as { details?: { invalidTags?: string[] } }).details;
    if (details?.invalidTags?.length) {
      throw new Error(`Invalid tags: ${details.invalidTags.join(", ")}`);
    }
    throw new Error("Invalid tags.");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update tags: ${res.status} ${text}`);
  }
}

/** Create or update reporting periods and their emissions/economy (POST /api/companies/:wikidataId/reporting-periods). */
export async function updateReportingPeriods(
  wikidataId: string,
  body: {
    reportingPeriods: Array<{
      startDate: string;
      endDate: string;
      reportURL?: string;
      emissions?: Record<string, unknown>;
      economy?: Record<string, unknown>;
    }>;
    metadata?: GarboMetadata;
    replaceAllEmissions?: boolean;
  }
): Promise<void> {
  const res = await garboAuthFetch(
    fullUrl(companiesPath(`${encodeURIComponent(wikidataId)}/reporting-periods`)),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    }
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
    throw new Error(`Failed to update reporting periods: ${res.status} ${text}`);
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
  signal?: AbortSignal
): Promise<IndustryGicsOption[]> {
  const url = `${BASE}/industry-gics`.replace(/\/+/g, "/");
  const res = await garboAuthFetch(url, {
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
  return Array.isArray(data) ? data : data.options ?? data.items ?? [];
}

/** Set company industry (POST /api/companies/:wikidataId/industry). */
export async function updateCompanyIndustry(
  wikidataId: string,
  body: { industry: { subIndustryCode: string }; metadata?: GarboMetadata; verified?: boolean }
): Promise<void> {
  const res = await garboAuthFetch(
    fullUrl(companiesPath(`${encodeURIComponent(wikidataId)}/industry`)),
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    }
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
  body: { baseYear: number; metadata?: GarboMetadata; verified?: boolean }
): Promise<void> {
  const res = await garboAuthFetch(
    fullUrl(companiesPath(`${encodeURIComponent(wikidataId)}/base-year`)),
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (res.status === 401) throw new Error("Please log in to update base year.");
  if (res.status === 404) throw new Error("Company not found.");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update base year: ${res.status} ${text}`);
  }
}

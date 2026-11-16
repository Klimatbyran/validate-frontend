import { garboAuthFetch } from "@/lib/garbo-auth-fetch";
import { apiUrl } from "./api-utils";
import type { GarboMetadata } from "./types";

export const REPORTING_CAVEAT_TYPES = [
  "ACQUISITION",
  "MERGER",
  "DIVESTMENT",
  "BOUNDARY_CHANGE",
  "METHODOLOGY_CHANGE",
  "COVERAGE_CHANGE",
  "RESTATEMENT",
  "ACTIVITY_CHANGE",
  "NOT_REPORTED",
  "OTHER",
] as const;

export type ReportingCaveatType = (typeof REPORTING_CAVEAT_TYPES)[number];

export const EMISSIONS_SCOPE_KEYS = [
  "SCOPE_1",
  "SCOPE_2",
  "SCOPE_1_AND_2",
  "SCOPE_3",
  "STATED_TOTAL",
] as const;

export type EmissionsScopeKey = (typeof EMISSIONS_SCOPE_KEYS)[number];

export type ReportingCaveatImpact = "INCREASE" | "DECREASE" | "MIXED";

export type ReportingCaveatQuote = {
  id?: string;
  originalQuote: string;
  sortOrder?: number;
  sourceReference?: string | null;
  sourcePageUrl?: string | null;
};

export type ReportingCaveat = {
  id: string;
  type: ReportingCaveatType | string;
  description: string;
  effectiveYear?: string | null;
  affectedYears?: string[];
  affectedScopes?: string[];
  affectedScope3Categories?: number[];
  impactDirection?: ReportingCaveatImpact | string | null;
  priorYearsRestated?: boolean | null;
  counterpartyName?: string | null;
  counterpartyCompanyId?: string | null;
  reportId?: string | null;
  source?: string | null;
  quotes?: ReportingCaveatQuote[];
  metadata?: GarboMetadata | null;
};

export type ReportingCaveatWriteBody = {
  caveat: {
    type: ReportingCaveatType;
    description: string;
    effectiveYear?: string | null;
    affectedYears?: string[];
    affectedScopes?: EmissionsScopeKey[];
    affectedScope3Categories?: number[];
    impactDirection?: ReportingCaveatImpact | null;
    priorYearsRestated?: boolean | null;
    counterpartyName?: string | null;
    counterpartyCompanyId?: string | null;
    reportId?: string | null;
    source?: string | null;
    quotes?: Array<{
      originalQuote: string;
      sortOrder?: number;
      sourceReference?: string | null;
      pageNumber?: number;
    }>;
  };
  metadata?: GarboMetadata;
  verified?: boolean;
  reportS3Url?: string | null;
};

function companiesPath(segment: string): string {
  return `/companies/${segment}`;
}

async function readError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const data = JSON.parse(text) as { message?: string };
    return data.message ?? text;
  } catch {
    return text || res.statusText;
  }
}

export async function createReportingCaveat(
  companyId: string,
  body: ReportingCaveatWriteBody,
): Promise<ReportingCaveat> {
  const res = await garboAuthFetch(
    apiUrl(companiesPath(`${encodeURIComponent(companyId)}/reporting-caveats`)),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (res.status === 401) throw new Error("Please log in to create a caveat.");
  if (!res.ok) {
    throw new Error(`Failed to create caveat: ${await readError(res)}`);
  }
  return (await res.json()) as ReportingCaveat;
}

export async function updateReportingCaveat(
  companyId: string,
  caveatId: string,
  body: ReportingCaveatWriteBody,
): Promise<ReportingCaveat> {
  const res = await garboAuthFetch(
    apiUrl(
      companiesPath(
        `${encodeURIComponent(companyId)}/reporting-caveats/${encodeURIComponent(caveatId)}`,
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
  if (res.status === 401) throw new Error("Please log in to update a caveat.");
  if (!res.ok) {
    throw new Error(`Failed to update caveat: ${await readError(res)}`);
  }
  return (await res.json()) as ReportingCaveat;
}

export async function deleteReportingCaveat(caveatId: string): Promise<void> {
  const res = await garboAuthFetch(
    apiUrl(companiesPath(`reporting-caveats/${encodeURIComponent(caveatId)}`)),
    { method: "DELETE" },
  );
  if (res.status === 401) throw new Error("Please log in to delete a caveat.");
  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to delete caveat: ${await readError(res)}`);
  }
}

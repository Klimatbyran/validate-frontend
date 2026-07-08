import { getUnearthApiBaseUrl } from "@/config/api-env";
import { garboAuthFetch, throwIfAuthError } from "@/lib/garbo-auth-fetch";
import {
  coverageListCollectionSchema,
  coverageListSummarySchema,
  coverageYearDetailSchema,
  coverageCompanySearchResponseSchema,
  type CoverageListSummary,
  type CoverageYearDetail,
  type CoverageCompanySearchHit,
} from "./coverage-types";

function coverageUrl(path: string): string {
  const base = getUnearthApiBaseUrl();
  const segment = path.replace(/^\//, "").replace(/\/+$/, "");
  return `${base}/coverage-lists${segment ? `/${segment}` : ""}`.replace(
    /\/+$/,
    "",
  );
}

async function parseJson<T>(
  response: Response,
  url: string,
  parse: (data: unknown) => T,
): Promise<T> {
  if (response.ok) {
    return parse(await response.json());
  }
  throwIfAuthError(response.status);
  const body = await response.text().catch(() => "");
  throw new Error(
    `Coverage request failed (${response.status})${body ? `: ${body.slice(0, 200)}` : ""} (${url})`,
  );
}

export async function fetchCoverageLists(): Promise<{
  lists: CoverageListSummary[];
}> {
  const url = coverageUrl("");
  const response = await garboAuthFetch(url, { cache: "no-store" });
  return parseJson(response, url, (data) =>
    coverageListCollectionSchema.parse(data),
  );
}

export async function fetchCoverageList(
  listId: string,
): Promise<CoverageListSummary> {
  const url = coverageUrl(listId);
  const response = await garboAuthFetch(url, { cache: "no-store" });
  return parseJson(response, url, (data) =>
    coverageListSummarySchema.parse(data),
  );
}

export async function fetchCoverageYearDetail(
  listId: string,
  year: number,
): Promise<CoverageYearDetail> {
  const url = coverageUrl(`${listId}/years/${year}`);
  const response = await garboAuthFetch(url, { cache: "no-store" });
  return parseJson(response, url, (data) =>
    coverageYearDetailSchema.parse(data),
  );
}

export async function createCoverageList(input: {
  name: string;
  year?: number;
  names?: string[];
}): Promise<CoverageListSummary> {
  const url = coverageUrl("");
  const response = await garboAuthFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson(response, url, (data) =>
    coverageListSummarySchema.parse(data),
  );
}

export async function addCoverageListYear(
  listId: string,
  input: { year: number; names: string[] },
): Promise<CoverageListSummary> {
  const url = coverageUrl(`${listId}/years`);
  const response = await garboAuthFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson(response, url, (data) =>
    coverageListSummarySchema.parse(data),
  );
}

export async function renameCoverageList(
  listId: string,
  name: string,
): Promise<CoverageListSummary> {
  const url = coverageUrl(listId);
  const response = await garboAuthFetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return parseJson(response, url, (data) =>
    coverageListSummarySchema.parse(data),
  );
}

export async function replaceCoverageYearNames(
  listId: string,
  year: number,
  names: string[],
): Promise<CoverageListSummary> {
  const url = coverageUrl(`${listId}/years/${year}`);
  const response = await garboAuthFetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ names }),
  });
  return parseJson(response, url, (data) =>
    coverageListSummarySchema.parse(data),
  );
}

export async function deleteCoverageList(listId: string): Promise<void> {
  const url = coverageUrl(listId);
  const response = await garboAuthFetch(url, { method: "DELETE" });
  if (!response.ok) {
    throwIfAuthError(response.status);
    const body = await response.text().catch(() => "");
    throw new Error(
      `Delete coverage list failed (${response.status})${body ? `: ${body.slice(0, 200)}` : ""}`,
    );
  }
}

export async function deleteCoverageListYear(
  listId: string,
  year: number,
): Promise<void> {
  const url = coverageUrl(`${listId}/years/${year}`);
  const response = await garboAuthFetch(url, { method: "DELETE" });
  if (!response.ok) {
    throwIfAuthError(response.status);
    const body = await response.text().catch(() => "");
    throw new Error(
      `Delete coverage year failed (${response.status})${body ? `: ${body.slice(0, 200)}` : ""}`,
    );
  }
}

export async function searchCoverageCompanies(
  query: string,
): Promise<CoverageCompanySearchHit[]> {
  const url = `${coverageUrl("companies/search")}?q=${encodeURIComponent(query)}`;
  const response = await garboAuthFetch(url, { cache: "no-store" });
  return parseJson(response, url, (data) =>
    coverageCompanySearchResponseSchema.parse(data),
  );
}

export async function setCoverageEntryMatch(
  listId: string,
  year: number,
  entryId: string,
  input: {
    matchedCompanyId: string | null;
    matchConfirmedMissing?: boolean;
  },
): Promise<CoverageYearDetail> {
  const url = coverageUrl(`${listId}/years/${year}/entries/${entryId}`);
  const response = await garboAuthFetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson(response, url, (data) =>
    coverageYearDetailSchema.parse(data),
  );
}

export function namesFromTextarea(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

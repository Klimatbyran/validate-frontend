import { getUnearthApiBaseUrl } from "@/config/api-env";
import type {
  crawlerSearchQuery,
  LlmSelectionCandidate,
  LlmSelectionResult,
  PdfTextResponse,
  PrefilterReportResult,
  SaveReportsListResponse,
  SelectedReport,
} from "./crawler-types";
import { garboAuthFetch } from "@/lib/garbo-auth-fetch";

/** Crawler uses Unearth API. Base follows VITE_UNEARTH_TARGET / VITE_API_MODE. */

const TRANSIENT_HTTP_STATUSES = new Set([500, 502, 503, 504]);
const TRANSIENT_FETCH_ATTEMPTS = 4;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function transientRetryDelayMs(attempt: number): number {
  return Math.min(8000, 500 * 2 ** (attempt - 1));
}

/** Retry when Vite proxy or API dev restart drops in-flight requests (ECONNREFUSED → 500). */
async function fetchWithTransientRetry(
  url: string,
  init?: RequestInit,
): Promise<Response | null> {
  let lastResponse: Response | null = null;
  for (let attempt = 1; attempt <= TRANSIENT_FETCH_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, init);
      lastResponse = response;
      if (
        response.ok ||
        !TRANSIENT_HTTP_STATUSES.has(response.status) ||
        attempt === TRANSIENT_FETCH_ATTEMPTS
      ) {
        return response;
      }
    } catch {
      if (attempt === TRANSIENT_FETCH_ATTEMPTS) return null;
    }
    await sleep(transientRetryDelayMs(attempt));
  }
  return lastResponse;
}

async function authFetchWithTransientRetry(
  url: string,
  init?: RequestInit,
): Promise<Response | null> {
  let lastResponse: Response | null = null;
  for (let attempt = 1; attempt <= TRANSIENT_FETCH_ATTEMPTS; attempt++) {
    try {
      const response = await garboAuthFetch(url, init);
      lastResponse = response;
      if (
        response.ok ||
        !TRANSIENT_HTTP_STATUSES.has(response.status) ||
        attempt === TRANSIENT_FETCH_ATTEMPTS
      ) {
        return response;
      }
    } catch {
      if (attempt === TRANSIENT_FETCH_ATTEMPTS) return null;
    }
    await sleep(transientRetryDelayMs(attempt));
  }
  return lastResponse;
}

export function reportsUrl(path: string): string {
  const base = getUnearthApiBaseUrl();
  const segment = path.replace(/^\//, "").replace(/\/+$/, "");
  const url = segment ? `${base}/${segment}` : base;
  return url.replace(/\/+$/, "");
}

export const updateCompanyReports = async (searchQuery: crawlerSearchQuery) => {
  try {
    const response = await garboAuthFetch(
      reportsUrl("internal-companies/reports/search-reports"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify([searchQuery]),
      },
    );

    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      console.error("Failed to fetch company report:", response.statusText);
      throw new Error(`Failed to fetch report: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Error fetching company report:", error);
    throw error instanceof Error ? error : new Error("Failed to fetch report");
  }
};

export const fetchCompanyNamesList = async () => {
  const url = reportsUrl("internal-companies/reports/database-list");
  try {
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      const msg = `Failed to fetch company names: ${response.status} ${response.statusText} (${url})`;
      console.error(msg);
      throw new Error(msg);
    }
  } catch (error) {
    const msg = `Failed to fetch company names (${url})`;
    console.error(msg, error);
    throw error instanceof Error ? error : new Error(msg);
  }
};

export async function fetchPdfText(
  pdfUrl: string,
  maxPages = 1,
): Promise<PdfTextResponse | null> {
  const params = new URLSearchParams({
    pdfUrl,
    maxPages: String(maxPages),
  });
  const url = `${reportsUrl("internal-companies/reports/pdf-text")}?${params}`;
  try {
    const response = await fetchWithTransientRetry(url);
    if (!response?.ok) return null;
    return (await response.json()) as PdfTextResponse;
  } catch {
    return null;
  }
}

/**
 * Fast LLM triage on crawl metadata — skip obvious non-matches before PDF download.
 */
export async function prefilterReportCandidates(input: {
  companyName: string;
  reportYear: string;
  candidates: Pick<LlmSelectionCandidate, "url" | "title" | "description">[];
}): Promise<PrefilterReportResult | null> {
  if (input.candidates.length === 0) return null;
  try {
    const response = await authFetchWithTransientRetry(
      reportsUrl("internal-companies/reports/prefilter-reports"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      },
    );
    if (!response?.ok) return null;
    return (await response.json()) as PrefilterReportResult;
  } catch (error) {
    console.error("LLM report prefilter failed:", error);
    return null;
  }
}

/**
 * Ask the API's LLM to pick the correct company/year report from candidates.
 * Best-effort: returns null on any failure so callers skip auto-save.
 */
export async function selectReportWithLlm(input: {
  companyName: string;
  reportYear: string;
  candidates: LlmSelectionCandidate[];
}): Promise<LlmSelectionResult | null> {
  if (input.candidates.length === 0) return null;
  try {
    const response = await authFetchWithTransientRetry(
      reportsUrl("internal-companies/reports/select-report"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      },
    );
    if (!response?.ok) return null;
    return (await response.json()) as LlmSelectionResult;
  } catch (error) {
    console.error("LLM report selection failed:", error);
    return null;
  }
}

export const saveToRegistry = async (
  reports: SelectedReport[],
): Promise<SaveReportsListResponse> => {
  try {
    const response = await garboAuthFetch(
      reportsUrl("internal-companies/reports/save-reports"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reports),
      },
    );

    let responseBody: SaveReportsListResponse | { message?: string } | null =
      null;
    try {
      responseBody = (await response.json()) as SaveReportsListResponse;
    } catch {
      responseBody = null;
    }

    if (!response.ok) {
      if (
        (response.status === 409 || response.status === 500) &&
        responseBody &&
        "failed" in responseBody
      ) {
        return responseBody as SaveReportsListResponse;
      }
      const errorMsg = responseBody?.message
        ? responseBody.message
        : `Failed to save to registry: ${response.status} ${response.statusText}`;
      throw new Error(errorMsg);
    }

    if (responseBody) {
      return responseBody as SaveReportsListResponse;
    }

    throw new Error("Response does not match registry schema");
  } catch (error) {
    const msg = "Failed to save to registry";
    console.error(msg, error);
    throw error instanceof Error ? error : new Error(msg);
  }
};

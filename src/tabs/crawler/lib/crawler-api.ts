import { getUnearthApiBaseUrl } from "@/config/api-env";
import {
  CRAWL_UNREACHABLE_MESSAGE,
  SEARCH_REPORT_JOB_TIMEOUT_MESSAGE,
  type crawlerSearchQuery,
  type SaveReportsListResponse,
  type SelectedReport,
} from "./crawler-types";
import { garboAuthFetch } from "@/lib/garbo-auth-fetch";

/** Crawler uses Unearth API. Base follows VITE_UNEARTH_TARGET / VITE_API_MODE. */

const TRANSIENT_HTTP_STATUSES = new Set([500, 502, 503, 504]);
const TRANSIENT_FETCH_ATTEMPTS = 6;
/** Safety cap so a hung Firecrawl job cannot block a 100-company run forever. */
const SEARCH_REPORT_JOB_MAX_MS = 45 * 60 * 1000;
const SEARCH_REPORT_JOB_POLL_MS = 3000;
const SEARCH_REPORT_JOB_MAX_POLL_FAILURES = 5;
/** Other replica 404s are expected until Redis has the job; do not fail the company on the first miss. */
const SEARCH_REPORT_JOB_NOT_FOUND_GRACE_MS = 2 * 60 * 1000;
const SEARCH_REPORT_JOB_FATAL_CLIENT_STATUSES = new Set([400, 401, 403, 422]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function transientRetryDelayMs(attempt: number): number {
  return Math.min(12000, 500 * 2 ** (attempt - 1));
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException || error instanceof Error) &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

type TransientRetryOptions = {
  attempts?: number;
};

async function authFetchWithTransientRetry(
  url: string,
  init?: RequestInit,
  options?: TransientRetryOptions,
): Promise<Response | null> {
  const attempts = options?.attempts ?? TRANSIENT_FETCH_ATTEMPTS;
  let lastResponse: Response | null = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await garboAuthFetch(url, init);
      lastResponse = response;
      if (
        response.ok ||
        !TRANSIENT_HTTP_STATUSES.has(response.status) ||
        attempt === attempts
      ) {
        return response;
      }
    } catch (error) {
      if (isAbortError(error)) throw error;
      if (attempt === attempts) return lastResponse;
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
  const startResponse = await authFetchWithTransientRetry(
    reportsUrl("internal-companies/reports/search-report-jobs"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([searchQuery]),
    },
    { attempts: 2 },
  );

  if (!startResponse) {
    throw new Error(CRAWL_UNREACHABLE_MESSAGE);
  }

  if (startResponse.status !== 202 && !startResponse.ok) {
    console.error("Failed to start report search:", startResponse.statusText);
    throw new Error(
      `Failed to fetch report: ${startResponse.status} ${startResponse.statusText}`,
    );
  }

  const started = (await startResponse.json()) as {
    jobId?: string;
    status?: string;
  };
  const jobId = started.jobId?.trim();
  if (!jobId) {
    throw new Error("Reports API did not return a search job id");
  }

  const deadline = Date.now() + SEARCH_REPORT_JOB_MAX_MS;
  let consecutivePollFailures = 0;
  let notFoundSince: number | null = null;
  while (Date.now() < deadline) {
    await sleep(SEARCH_REPORT_JOB_POLL_MS);
    const pollResponse = await authFetchWithTransientRetry(
      reportsUrl(`internal-companies/reports/search-report-jobs/${jobId}`),
      { method: "GET" },
      { attempts: 2 },
    );
    if (!pollResponse) {
      consecutivePollFailures += 1;
      if (consecutivePollFailures >= SEARCH_REPORT_JOB_MAX_POLL_FAILURES) {
        throw new Error(CRAWL_UNREACHABLE_MESSAGE);
      }
      continue;
    }
    if (SEARCH_REPORT_JOB_FATAL_CLIENT_STATUSES.has(pollResponse.status)) {
      throw new Error(
        `Failed to fetch report: ${pollResponse.status} ${pollResponse.statusText}`,
      );
    }
    if (pollResponse.status === 404) {
      consecutivePollFailures = 0;
      if (notFoundSince == null) notFoundSince = Date.now();
      if (Date.now() - notFoundSince >= SEARCH_REPORT_JOB_NOT_FOUND_GRACE_MS) {
        throw new Error("Search job not found (404)");
      }
      continue;
    }
    if (!pollResponse.ok) {
      consecutivePollFailures += 1;
      if (consecutivePollFailures >= SEARCH_REPORT_JOB_MAX_POLL_FAILURES) {
        throw new Error(
          `Failed to fetch report: ${pollResponse.status} ${pollResponse.statusText}`,
        );
      }
      continue;
    }
    notFoundSince = null;
    consecutivePollFailures = 0;
    const job = (await pollResponse.json()) as {
      status?: string;
      results?: unknown;
      error?: string;
    };
    if (job.status === "done") {
      return job.results;
    }
    if (job.status === "error") {
      throw new Error(job.error?.trim() || "Report search job failed");
    }
  }

  throw new Error(SEARCH_REPORT_JOB_TIMEOUT_MESSAGE);
};

export const saveToRegistry = async (
  reports: SelectedReport[],
): Promise<SaveReportsListResponse> => {
  try {
    const response = await authFetchWithTransientRetry(
      reportsUrl("internal-companies/reports/save-reports"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reports),
      },
    );

    if (!response) {
      throw new Error(CRAWL_UNREACHABLE_MESSAGE);
    }

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

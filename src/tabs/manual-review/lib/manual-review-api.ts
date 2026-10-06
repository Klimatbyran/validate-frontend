import { garboAuthFetch, throwIfAuthError } from "@/lib/garbo-auth-fetch";
import { getUnearthApiBaseUrl } from "@/config/api-env";
import type { ManualReviewFlagKey } from "./flag-catalog";
import type {
  ManualReviewDismissal,
  ManualReviewDismissalsResponse,
  ManualReviewIssuesResponse,
  ManualReviewSummaryResponse,
} from "../types";

function reviewUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${getUnearthApiBaseUrl()}/pipeline/review${p}`;
}

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throwIfAuthError(res.status);
    const body = await res.text().catch(() => "");
    throw new Error(
      `Manual review request failed (${res.status})${body ? `: ${body.slice(0, 200)}` : ""}`,
    );
  }
  return res.json() as Promise<T>;
}

export async function fetchManualReviewSummary(): Promise<ManualReviewSummaryResponse> {
  const res = await garboAuthFetch(reviewUrl("/summary"));
  return readJson(res);
}

export async function fetchManualReviewIssues(options: {
  flagKey: ManualReviewFlagKey;
  q?: string;
  tags?: string[];
  includeDismissed?: boolean;
  offset?: number;
  limit?: number;
}): Promise<ManualReviewIssuesResponse> {
  const params = new URLSearchParams();
  if (options.q?.trim()) params.set("q", options.q.trim());
  if (options.tags?.length) params.set("tags", options.tags.join(","));
  if (options.includeDismissed) params.set("includeDismissed", "1");
  if (options.offset != null) params.set("offset", String(options.offset));
  if (options.limit != null) params.set("limit", String(options.limit));
  const qs = params.toString();
  const res = await garboAuthFetch(
    reviewUrl(
      `/issues/${encodeURIComponent(options.flagKey)}${qs ? `?${qs}` : ""}`,
    ),
  );
  return readJson(res);
}

export async function dismissManualReviewFlag(body: {
  companyId: string;
  flagKey: ManualReviewFlagKey;
  evidenceFingerprint: string;
  note?: string | null;
}): Promise<ManualReviewDismissal> {
  const res = await garboAuthFetch(reviewUrl("/dismissals"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return readJson(res);
}

export async function undoManualReviewDismissal(
  id: string,
): Promise<{ ok: boolean }> {
  const res = await garboAuthFetch(
    reviewUrl(`/dismissals/${encodeURIComponent(id)}`),
    { method: "DELETE" },
  );
  return readJson(res);
}

export async function fetchManualReviewDismissals(options?: {
  q?: string;
  flagKey?: ManualReviewFlagKey;
  offset?: number;
  limit?: number;
}): Promise<ManualReviewDismissalsResponse> {
  const params = new URLSearchParams();
  if (options?.q?.trim()) params.set("q", options.q.trim());
  if (options?.flagKey) params.set("flagKey", options.flagKey);
  if (options?.offset != null) params.set("offset", String(options.offset));
  if (options?.limit != null) params.set("limit", String(options.limit));
  const qs = params.toString();
  const res = await garboAuthFetch(
    reviewUrl(`/dismissals${qs ? `?${qs}` : ""}`),
  );
  return readJson(res);
}

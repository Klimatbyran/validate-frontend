/**
 * Pure helpers for saveToAPI queue jobs: chunk id from error text, payload summary for attempt UI.
 */

import type { QueueJob } from "@/lib/types";

export function extractGarboChunkFromSaveToApiJob(job: QueueJob): string | null {
  const pieces: string[] = [];
  if (typeof job.failedReason === "string") pieces.push(job.failedReason);
  if (Array.isArray(job.stacktrace)) pieces.push(job.stacktrace.join("\n"));
  if (job.returnvalue != null) {
    try {
      pieces.push(
        typeof job.returnvalue === "string"
          ? job.returnvalue
          : JSON.stringify(job.returnvalue),
      );
    } catch {
      // ignore
    }
  }

  const text = pieces.join("\n");

  // Prefer the structured error details we added in Garbo: details.garboChunk
  const m1 = text.match(/"garboChunk"\s*:\s*"([^"]+)"/);
  if (m1?.[1]) return m1[1];

  // Fallback: header echoed back by API error handler
  const m2 = text.match(/x-garbo-chunk["']?\s*[:=]\s*["']?([a-z0-9_-]+)["']?/i);
  if (m2?.[1]) return m2[1];

  return null;
}

export type SaveToApiJobPayloadSummary = {
  subEndpoint?: string;
  keys?: string;
  documentReportYear?: string;
  companyReportId?: string;
  error?: string;
};

function readOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : undefined;
}

export function summarizeSaveToApiPayload(job: QueueJob): SaveToApiJobPayloadSummary {
  const data = job.data as Record<string, unknown> | undefined;
  const subEndpoint =
    typeof data?.apiSubEndpoint === "string" ? data.apiSubEndpoint : undefined;

  let keys: string | undefined;
  const body = data?.body;
  let documentReportYear = readOptionalString(data?.documentReportYear);
  let companyReportId = readOptionalString(data?.companyReportId);
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const bodyRecord = body as Record<string, unknown>;
    const topKeys = Object.keys(bodyRecord).slice(0, 10);
    keys = topKeys.length ? topKeys.join(", ") : undefined;
    documentReportYear ??= readOptionalString(bodyRecord.documentReportYear);
    companyReportId ??= readOptionalString(bodyRecord.companyReportId);
  }

  const failedReason =
    typeof job.failedReason === "string" && job.failedReason.trim()
      ? job.failedReason.trim()
      : undefined;

  // Occasionally the error message is nested in returnvalue when bubbled up.
  const returnValueString =
    typeof job.returnvalue === "string" ? job.returnvalue : undefined;

  const error = failedReason || returnValueString;

  return {
    subEndpoint: subEndpoint || undefined,
    keys,
    documentReportYear,
    companyReportId,
    error,
  };
}

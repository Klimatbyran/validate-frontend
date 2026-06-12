import { authenticatedFetch } from "@/lib/api-helpers";
import type { RunOnlyWorkerId } from "@/lib/run-only-workers";
import { PARSE_PDF_API_ENDPOINT, PARSE_PDF_UPLOAD_ENDPOINT } from "./utils";

export class UploadApiError extends Error {
  status?: number;
  constructor(message: string, opts?: { status?: number }) {
    super(message);
    this.name = "UploadApiError";
    this.status = opts?.status;
  }
}

function parseErrorMessage(errorText: string): string {
  let message = errorText;
  try {
    const parsed = JSON.parse(errorText) as {
      error?: string;
      errors?: Array<{ url?: string; error?: string }>;
    };
    if (typeof parsed?.error === "string" && parsed.error.trim().length > 0) {
      message = parsed.error;
    }
    if (Array.isArray(parsed?.errors) && parsed.errors.length > 0) {
      const details = parsed.errors
        .map((e) =>
          e?.url && e?.error ? `${e.url}: ${e.error}` : (e?.error ?? ""),
        )
        .filter((s) => s.length > 0)
        .join("; ");
      if (details.length > 0 && !message.includes(details)) {
        message = `${message} — ${details}`;
      }
    }
  } catch {
    /* keep errorText as message */
  }
  return message;
}

export interface UploadPdfsOptions {
  files: File[];
  autoApprove: boolean;
  forceReindex: boolean;
  batchId?: string;
  runOnly?: RunOnlyWorkerId[];
  tags?: string[];
}

export type UploadPdfUploadMeta = {
  filename: string;
  publicUrl: string;
  bucket: string;
  key: string;
  sha256: string;
  reusedExisting: boolean;
  uploaded: boolean;
};

export type UploadPdfsResponse =
  | unknown[]
  | {
      jobs: unknown[];
      uploads: UploadPdfUploadMeta[];
    };

export function isUploadPdfsEnvelope(
  r: UploadPdfsResponse,
): r is { jobs: unknown[]; uploads: UploadPdfUploadMeta[] } {
  return (
    r !== null &&
    typeof r === "object" &&
    !Array.isArray(r) &&
    Array.isArray((r as { uploads?: unknown }).uploads)
  );
}

export type PdfCacheUrlError = { url: string; error: string };

export type CreateJobsFromUrlsResult =
  | unknown[]
  | {
      jobs: unknown[];
      cached?: unknown[];
      errors?: PdfCacheUrlError[];
    };

export interface CreateJobsFromUrlsOptions {
  urls: string[];
  autoApprove: boolean;
  forceReindex: boolean;
  batchId?: string;
  runOnly?: RunOnlyWorkerId[];
  tags?: string[];
  /** When true (default), pipeline-api fetches each URL and caches to S3 before enqueueing. Set false for local API without S3. */
  cachePdf?: boolean;
  /** Override parsePdf endpoint (e.g. fixed stage pipeline). */
  parsePdfEndpoint?: string;
}

export async function uploadPdfsToParsePdf({
  files,
  autoApprove,
  forceReindex,
  batchId,
  runOnly,
  tags,
}: UploadPdfsOptions): Promise<UploadPdfsResponse> {
  const formData = new FormData();
  for (const file of files) formData.append("files", file);
  formData.append("autoApprove", String(Boolean(autoApprove)));
  formData.append("forceReindex", String(Boolean(forceReindex)));
  formData.append("replaceAllEmissions", "true");
  if (batchId) formData.append("batchId", batchId);
  if (runOnly && runOnly.length > 0)
    formData.append("runOnly", JSON.stringify(runOnly));
  if (tags && tags.length > 0) formData.append("tags", JSON.stringify(tags));

  const response = await authenticatedFetch(PARSE_PDF_UPLOAD_ENDPOINT, {
    method: "POST",
    body: formData,
    // Do not set Content-Type; browser sets multipart boundary
  });

  if (!response.ok) {
    const errorText = await response.text();
    const message = parseErrorMessage(errorText);
    throw new UploadApiError(message, { status: response.status });
  }

  return response.json();
}

export async function createJobsFromUrls({
  urls,
  autoApprove,
  forceReindex,
  batchId,
  runOnly,
  tags,
  cachePdf = true,
  parsePdfEndpoint = PARSE_PDF_API_ENDPOINT,
}: CreateJobsFromUrlsOptions): Promise<CreateJobsFromUrlsResult> {
  const body = {
    autoApprove: Boolean(autoApprove),
    ...(batchId ? { batchId } : {}),
    forceReindex: Boolean(forceReindex),
    replaceAllEmissions: true,
    ...(runOnly && runOnly.length > 0 ? { runOnly } : {}),
    ...(tags && tags.length > 0 ? { tags } : {}),
    ...(cachePdf ? { cachePdf: true } : {}),
    urls,
  };

  const response = await authenticatedFetch(parsePdfEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const message = parseErrorMessage(errorText);
    throw new UploadApiError(message, { status: response.status });
  }

  return response.json() as Promise<CreateJobsFromUrlsResult>;
}

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
    const parsed = JSON.parse(errorText) as { error?: string };
    if (typeof parsed?.error === "string" && parsed.error.trim().length > 0) {
      message = parsed.error;
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

export interface CreateJobsFromUrlsOptions {
  urls: string[];
  autoApprove: boolean;
  forceReindex: boolean;
  batchId?: string;
  runOnly?: RunOnlyWorkerId[];
  tags?: string[];
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
  if (runOnly && runOnly.length > 0) formData.append("runOnly", JSON.stringify(runOnly));
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
}: CreateJobsFromUrlsOptions): Promise<unknown> {
  const body = {
    autoApprove: Boolean(autoApprove),
    ...(batchId ? { batchId } : {}),
    forceReindex: Boolean(forceReindex),
    replaceAllEmissions: true,
    ...(runOnly && runOnly.length > 0 ? { runOnly } : {}),
    ...(tags && tags.length > 0 ? { tags } : {}),
    urls,
  };

  const response = await authenticatedFetch(PARSE_PDF_API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const message = parseErrorMessage(errorText);
    throw new UploadApiError(message, { status: response.status });
  }

  return response.json();
}


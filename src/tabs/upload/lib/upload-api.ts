import { authenticatedFetch } from "@/lib/api-helpers";
import type { RunOnlyWorkerId } from "@/lib/run-only-workers";
import { PARSE_PDF_API_ENDPOINT, PARSE_PDF_UPLOAD_ENDPOINT } from "./utils";

export interface UploadPdfsOptions {
  files: File[];
  autoApprove: boolean;
  forceReindex: boolean;
  batchId?: string;
  runOnly?: RunOnlyWorkerId[];
  tags?: string[];
}

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
}: UploadPdfsOptions): Promise<Response> {
  const formData = new FormData();
  for (const file of files) formData.append("files", file);
  formData.append("autoApprove", String(Boolean(autoApprove)));
  formData.append("forceReindex", String(Boolean(forceReindex)));
  formData.append("replaceAllEmissions", "true");
  if (batchId) formData.append("batchId", batchId);
  if (runOnly && runOnly.length > 0) formData.append("runOnly", JSON.stringify(runOnly));
  if (tags && tags.length > 0) formData.append("tags", JSON.stringify(tags));

  return authenticatedFetch(PARSE_PDF_UPLOAD_ENDPOINT, {
    method: "POST",
    body: formData,
    // Do not set Content-Type; browser sets multipart boundary
  });
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
    console.error("Job submission error:", errorText);
    throw new Error(`Failed to add jobs: ${errorText}`);
  }

  return response.json();
}


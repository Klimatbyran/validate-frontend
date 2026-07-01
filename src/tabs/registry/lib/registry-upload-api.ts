import { chunkFilesBySize, mapWithConcurrency } from "@/lib/chunk-array";
import { getUnearthApiBaseUrl } from "@/config/api-env";
import { garboAuthFetch } from "@/lib/garbo-auth-fetch";
import type { UploadPdfUploadMeta } from "@/tabs/upload/lib/upload-api";
import {
  REGISTRY_UPLOAD_CHUNK_SIZE,
  REGISTRY_UPLOAD_CONCURRENCY,
  REGISTRY_UPLOAD_MAX_CHUNK_BYTES,
} from "./registry-bulk-limits";
import type { RegistryBulkProgress } from "./registry-types";

function registryUploadUrl(path: string): string {
  const base = getUnearthApiBaseUrl().replace(/\/+$/, "");
  const segment = path.replace(/^\//, "");
  return `${base}/${segment}`;
}

type UploadPdfsResponse = {
  uploads: UploadPdfUploadMeta[];
};

function isUploadPdfsResponse(body: unknown): body is UploadPdfsResponse {
  return (
    body !== null &&
    typeof body === "object" &&
    Array.isArray((body as UploadPdfsResponse).uploads)
  );
}

function parseUploadError(errorText: string): string {
  let message = errorText;
  try {
    const parsed = JSON.parse(errorText) as {
      error?: string;
      message?: string;
    };
    if (typeof parsed?.error === "string" && parsed.error.trim()) {
      message = parsed.error;
    } else if (typeof parsed?.message === "string" && parsed.message.trim()) {
      message = parsed.message;
    }
  } catch {
    /* keep errorText */
  }
  return message;
}

async function uploadRegistryPdfChunk(
  files: File[],
): Promise<UploadPdfUploadMeta[]> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  const response = await garboAuthFetch(
    registryUploadUrl("internal-companies/reports/upload-pdfs"),
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(parseUploadError(errorText));
  }

  const body = await response.json();
  if (!isUploadPdfsResponse(body)) {
    throw new Error("Unexpected upload response from server");
  }

  return body.uploads;
}

/**
 * Upload PDFs to object storage via Unearth API (storage only, no pipeline jobs).
 * Large drops are split into multipart chunks with limited parallel requests.
 */
export async function uploadRegistryPdfs(
  files: File[],
  onProgress?: (progress: RegistryBulkProgress) => void,
): Promise<UploadPdfUploadMeta[]> {
  if (files.length === 0) return [];

  const chunks = chunkFilesBySize(
    files,
    REGISTRY_UPLOAD_CHUNK_SIZE,
    REGISTRY_UPLOAD_MAX_CHUNK_BYTES,
  );

  onProgress?.({ phase: "upload", completed: 0, total: files.length });

  let uploadedCount = 0;

  const chunkResults = await mapWithConcurrency(
    chunks,
    REGISTRY_UPLOAD_CONCURRENCY,
    async (chunk) => {
      const uploads = await uploadRegistryPdfChunk(chunk);
      uploadedCount += chunk.length;
      onProgress?.({
        phase: "upload",
        completed: uploadedCount,
        total: files.length,
      });
      return uploads;
    },
  );

  return chunkResults.flat();
}

/** Upload a single PDF to object storage (registry edit, etc.). */
export async function uploadRegistryPdf(
  file: File,
): Promise<UploadPdfUploadMeta> {
  const [upload] = await uploadRegistryPdfs([file]);
  if (!upload) {
    throw new Error("No upload returned from server");
  }
  return upload;
}

export type RegistryPdfUploadFormFields = {
  url: string;
  s3Url: string;
  s3Key: string;
  s3Bucket: string;
  sha256: string;
};

/** Map upload response onto registry edit form fields. */
export function applyRegistryPdfUploadToForm(
  upload: UploadPdfUploadMeta,
  currentUrl: string,
): RegistryPdfUploadFormFields {
  const s3Url = upload.publicUrl;
  return {
    s3Url,
    s3Key: upload.key,
    s3Bucket: upload.bucket,
    sha256: upload.sha256,
    url: currentUrl.trim() ? currentUrl : s3Url,
  };
}

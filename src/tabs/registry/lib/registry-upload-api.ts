import { getUnearthApiBaseUrl } from "@/config/api-env";
import { garboAuthFetch } from "@/lib/garbo-auth-fetch";
import type { UploadPdfUploadMeta } from "@/tabs/upload/lib/upload-api";

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

/**
 * Upload PDFs to object storage via Unearth API (storage only, no pipeline jobs).
 */
export async function uploadRegistryPdfs(
  files: File[],
): Promise<UploadPdfUploadMeta[]> {
  if (files.length === 0) return [];

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

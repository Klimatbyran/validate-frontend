import { getUnearthApiBaseUrl, getPipelineUrl } from "@/config/api-env";
import { authenticatedFetch } from "@/lib/api-helpers";
import { garboAuthFetch, throwIfAuthError } from "@/lib/garbo-auth-fetch";
import type {
  RegistryEntry,
  RegistryEntryUpdate,
  RegistryNewEntry,
  RegistryBulkFileAddInput,
} from "./registry-types";
import { filterRegistryEntries } from "./registry-utils";
import { uploadRegistryPdfs } from "./registry-upload-api";

import type { RunReportsPipelineConfig } from "@/hooks/useRunReportsPipeline";

const REGISTRY_BATCHES_LIMIT = 500;

function registryUrl(path: string): string {
  const base = getUnearthApiBaseUrl().replace(/\/+$/, "");
  const segment = path.replace(/^\//, "");
  return `${base}/${segment}`;
}

/** Run-reports modal uses Unearth registry batches (not Garbo queue-archive). */
export function getRegistryRunReportsPipelineConfig(): RunReportsPipelineConfig {
  return {
    batchesListUrl: registryUrl(
      `reports/registry/batches?limit=${REGISTRY_BATCHES_LIMIT}`,
    ),
    batchesApiUrl: registryUrl("reports/registry/batches"),
  };
}

export const fetchRegistryList = async () => {
  const url = registryUrl("reports/registry");
  try {
    const response = await garboAuthFetch(url, { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      throwIfAuthError(response.status);
      const msg = `Failed to fetch registry: ${response.status} ${response.statusText} (${url})`;
      console.error(msg);
      throw new Error(msg);
    }
  } catch (error) {
    const msg = `Failed to fetch company names (${url})`;
    console.error(msg, error);
    throw error instanceof Error ? error : new Error(msg);
  }
};

export async function fetchRegistryBatches() {
  const url = registryUrl(
    `reports/registry/batches?limit=${REGISTRY_BATCHES_LIMIT}`,
  );
  const response = await garboAuthFetch(url, { cache: "no-store" });
  if (!response.ok) {
    throwIfAuthError(response.status);
    throw new Error(`Failed to fetch registry batches: ${response.status}`);
  }
  const data = (await response.json()) as {
    batches?: { id: string; batchName: string }[];
  };
  return Array.isArray(data.batches) ? data.batches : [];
}

export async function searchRegistryEntries(
  query: string,
): Promise<RegistryEntry[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  //Swap to actual API call when available.
  const url = registryUrl(
    `registry/search?query=${encodeURIComponent(trimmedQuery)}`,
  );

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Registry search failed with status ${response.status}`);
    }

    const entries = (await response.json()) as RegistryEntry[];
    return filterRegistryEntries(entries, trimmedQuery);
  } catch (error) {
    console.warn("Registry API unavailable. ", error);
    return [];
  }
}

export const deleteReportFromRegistry = async (reportIds: string[]) => {
  if (!reportIds.length) {
    return true;
  }

  try {
    const response = await garboAuthFetch(registryUrl("reports/registry"), {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(reportIds.map((id) => ({ id }))),
    });

    if (!response.ok) {
      const errorMsg = `Failed to delete report: ${response.status} ${response.statusText}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    } else {
      return true;
    }
  } catch (error) {
    const msg = `Failed to delete reports with IDs ${reportIds.join(", ")}`;
    console.error(msg, error);
    throw error instanceof Error ? error : new Error(msg);
  }
};

type PdfCacheResult = {
  publicUrl: string;
  key: string;
  bucket: string;
  sha256: string;
};

async function cachePdfToS3(sourceUrl: string): Promise<PdfCacheResult | null> {
  try {
    const response = await authenticatedFetch(getPipelineUrl("cache-pdf"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: sourceUrl }),
    });
    if (!response.ok) return null;
    return (await response.json()) as PdfCacheResult;
  } catch {
    return null;
  }
}

async function saveRegistryPayloads(
  payloads: RegistryNewEntry[],
): Promise<{ saved: RegistryEntry[]; partialFailure?: string }> {
  const url = registryUrl("internal-companies/reports/save-reports");
  const response = await garboAuthFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payloads),
  });

  let body: {
    successes?: RegistryEntry[];
    failed?: unknown[];
    message?: string;
  } | null = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  const saved = body?.successes ?? [];

  if (!response.ok) {
    if (saved.length > 0) {
      return {
        saved,
        partialFailure:
          body?.message ??
          `Some registry entries could not be saved (${body?.failed?.length ?? 0} failed).`,
      };
    }
    const errorMsg =
      body?.message ??
      `Failed to add registry entries: ${response.status} ${response.statusText}`;
    throw new Error(errorMsg);
  }

  if (saved.length === 0) {
    throw new Error("No entries returned from server");
  }
  return { saved };
}

export const addRegistryEntries = async (
  entries: RegistryNewEntry[],
): Promise<RegistryEntry[]> => {
  if (entries.length === 0) {
    throw new Error("At least one registry entry is required");
  }

  const payloads = await Promise.all(
    entries.map(async (entry) => {
      const cache = entry.s3Url ? null : await cachePdfToS3(entry.url);
      return {
        ...entry,
        ...(cache && {
          s3Url: cache.publicUrl,
          s3Key: cache.key,
          s3Bucket: cache.bucket,
          sha256: cache.sha256,
        }),
      };
    }),
  );

  try {
    const { saved, partialFailure } = await saveRegistryPayloads(payloads);
    if (partialFailure) {
      const err = new Error(partialFailure) as Error & {
        partialSuccess?: RegistryEntry[];
      };
      err.partialSuccess = saved;
      throw err;
    }
    return saved;
  } catch (error) {
    console.error("Failed to add registry entries", error);
    throw error instanceof Error ? error : new Error(String(error));
  }
};

export const addRegistryEntry = async (
  entry: RegistryNewEntry,
): Promise<RegistryEntry> => {
  const [saved] = await addRegistryEntries([entry]);
  return saved;
};

export const addRegistryEntriesFromFiles = async (
  input: RegistryBulkFileAddInput,
): Promise<RegistryEntry[]> => {
  const uploads = await uploadRegistryPdfs(input.files);
  if (uploads.length === 0) {
    throw new Error("No PDF files to add");
  }

  const entries: RegistryNewEntry[] = uploads.map((upload) => ({
    url: upload.publicUrl,
    s3Url: upload.publicUrl,
    s3Key: upload.key,
    s3Bucket: upload.bucket,
    sha256: upload.sha256,
    companyName: input.companyName?.trim() || "Unknown",
    ...(input.wikidataId?.trim()
      ? { wikidataId: input.wikidataId.trim() }
      : {}),
    ...(input.reportYear?.trim()
      ? { reportYear: input.reportYear.trim() }
      : {}),
    ...(input.sourceUrl?.trim() ? { sourceUrl: input.sourceUrl.trim() } : {}),
    ...(input.batchId ? { batchId: input.batchId } : {}),
  }));

  return addRegistryEntries(entries);
};

export const editRegistryEntry = async (entry: RegistryEntryUpdate) => {
  try {
    const response = await garboAuthFetch(registryUrl("reports/registry"), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(entry),
    });

    if (!response.ok) {
      let message = `Failed to edit registry entry: ${response.status} ${response.statusText}`;
      try {
        const body = (await response.json()) as { message?: string };
        if (body.message) message = body.message;
      } catch {
        // ignore non-JSON error bodies
      }
      console.error(message);
      throw new Error(message);
    }
    const updatedEntry = (await response.json()) as RegistryEntry;
    return updatedEntry;
  } catch (error) {
    const msg = `Failed to edit registry entry with ID ${entry.id}`;
    console.error(msg, error);
    throw error instanceof Error ? error : new Error(msg);
  }
};

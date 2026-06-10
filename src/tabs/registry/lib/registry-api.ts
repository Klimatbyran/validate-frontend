import { getUnearthApiBaseUrl, getPipelineUrl } from "@/config/api-env";
import { authenticatedFetch } from "@/lib/api-helpers";
import { garboAuthFetch, throwIfAuthError } from "@/lib/garbo-auth-fetch";
import type {
  RegistryEntry,
  RegistryEntryUpdate,
  RegistryNewEntry,
} from "./registry-types";
import { filterRegistryEntries } from "./registry-utils";

function registryUrl(path: string): string {
  const base = getUnearthApiBaseUrl().replace(/\/+$/, "");
  const segment = path.replace(/^\//, "");
  return `${base}/${segment}`;
}

export const fetchRegistryList = async () => {
  const url = registryUrl("reports/registry");
  try {
    const response = await garboAuthFetch(url);
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

export const addRegistryEntry = async (
  entry: RegistryNewEntry,
): Promise<RegistryEntry> => {
  const cache = await cachePdfToS3(entry.url);

  const payload: RegistryNewEntry = {
    ...entry,
    ...(cache && {
      s3Url: cache.publicUrl,
      s3Key: cache.key,
      s3Bucket: cache.bucket,
      sha256: cache.sha256,
    }),
  };

  const url = registryUrl("internal-companies/reports/save-reports");
  try {
    const response = await garboAuthFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify([payload]),
    });

    let body: { successes?: RegistryEntry[]; message?: string } | null = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok) {
      const errorMsg =
        body?.message ??
        `Failed to add registry entry: ${response.status} ${response.statusText}`;
      throw new Error(errorMsg);
    }

    const saved = body?.successes?.[0];
    if (!saved) throw new Error("No entry returned from server");
    return saved;
  } catch (error) {
    const msg = `Failed to add registry entry for URL ${entry.url}`;
    console.error(msg, error);
    throw error instanceof Error ? error : new Error(msg);
  }
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

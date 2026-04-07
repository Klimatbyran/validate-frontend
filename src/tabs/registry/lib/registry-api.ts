import { getGarboApiBaseUrl } from "@/config/api-env";
import { garboAuthFetch } from "@/lib/garbo-auth-fetch";
import type { RegistryEntry, RegistryEntryUpdate } from "./registry-types";
import { filterRegistryEntries } from "./registry-utils";

function registryUrl(path: string): string {
  const base = getGarboApiBaseUrl().replace(/\/+$/, "");
  const segment = path.replace(/^\//, "");
  return `${base}/${segment}`;
}

export const fetchRegistryList = async () => {
  const url = registryUrl("reports/registry");
  try {
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
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
      const errorMsg = `Failed to edit registry entry: ${response.status} ${response.statusText}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    const updatedEntry = (await response.json()) as RegistryEntry;
    return updatedEntry;
  } catch (error) {
    const msg = `Failed to edit registry entry with ID ${entry.id}`;
    console.error(msg, error);
    throw error instanceof Error ? error : new Error(msg);
  }
};

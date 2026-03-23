import { getGarboApiBaseUrl } from "@/config/api-env";
import type { RegistryEntry } from "./registry-types";
import { filterRegistryEntries } from "./registry-utils";

function registryUrl(path: string): string {
  const base = getGarboApiBaseUrl().replace(/\/+$/, "");
  const segment = path.replace(/^\//, "");
  return `${base}/${segment}`;
}

export const fetchRegistryList = async () => {
  const url = registryUrl("registry");
  try {
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      console.log(data);
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

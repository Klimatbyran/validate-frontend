import { getGarboApiBaseUrl } from "@/config/api-env";
import type { RegistryEntry } from "./registry-types";
import { filterRegistryEntries } from "./registry-utils";

function registryUrl(path: string): string {
  const base = getGarboApiBaseUrl().replace(/\/+$/, "");
  const segment = path.replace(/^\//, "");
  return `${base}/${segment}`;
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

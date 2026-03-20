import type { RegistryEntry, RegistryStats } from "./registry-types";

export function filterRegistryEntries(
  entries: RegistryEntry[],
  query: string,
): RegistryEntry[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return entries;
  }

  return entries.filter((entry) => {
    return (
      entry.companyName.toLowerCase().includes(normalizedQuery) ||
      (entry.wikidataId?.toLowerCase().includes(normalizedQuery) ?? false) ||
      entry.reportYear.includes(normalizedQuery) ||
      entry.url.toLowerCase().includes(normalizedQuery)
    );
  });
}

export function buildRegistryStats(entries: RegistryEntry[]): RegistryStats {
  return {
    total: entries.length,
  };
}

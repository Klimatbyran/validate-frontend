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
      entry.companyName?.toLowerCase().includes(normalizedQuery) ||
      (entry.wikidataId?.toLowerCase().includes(normalizedQuery) ?? false) ||
      entry.reportYear?.includes(normalizedQuery) ||
      entry.url.toLowerCase().includes(normalizedQuery)
    );
  });
}

export function buildRegistryStats(entries: RegistryEntry[]): RegistryStats {
  return {
    total: entries.length,
  };
}

export function writeRegistryEntriesToCsv(entries: RegistryEntry[]): void {
  if (!entries.length) {
    return;
  }

  const escapeCsvValue = (value: string) => {
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const header = ["companyName", "wikidataId", "reportYear", "url"]
    .map(escapeCsvValue)
    .join(";");

  const rows = entries.map((entry) =>
    [
      escapeCsvValue(entry.companyName ?? ""),
      escapeCsvValue(entry.wikidataId ?? ""),
      escapeCsvValue(entry.reportYear ?? ""),
      escapeCsvValue(entry.url),
    ].join(";"),
  );

  const csvContent = `\ufeff${[header, ...rows].join("\r\n")}`;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.setAttribute("href", url);
  link.setAttribute("download", `registry_entries_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

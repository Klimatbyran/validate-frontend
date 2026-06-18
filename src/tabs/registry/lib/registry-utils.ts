import type { RegistryEntry, RegistryStats } from "./registry-types";

export function isValidHttpUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  try {
    const u = new URL(trimmed);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidOptionalHttpUrl(raw: string): boolean {
  if (!raw.trim()) return true;
  return isValidHttpUrl(raw);
}

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
      entry.url.toLowerCase().includes(normalizedQuery) ||
      (entry.sourceUrl?.toLowerCase().includes(normalizedQuery) ?? false) ||
      (entry.s3Url?.toLowerCase().includes(normalizedQuery) ?? false)
    );
  });
}

export function buildRegistryStats(entries: RegistryEntry[]): RegistryStats {
  const companyKeys = new Set(
    entries
      .map((e) => (e.wikidataId ?? e.companyName ?? "").trim())
      .filter(Boolean),
  );
  return {
    uniqueCompanies: companyKeys.size,
    totalReports: entries.length,
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

  const header = [
    "companyName",
    "wikidataId",
    "reportYear",
    "url",
    "sourceUrl",
    "s3Url",
  ]
    .map(escapeCsvValue)
    .join(";");

  const rows = entries.map((entry) =>
    [
      escapeCsvValue(entry.companyName ?? ""),
      escapeCsvValue(entry.wikidataId ?? ""),
      escapeCsvValue(entry.reportYear ?? ""),
      escapeCsvValue(entry.url),
      escapeCsvValue(entry.sourceUrl ?? ""),
      escapeCsvValue(entry.s3Url ?? ""),
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

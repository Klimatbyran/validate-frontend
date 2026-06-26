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

/** Split pasted Excel lists (one company per line or tab-separated). */
export function parseRegistrySearchTerms(query: string): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const part of query.split(/[\r\n\t]+/)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    terms.push(trimmed);
  }
  return terms;
}

function registryEntryKey(entry: RegistryEntry): string {
  return entry.id ?? entry.wikidataId ?? entry.url;
}

export function registryEntryMatchesSearchTerm(
  entry: RegistryEntry,
  term: string,
): boolean {
  const normalizedTerm = term.trim().toLowerCase();
  if (!normalizedTerm) return false;
  return (
    entry.companyName?.toLowerCase().includes(normalizedTerm) ||
    (entry.wikidataId?.toLowerCase().includes(normalizedTerm) ?? false) ||
    (entry.reportYear?.includes(normalizedTerm) ?? false) ||
    entry.url.toLowerCase().includes(normalizedTerm) ||
    (entry.sourceUrl?.toLowerCase().includes(normalizedTerm) ?? false) ||
    (entry.s3Url?.toLowerCase().includes(normalizedTerm) ?? false)
  );
}

export function filterRegistryEntries(
  entries: RegistryEntry[],
  query: string,
): RegistryEntry[] {
  const terms = parseRegistrySearchTerms(query);
  if (terms.length === 0) {
    return entries;
  }

  if (terms.length === 1) {
    return entries.filter((entry) =>
      registryEntryMatchesSearchTerm(entry, terms[0]!),
    );
  }

  const matched = new Map<string, RegistryEntry>();
  for (const term of terms) {
    for (const entry of entries) {
      if (registryEntryMatchesSearchTerm(entry, term)) {
        matched.set(registryEntryKey(entry), entry);
      }
    }
  }
  return [...matched.values()];
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

import type { RegistryEntry } from "./registry-types";

/** Report rows have no `createdAt` in Garbo yet; `id` order is a rough proxy for insertion order. */
export type RegistrySortKey =
  | "companyNameAsc"
  | "companyNameDesc"
  | "reportYearDesc"
  | "reportYearAsc"
  | "registryIdDesc"
  | "registryIdAsc";

export type ReportYearFilterValue = "all" | "missing" | string;

export type RegistryBatchFilterValue = "all" | "missing" | string;

export type WikidataPresenceFilter = "all" | "present" | "missing";

/** Tag filters use Garbo company list (`wikidataId` → `tags`). */
export type RegistryTagFilterMode =
  | "ignore"
  | "no_tags_in_garbo"
  | "has_any_of";

/** Single object for registry table filters + sort (keeps tab state readable). */
export interface RegistryViewFilters {
  year: ReportYearFilterValue;
  batch: RegistryBatchFilterValue;
  wikidata: WikidataPresenceFilter;
  tagMode: RegistryTagFilterMode;
  tagSlugs: string[];
  sort: RegistrySortKey;
}

export function defaultRegistryViewFilters(): RegistryViewFilters {
  return {
    year: "all",
    batch: "all",
    wikidata: "all",
    tagMode: "ignore",
    tagSlugs: [],
    sort: "companyNameAsc",
  };
}

export function mergeRegistryViewFilters(
  prev: RegistryViewFilters,
  patch: Partial<RegistryViewFilters>,
): RegistryViewFilters {
  const next = { ...prev, ...patch };
  if (patch.tagMode !== undefined && patch.tagMode !== "has_any_of") {
    next.tagSlugs = [];
  }
  return next;
}

export function isWikidataIdPresent(
  wikidataId: string | null | undefined,
): boolean {
  return typeof wikidataId === "string" && /^Q\d+$/i.test(wikidataId.trim());
}

export function collectDistinctReportYears(entries: RegistryEntry[]): string[] {
  const set = new Set<string>();
  for (const e of entries) {
    const y = e.reportYear?.trim();
    if (y && /^\d{4}$/.test(y)) set.add(y);
  }
  return [...set].sort((a, b) => Number(b) - Number(a));
}

function companyNameForSort(entry: RegistryEntry): string {
  return (entry.companyName ?? "").trim().toLowerCase();
}

function idTiebreak(a: RegistryEntry, b: RegistryEntry): number {
  const ia = a.id ?? "";
  const ib = b.id ?? "";
  return ia.localeCompare(ib);
}

function compareReportYear(
  a: RegistryEntry,
  b: RegistryEntry,
  dir: "asc" | "desc",
): number {
  const na = Number((a.reportYear ?? "").trim());
  const nb = Number((b.reportYear ?? "").trim());
  const aOk =
    Number.isFinite(na) && /^\d{4}$/.test((a.reportYear ?? "").trim());
  const bOk =
    Number.isFinite(nb) && /^\d{4}$/.test((b.reportYear ?? "").trim());
  if (!aOk && !bOk) return idTiebreak(a, b);
  if (!aOk) return dir === "asc" ? 1 : -1;
  if (!bOk) return dir === "asc" ? -1 : 1;
  const cmp = dir === "asc" ? na - nb : nb - na;
  return cmp !== 0 ? cmp : idTiebreak(a, b);
}

export function sortRegistryEntries(
  entries: RegistryEntry[],
  sort: RegistrySortKey,
): RegistryEntry[] {
  const copy = [...entries];
  switch (sort) {
    case "companyNameAsc":
      return copy.sort(
        (a, b) =>
          companyNameForSort(a).localeCompare(
            companyNameForSort(b),
            undefined,
            {
              sensitivity: "base",
            },
          ) || idTiebreak(a, b),
      );
    case "companyNameDesc":
      return copy.sort(
        (a, b) =>
          companyNameForSort(b).localeCompare(
            companyNameForSort(a),
            undefined,
            {
              sensitivity: "base",
            },
          ) || idTiebreak(a, b),
      );
    case "reportYearAsc":
      return copy.sort((a, b) => compareReportYear(a, b, "asc"));
    case "reportYearDesc":
      return copy.sort((a, b) => compareReportYear(a, b, "desc"));
    case "registryIdAsc":
      return copy.sort((a, b) => idTiebreak(a, b));
    case "registryIdDesc":
      return copy.sort((a, b) => idTiebreak(b, a));
    default:
      return copy;
  }
}

export function applyRegistryTableFilters(
  entries: RegistryEntry[],
  opts: {
    reportYear: ReportYearFilterValue;
    batch: RegistryBatchFilterValue;
    wikidata: WikidataPresenceFilter;
    tagMode: RegistryTagFilterMode;
    tagSlugs: string[];
    wikidataToTags: Record<string, string[]> | null;
  },
): RegistryEntry[] {
  return entries.filter((e) => {
    if (opts.reportYear === "missing") {
      if ((e.reportYear ?? "").trim()) return false;
    } else if (opts.reportYear !== "all") {
      if ((e.reportYear ?? "").trim() !== opts.reportYear) return false;
    }

    if (opts.batch === "missing") {
      if ((e.batchId ?? "").trim()) return false;
    } else if (opts.batch !== "all") {
      if ((e.batchId ?? "").trim() !== opts.batch) return false;
    }

    if (opts.wikidata === "present" && !isWikidataIdPresent(e.wikidataId)) {
      return false;
    }
    if (opts.wikidata === "missing" && isWikidataIdPresent(e.wikidataId)) {
      return false;
    }

    if (opts.tagMode === "no_tags_in_garbo") {
      const q = e.wikidataId?.trim();
      if (!isWikidataIdPresent(q)) return false;
      const m = opts.wikidataToTags;
      if (!m || !q || !(q in m)) return false;
      if ((m[q] ?? []).length > 0) return false;
    }

    if (opts.tagMode === "has_any_of") {
      const slugs = opts.tagSlugs.filter(Boolean);
      if (slugs.length === 0) return true;
      const q = e.wikidataId?.trim();
      if (!isWikidataIdPresent(q)) return false;
      const m = opts.wikidataToTags;
      if (!m || !q || !(q in m)) return false;
      const tags = new Set((m[q] ?? []).map((x) => x.toLowerCase()));
      return slugs.some((s) => tags.has(s.trim().toLowerCase()));
    }

    return true;
  });
}

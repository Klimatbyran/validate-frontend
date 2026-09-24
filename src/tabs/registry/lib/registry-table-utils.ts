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

export type RegistryReportTypeFilterValue = "all" | "missing" | string;

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
  reportType: RegistryReportTypeFilterValue;
  wikidata: WikidataPresenceFilter;
  tagMode: RegistryTagFilterMode;
  tagSlugs: string[];
  sort: RegistrySortKey;
}

export function defaultRegistryViewFilters(): RegistryViewFilters {
  return {
    year: "all",
    batch: "all",
    reportType: "all",
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

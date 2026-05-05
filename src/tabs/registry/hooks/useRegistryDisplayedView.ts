import { useMemo } from "react";
import type { RegistryEntry } from "../lib/registry-types";
import { buildRegistryStats, filterRegistryEntries } from "../lib/registry-utils";
import {
  applyRegistryTableFilters,
  collectDistinctReportYears,
  sortRegistryEntries,
  type RegistryViewFilters,
} from "../lib/registry-table-utils";

export function useRegistryDisplayedView(
  registry: RegistryEntry[],
  query: string,
  filters: RegistryViewFilters,
  wikidataToTags: Record<string, string[]> | null,
): {
  displayedRegistry: RegistryEntry[];
  distinctReportYears: string[];
  hasStructuredFilters: boolean;
  stats: ReturnType<typeof buildRegistryStats>;
} {
  return useMemo(() => {
    const textFiltered = filterRegistryEntries(registry, query);
    const distinctReportYears = collectDistinctReportYears(registry);
    const tableFiltered = applyRegistryTableFilters(textFiltered, {
      reportYear: filters.year,
      wikidata: filters.wikidata,
      tagMode: filters.tagMode,
      tagSlugs: filters.tagSlugs,
      wikidataToTags,
    });
    const displayedRegistry = sortRegistryEntries(tableFiltered, filters.sort);
    const hasStructuredFilters =
      filters.year !== "all" ||
      filters.wikidata !== "all" ||
      filters.tagMode !== "ignore";
    const stats = buildRegistryStats(displayedRegistry);
    return {
      displayedRegistry,
      distinctReportYears,
      hasStructuredFilters,
      stats,
    };
  }, [registry, query, filters, wikidataToTags]);
}

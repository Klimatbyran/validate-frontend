import { useCallback, useEffect, useMemo, useState } from "react";
import type { RegistryEntry, RegistryStats } from "../lib/registry-types";
import {
  fetchRegistryPage,
  searchRegistryPage,
  type RegistryBrowseParams,
  REGISTRY_PAGE_SIZE,
} from "../lib/registry-api";
import { parseRegistrySearchTerms } from "../lib/registry-utils";
import {
  isWikidataIdPresent,
  type RegistryViewFilters,
} from "../lib/registry-table-utils";
import { ApiAuthError } from "@/lib/garbo-auth-fetch";

export type RegistryPageMeta = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type UseRegistryDataOptions = {
  page: number;
  query: string;
  filters: RegistryViewFilters;
  wikidataToTags: Record<string, string[]> | null;
  companyTagsLoading: boolean;
};

function wikidataIdsForTagFilter(
  tagMode: RegistryViewFilters["tagMode"],
  tagSlugs: string[],
  wikidataToTags: Record<string, string[]> | null,
): string[] | undefined {
  if (!wikidataToTags || tagMode === "ignore") return undefined;

  const ids: string[] = [];
  for (const [qid, tags] of Object.entries(wikidataToTags)) {
    if (!isWikidataIdPresent(qid)) continue;
    if (tagMode === "no_tags_in_garbo" && tags.length === 0) {
      ids.push(qid);
    } else if (tagMode === "has_any_of") {
      const slugs = new Set(tagSlugs.map((s) => s.trim().toLowerCase()));
      if (tags.some((tag) => slugs.has(tag.toLowerCase()))) {
        ids.push(qid);
      }
    }
  }
  return ids;
}

function browseParamsFromFilters(
  filters: RegistryViewFilters,
  wikidataToTags: Record<string, string[]> | null,
): RegistryBrowseParams {
  const tagWikidataIds = wikidataIdsForTagFilter(
    filters.tagMode,
    filters.tagSlugs,
    wikidataToTags,
  );

  return {
    reportYear: filters.year,
    batchId: filters.batch,
    wikidata: filters.wikidata,
    sort: filters.sort,
    ...(tagWikidataIds ? { wikidataIds: tagWikidataIds } : {}),
  };
}

export function useRegistryData({
  page,
  query,
  filters,
  wikidataToTags,
  companyTagsLoading,
}: UseRegistryDataOptions) {
  const [rows, setRows] = useState<RegistryEntry[]>([]);
  const [meta, setMeta] = useState<RegistryPageMeta>({
    total: 0,
    page: 1,
    pageSize: REGISTRY_PAGE_SIZE,
    totalPages: 1,
  });
  const [reportYears, setReportYears] = useState<string[]>([]);
  const [stats, setStats] = useState<RegistryStats>({
    uniqueCompanies: 0,
    totalReports: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAuthError, setIsAuthError] = useState(false);

  const searchTerms = useMemo(() => parseRegistrySearchTerms(query), [query]);
  const isSearchMode = searchTerms.length > 0;

  const browseParams = useMemo(
    () => browseParamsFromFilters(filters, wikidataToTags),
    [filters, wikidataToTags],
  );

  const tagFilterBlocksFetch =
    (filters.tagMode === "has_any_of" && filters.tagSlugs.length > 0) ||
    filters.tagMode === "no_tags_in_garbo"
      ? companyTagsLoading || !wikidataToTags
      : false;

  const tagFilterHasNoMatches =
    !companyTagsLoading &&
    wikidataToTags != null &&
    ((filters.tagMode === "has_any_of" &&
      filters.tagSlugs.length > 0 &&
      (browseParams.wikidataIds?.length ?? 0) === 0) ||
      (filters.tagMode === "no_tags_in_garbo" &&
        (browseParams.wikidataIds?.length ?? 0) === 0));

  const load = useCallback(async () => {
    if (tagFilterBlocksFetch) {
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    setIsAuthError(false);

    if (tagFilterHasNoMatches) {
      setRows([]);
      setMeta({
        total: 0,
        page: 1,
        pageSize: REGISTRY_PAGE_SIZE,
        totalPages: 1,
      });
      setReportYears([]);
      setStats({ uniqueCompanies: 0, totalReports: 0 });
      setIsLoading(false);
      return;
    }

    try {
      const response = isSearchMode
        ? await searchRegistryPage(
            searchTerms,
            page,
            REGISTRY_PAGE_SIZE,
            browseParams,
          )
        : await fetchRegistryPage(page, REGISTRY_PAGE_SIZE, browseParams);

      setRows(response.rows);
      setMeta({
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
        totalPages: response.totalPages,
      });
      setReportYears(response.reportYears);
      setStats({
        totalReports: response.stats.totalReports,
        uniqueCompanies: response.stats.uniqueCompanies ?? 0,
      });
    } catch (error) {
      console.error("Failed to load registry page", error);
      setRows([]);
      setMeta({
        total: 0,
        page: 1,
        pageSize: REGISTRY_PAGE_SIZE,
        totalPages: 1,
      });
      setReportYears([]);
      setStats({ uniqueCompanies: 0, totalReports: 0 });
      if (error instanceof ApiAuthError) {
        setIsAuthError(true);
      } else {
        setLoadError(error instanceof Error ? error.message : "Unknown error");
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    browseParams,
    isSearchMode,
    page,
    searchTerms,
    tagFilterBlocksFetch,
    tagFilterHasNoMatches,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasStructuredFilters =
    filters.year !== "all" ||
    filters.batch !== "all" ||
    filters.wikidata !== "all" ||
    filters.tagMode !== "ignore";

  return {
    rows,
    meta,
    reportYears,
    stats,
    isLoading: isLoading || tagFilterBlocksFetch,
    loadError,
    isAuthError,
    isSearchMode,
    hasStructuredFilters,
    refresh: load,
  };
}

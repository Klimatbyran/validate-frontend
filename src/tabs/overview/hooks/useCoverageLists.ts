import { useCallback, useEffect, useRef, useState } from "react";
import {
  addCoverageListYear,
  COVERAGE_PAGE_SIZE,
  createCoverageList,
  deleteCoverageList,
  deleteCoverageListYear,
  fetchCoverageLists,
  fetchCoverageYearDetail,
  refreshCoverageYearRegistry,
  renameCoverageList,
  replaceCoverageYearNames,
  setCoverageEntryMatch,
} from "../lib/coverage-api";
import type {
  CoverageEntry,
  CoverageEntryFilter,
  CoverageListSummary,
  CoverageYearDetail,
  CoverageMatchSaveAction,
  RegistryReportPill,
} from "../lib/coverage-types";
import type { SaveReportSuccess } from "@/tabs/crawler/lib/crawler-types";

const REGISTRY_REFRESH_POLL_MS = 2000;
const REGISTRY_REFRESH_MAX_POLLS = 120;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForRegistryRefresh(
  listId: string,
  year: number,
): Promise<CoverageYearDetail> {
  for (let attempt = 0; attempt < REGISTRY_REFRESH_MAX_POLLS; attempt += 1) {
    await sleep(REGISTRY_REFRESH_POLL_MS);
    const page = await fetchCoverageYearDetail(listId, year, {
      offset: 0,
      limit: COVERAGE_PAGE_SIZE,
      filter: "all",
      includeRegistry: true,
    });
    if (!page.registryRefreshInProgress) {
      return page;
    }
  }
  throw new Error("Registry refresh timed out");
}

function applyYearStats(
  previous: CoverageYearDetail | null,
  stats: Pick<
    CoverageYearDetail,
    | "hasAnyReportCount"
    | "prodReadyCount"
    | "noReportCount"
    | "registryRefreshedAt"
    | "registryRefreshInProgress"
  >,
): CoverageYearDetail | null {
  if (!previous) return previous;
  return { ...previous, ...stats };
}

function entryMatchChanged(
  previous: CoverageEntry,
  updated: CoverageEntry,
): boolean {
  return (
    previous.status !== updated.status ||
    previous.matchMethod !== updated.matchMethod ||
    previous.matchedCompany?.id !== updated.matchedCompany?.id ||
    previous.matchedCompany?.wikidataId !== updated.matchedCompany?.wikidataId
  );
}

function mergeCoverageMatchUpdate(
  previous: CoverageYearDetail | null,
  updated: CoverageYearDetail,
): CoverageYearDetail {
  if (!previous) return updated;

  const yearFields = {
    totalNames: updated.totalNames,
    matchedCount: updated.matchedCount,
    ambiguousCount: updated.ambiguousCount,
    coveragePercent: updated.coveragePercent,
    hasAnyReportCount: updated.hasAnyReportCount,
    prodReadyCount: updated.prodReadyCount,
    noReportCount: updated.noReportCount,
    registryRefreshedAt: updated.registryRefreshedAt,
  };

  const isPartialEntryUpdate =
    updated.entries.length > 0 &&
    updated.entries.length < previous.entries.length;

  if (isPartialEntryUpdate) {
    const patchById = new Map(
      updated.entries.map((entry) => [entry.id, entry] as const),
    );
    return {
      ...previous,
      ...yearFields,
      entries: previous.entries.map((entry) => {
        const patch = patchById.get(entry.id);
        if (!patch) return entry;
        return {
          ...patch,
          registryReports:
            patch.registryReports.length > 0
              ? patch.registryReports
              : entry.registryReports,
        };
      }),
    };
  }

  const previousById = new Map(
    previous.entries.map((entry) => [entry.id, entry] as const),
  );

  let anyMatchChanged = false;
  const entries = updated.entries.map((entry) => {
    const prior = previousById.get(entry.id);
    if (!prior || entryMatchChanged(prior, entry)) {
      anyMatchChanged = true;
      return entry;
    }
    return {
      ...entry,
      registryReports: prior.registryReports ?? [],
    };
  });

  if (anyMatchChanged) {
    return {
      ...updated,
      ...yearFields,
      filteredCount: previous.filteredCount,
      offset: previous.offset,
      limit: previous.limit,
      hasMore: previous.hasMore,
      entries: previous.entries.map(
        (entry) =>
          updated.entries.find((patch) => patch.id === entry.id) ?? entry,
      ),
    };
  }

  return {
    ...updated,
    ...yearFields,
    hasAnyReportCount: previous.hasAnyReportCount,
    prodReadyCount: previous.prodReadyCount,
    noReportCount: previous.noReportCount,
    entries,
  };
}

function savedReportToPill(saved: SaveReportSuccess): RegistryReportPill {
  return {
    reportId: saved.id,
    reportYear: saved.reportYear,
    companyName: saved.companyName,
    wikidataId: saved.wikidataId ?? null,
    url: saved.url,
    sourceUrl: saved.url,
    matchMethod: saved.wikidataId ? "wikidata" : "name",
    prodReady: false,
  };
}

function addRegistryReportToEntry(
  detail: CoverageYearDetail,
  entryId: string,
  saved: SaveReportSuccess,
): CoverageYearDetail {
  const entryIndex = detail.entries.findIndex((entry) => entry.id === entryId);
  if (entryIndex === -1) return detail;

  const entry = detail.entries[entryIndex];
  const existingReports = entry.registryReports ?? [];
  if (
    existingReports.some(
      (report) => report.reportId === saved.id || report.url === saved.url,
    )
  ) {
    return detail;
  }

  const hadReports = existingReports.length > 0;
  const nextReports = [...existingReports, savedReportToPill(saved)];
  const entries = [...detail.entries];
  entries[entryIndex] = {
    ...entry,
    registryReports: nextReports,
  };

  return {
    ...detail,
    entries,
    hasAnyReportCount: hadReports
      ? detail.hasAnyReportCount
      : detail.hasAnyReportCount + 1,
    noReportCount: hadReports
      ? detail.noReportCount
      : Math.max(0, detail.noReportCount - 1),
  };
}

export function useCoverageLists() {
  const [lists, setLists] = useState<CoverageListSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLists = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      const response = await fetchCoverageLists();
      setLists(response.lists);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLists([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadLists(false);
  }, [loadLists]);

  return {
    lists,
    isLoading,
    isRefreshing,
    error,
    refresh: () => loadLists(true),
    createList: async (input: {
      name: string;
      year?: number;
      names?: string[];
    }) => {
      const created = await createCoverageList(input);
      await loadLists(true);
      return created;
    },
    addYear: async (
      listId: string,
      input: { year: number; names: string[] },
    ) => {
      const updated = await addCoverageListYear(listId, input);
      await loadLists(true);
      return updated;
    },
    renameList: async (listId: string, name: string) => {
      const updated = await renameCoverageList(listId, name);
      await loadLists(true);
      return updated;
    },
    replaceYearNames: async (listId: string, year: number, names: string[]) => {
      const updated = await replaceCoverageYearNames(listId, year, names);
      await loadLists(true);
      return updated;
    },
    deleteList: async (listId: string) => {
      await deleteCoverageList(listId);
      await loadLists(true);
    },
    deleteYear: async (listId: string, year: number) => {
      await deleteCoverageListYear(listId, year);
      await loadLists(true);
    },
  };
}

export function useCoverageYearDetail(
  listId: string | null,
  year: number | null,
) {
  const [detail, setDetail] = useState<CoverageYearDetail | null>(null);
  const [filter, setFilter] = useState<CoverageEntryFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshingRegistry, setIsRefreshingRegistry] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const registryRefreshRef = useRef(0);
  const selectionRef = useRef<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadPage = useCallback(
    async (
      offset: number,
      append: boolean,
      queryOverride?: { filter?: CoverageEntryFilter; q?: string },
    ) => {
      if (!listId || year === null) {
        setDetail(null);
        return;
      }

      const requestId = ++requestRef.current;
      setError(null);

      try {
        const page = await fetchCoverageYearDetail(listId, year, {
          offset,
          limit: COVERAGE_PAGE_SIZE,
          filter: queryOverride?.filter ?? filter,
          q: queryOverride?.q ?? debouncedSearch,
          includeRegistry: true,
        });

        if (requestId !== requestRef.current) return;

        setDetail((previous) => {
          if (!append || !previous) return page;
          return {
            ...page,
            entries: [...previous.entries, ...page.entries],
          };
        });
      } catch (err) {
        if (requestId !== requestRef.current) return;
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    },
    [listId, year, filter, debouncedSearch],
  );

  useEffect(() => {
    if (!listId || year === null) {
      setDetail(null);
      selectionRef.current = null;
      return;
    }

    const selectionKey = `${listId}:${year}`;
    const selectionChanged = selectionRef.current !== selectionKey;
    selectionRef.current = selectionKey;

    if (selectionChanged) {
      registryRefreshRef.current += 1;
      setIsRefreshingRegistry(false);
      setFilter("all");
      setSearch("");
      setDebouncedSearch("");
    }

    setIsLoading(true);
    void loadPage(
      0,
      false,
      selectionChanged ? { filter: "all", q: "" } : undefined,
    ).finally(() => setIsLoading(false));
  }, [listId, year, filter, debouncedSearch, loadPage]);

  const loadMore = useCallback(async () => {
    if (
      !detail?.hasMore ||
      isLoadingMore ||
      isLoading ||
      isRefreshingRegistry
    ) {
      return;
    }
    setIsLoadingMore(true);
    try {
      await loadPage(detail.entries.length, true);
    } finally {
      setIsLoadingMore(false);
    }
  }, [detail, isLoading, isLoadingMore, isRefreshingRegistry, loadPage]);

  const refreshRegistry = useCallback(async () => {
    if (!listId || year === null) return;

    const refreshId = ++registryRefreshRef.current;
    const selectionKey = `${listId}:${year}`;
    const isStale = () =>
      refreshId !== registryRefreshRef.current ||
      selectionRef.current !== selectionKey;

    setIsRefreshingRegistry(true);
    setError(null);
    try {
      const refreshed = await refreshCoverageYearRegistry(listId, year);
      if (isStale()) return;

      setDetail((previous) =>
        applyYearStats(previous, {
          hasAnyReportCount: refreshed.hasAnyReportCount,
          prodReadyCount: refreshed.prodReadyCount,
          noReportCount: refreshed.noReportCount,
          registryRefreshedAt: refreshed.registryRefreshedAt,
          registryRefreshInProgress: refreshed.inProgress,
        }),
      );

      if (refreshed.inProgress) {
        const completed = await waitForRegistryRefresh(listId, year);
        if (isStale()) return;

        setDetail((previous) =>
          applyYearStats(previous, {
            hasAnyReportCount: completed.hasAnyReportCount,
            prodReadyCount: completed.prodReadyCount,
            noReportCount: completed.noReportCount,
            registryRefreshedAt: completed.registryRefreshedAt,
            registryRefreshInProgress: false,
          }),
        );
      }

      if (isStale()) return;
      await loadPage(0, false);
    } catch (err) {
      if (isStale()) return;

      setDetail((previous) =>
        applyYearStats(previous, { registryRefreshInProgress: false }),
      );
      setError(err instanceof Error ? err.message : "Unknown error");
      await loadPage(0, false);
    } finally {
      if (!isStale()) {
        setIsRefreshingRegistry(false);
      }
    }
  }, [listId, year, loadPage]);

  return {
    detail,
    filter,
    setFilter,
    search,
    setSearch,
    isLoading,
    isLoadingMore,
    isRefreshingRegistry,
    error,
    loadMore,
    refreshRegistry,
    refresh: () => loadPage(0, false),
    addEntryRegistryReport: (entryId: string, saved: SaveReportSuccess) => {
      setDetail((previous) =>
        previous
          ? addRegistryReportToEntry(previous, entryId, saved)
          : previous,
      );
    },
    setEntryMatch: async (entryId: string, action: CoverageMatchSaveAction) => {
      if (!listId || year === null) return null;
      const payload =
        action.type === "match"
          ? {
              matchedCompanyId: action.companyId,
              matchConfirmedMissing: false,
            }
          : action.type === "markMissing" || action.type === "clear"
            ? {
                matchedCompanyId: null,
                matchConfirmedMissing: true,
              }
            : {
                matchedCompanyId: null,
                matchConfirmedMissing: false,
              };
      const updated = await setCoverageEntryMatch(
        listId,
        year,
        entryId,
        payload,
      );
      setDetail((previous) => mergeCoverageMatchUpdate(previous, updated));
      void loadPage(0, false);
      return updated;
    },
  };
}

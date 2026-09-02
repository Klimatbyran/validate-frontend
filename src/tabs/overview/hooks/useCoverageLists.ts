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
  rematchCoverageYear,
  renameCoverageList,
  replaceCoverageYearNames,
  updateCoverageYearEdition,
  setCoverageEntryMatch,
} from "../lib/coverage-api";
import type {
  CoverageEntry,
  CoverageEntryFilter,
  CoverageListSummary,
  CoverageYearDetail,
  CoverageYearSummary,
  CoverageMatchSaveAction,
  CoverageYearRematch,
  CoverageRematchMode,
  RegistryReportPill,
} from "../lib/coverage-types";
import type { SaveReportSuccess } from "@/tabs/crawler/lib/crawler-types";
import { unionRegistryReportPills } from "../lib/coverage-registry-report-run";

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
    reportTypeId: saved.reportTypeId ?? null,
    reportTypeSlug: saved.reportTypeSlug ?? null,
    reportTypeLabel: saved.reportTypeLabel ?? null,
  };
}

function removeRegistryReportFromEntry(
  detail: CoverageYearDetail,
  entryId: string,
  reportId: string,
): CoverageYearDetail {
  const entryIndex = detail.entries.findIndex((entry) => entry.id === entryId);
  if (entryIndex === -1) return detail;

  const entry = detail.entries[entryIndex];
  const existingReports = entry.registryReports ?? [];
  const removed = existingReports.find(
    (report) => report.reportId === reportId,
  );
  if (!removed) return detail;

  const nextReports = existingReports.filter(
    (report) => report.reportId !== reportId,
  );
  const entries = [...detail.entries];
  entries[entryIndex] = {
    ...entry,
    registryReports: nextReports,
  };

  return {
    ...detail,
    entries,
    hasAnyReportCount:
      nextReports.length === 0
        ? Math.max(0, detail.hasAnyReportCount - 1)
        : detail.hasAnyReportCount,
    noReportCount:
      nextReports.length === 0
        ? detail.noReportCount + 1
        : detail.noReportCount,
    prodReadyCount: removed.prodReady
      ? Math.max(0, detail.prodReadyCount - 1)
      : detail.prodReadyCount,
  };
}

function updateRegistryReportInEntry(
  detail: CoverageYearDetail,
  entryId: string,
  reportId: string,
  updated: RegistryReportPill,
): CoverageYearDetail {
  const entryIndex = detail.entries.findIndex((entry) => entry.id === entryId);
  if (entryIndex === -1) return detail;

  const entry = detail.entries[entryIndex];
  const existingReports = entry.registryReports ?? [];
  const reportIndex = existingReports.findIndex(
    (report) => report.reportId === reportId,
  );
  if (reportIndex === -1) return detail;

  const previous = existingReports[reportIndex]!;
  const nextReports = [...existingReports];
  nextReports[reportIndex] = updated;

  const entries = [...detail.entries];
  entries[entryIndex] = {
    ...entry,
    registryReports: nextReports,
  };

  return {
    ...detail,
    entries,
    prodReadyCount:
      previous.prodReady && !updated.prodReady
        ? Math.max(0, detail.prodReadyCount - 1)
        : detail.prodReadyCount,
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

function patchListYearSummary(
  lists: CoverageListSummary[],
  listId: string,
  year: number,
  stats: Pick<
    CoverageYearSummary,
    | "totalNames"
    | "matchedCount"
    | "ambiguousCount"
    | "coveragePercent"
    | "hasAnyReportCount"
    | "prodReadyCount"
    | "noReportCount"
  >,
): CoverageListSummary[] {
  return lists.map((list) => {
    if (list.id !== listId) return list;
    return {
      ...list,
      years: list.years.map((yearRow) =>
        yearRow.year === year ? { ...yearRow, ...stats } : yearRow,
      ),
    };
  });
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
    patchYearStats: (
      listId: string,
      year: number,
      stats: Pick<
        CoverageYearSummary,
        | "totalNames"
        | "matchedCount"
        | "ambiguousCount"
        | "coveragePercent"
        | "hasAnyReportCount"
        | "prodReadyCount"
        | "noReportCount"
      >,
    ) => {
      setLists((previous) => patchListYearSummary(previous, listId, year, stats));
    },
    patchYearStats: (
      listId: string,
      year: number,
      stats: Pick<
        CoverageYearSummary,
        | "totalNames"
        | "matchedCount"
        | "ambiguousCount"
        | "coveragePercent"
        | "hasAnyReportCount"
        | "prodReadyCount"
        | "noReportCount"
      >,
    ) => {
      setLists((previous) => patchListYearSummary(previous, listId, year, stats));
    },
    patchYearStats: (
      listId: string,
      year: number,
      stats: Pick<
        CoverageYearSummary,
        | "totalNames"
        | "matchedCount"
        | "ambiguousCount"
        | "coveragePercent"
        | "hasAnyReportCount"
        | "prodReadyCount"
        | "noReportCount"
      >,
    ) => {
      setLists((previous) => patchListYearSummary(previous, listId, year, stats));
    },
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
    updateYearEdition: async (
      listId: string,
      year: number,
      input: { year?: number; names?: string[] },
    ) => {
      const updated = await updateCoverageYearEdition(listId, year, input);
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
  onYearStatsUpdated?: (
    stats: Pick<
      CoverageYearDetail,
      | "totalNames"
      | "matchedCount"
      | "ambiguousCount"
      | "coveragePercent"
      | "hasAnyReportCount"
      | "prodReadyCount"
      | "noReportCount"
    >,
  ) => void,
) {
  const [detail, setDetail] = useState<CoverageYearDetail | null>(null);
  const [filter, setFilter] = useState<CoverageEntryFilter>("missing");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
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
      pageNumber: number,
      queryOverride?: { filter?: CoverageEntryFilter; q?: string },
    ) => {
      if (!listId || year === null) {
        setDetail(null);
        return;
      }

      const requestId = ++requestRef.current;
      setError(null);
      const offset = (pageNumber - 1) * COVERAGE_PAGE_SIZE;

      try {
        const pageResult = await fetchCoverageYearDetail(listId, year, {
          offset,
          limit: COVERAGE_PAGE_SIZE,
          filter: queryOverride?.filter ?? filter,
          q: queryOverride?.q ?? debouncedSearch,
          includeRegistry: true,
        });

        if (requestId !== requestRef.current) return;

        setDetail((previous) => {
          if (!previous) return pageResult;
          const priorById = new Map(
            previous.entries.map((entry) => [entry.id, entry] as const),
          );
          return {
            ...pageResult,
            entries: pageResult.entries.map((entry) => {
              const prior = priorById.get(entry.id);
              return {
                ...entry,
                registryReports: unionRegistryReportPills(
                  prior?.registryReports,
                  entry.registryReports,
                ),
              };
            }),
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
    if (selectionRef.current === selectionKey) return;
    selectionRef.current = selectionKey;

    registryRefreshRef.current += 1;
    setIsRefreshingRegistry(false);
    setFilter("missing");
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  }, [listId, year]);

  useEffect(() => {
    if (!listId || year === null) return;

    setIsLoading(true);
    void loadPage(page).finally(() => setIsLoading(false));
  }, [listId, year, filter, debouncedSearch, page, loadPage]);

  const setFilterAndResetPage = useCallback(
    (nextFilter: CoverageEntryFilter) => {
      setPage(1);
      setFilter(nextFilter);
    },
    [],
  );

  const setSearchAndResetPage = useCallback((nextSearch: string) => {
    setPage(1);
    setSearch(nextSearch);
  }, []);

  const filteredCount = detail?.filteredCount ?? detail?.entries.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(filteredCount / COVERAGE_PAGE_SIZE));

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
      await loadPage(page);
    } catch (err) {
      if (isStale()) return;

      setDetail((previous) =>
        applyYearStats(previous, { registryRefreshInProgress: false }),
      );
      setError(err instanceof Error ? err.message : "Unknown error");
      await loadPage(page);
    } finally {
      if (!isStale()) {
        setIsRefreshingRegistry(false);
      }
    }
  }, [listId, year, loadPage, page]);

  const [isRematching, setIsRematching] = useState(false);

  const rematchCompanies = useCallback(
    async (
      mode: CoverageRematchMode = "missing",
    ): Promise<CoverageYearRematch | null> => {
      if (!listId || year === null) return null;

      setIsRematching(true);
      setError(null);
      try {
        const result = await rematchCoverageYear(listId, year, mode);
        onYearStatsUpdated?.({
          totalNames: result.totalNames,
          matchedCount: result.matchedCount,
          ambiguousCount: result.ambiguousCount,
          coveragePercent: result.coveragePercent,
          hasAnyReportCount: detail?.hasAnyReportCount ?? 0,
          prodReadyCount: detail?.prodReadyCount ?? 0,
          noReportCount: detail?.noReportCount ?? 0,
        });
        setPage(1);
        await loadPage(1);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        throw err;
      } finally {
        setIsRematching(false);
      }
    },
    [listId, year, loadPage, onYearStatsUpdated, detail],
  );

  return {
    detail,
    filter,
    setFilter: setFilterAndResetPage,
    search,
    setSearch: setSearchAndResetPage,
    page,
    totalPages,
    pageSize: COVERAGE_PAGE_SIZE,
    setPage,
    isLoading,
    isRefreshingRegistry,
    isRematching,
    error,
    refreshRegistry,
    rematchCompanies,
    refresh: () => loadPage(page),
    addEntryRegistryReport: (entryId: string, saved: SaveReportSuccess) => {
      setDetail((previous) =>
        previous
          ? addRegistryReportToEntry(previous, entryId, saved)
          : previous,
      );
    },
    removeEntryRegistryReport: (entryId: string, reportId: string) => {
      setDetail((previous) =>
        previous
          ? removeRegistryReportFromEntry(previous, entryId, reportId)
          : previous,
      );
    },
    replaceEntryRegistryReport: (
      entryId: string,
      reportId: string,
      updated: RegistryReportPill,
    ) => {
      setDetail((previous) =>
        previous
          ? updateRegistryReportInEntry(previous, entryId, reportId, updated)
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
          : action.type === "markMissing"
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
      onYearStatsUpdated?.({
        totalNames: updated.totalNames,
        matchedCount: updated.matchedCount,
        ambiguousCount: updated.ambiguousCount,
        coveragePercent: updated.coveragePercent,
        hasAnyReportCount: updated.hasAnyReportCount,
        prodReadyCount: updated.prodReadyCount,
        noReportCount: updated.noReportCount,
      });
      return updated;
    },
  };
}

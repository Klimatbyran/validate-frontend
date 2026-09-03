import { useCallback, useEffect, useRef, useState } from "react";
import {
  COVERAGE_PAGE_SIZE,
  fetchCoverageYearDetail,
  refreshCoverageEntryRegistry,
  refreshCoverageYearRegistry,
  rematchCoverageYear,
  setCoverageEntryMatch,
} from "../lib/coverage-api";
import type {
  CoverageEntryFilter,
  CoverageYearDetail,
  CoverageMatchSaveAction,
  CoverageYearRematch,
  CoverageRematchMode,
  RegistryReportPill,
} from "../lib/coverage-types";
import type { SaveReportSuccess } from "@/tabs/crawler/lib/crawler-types";
import { unionRegistryReportPills } from "../lib/coverage-registry-report-run";
import {
  addRegistryReportToEntry,
  applyEntryRegistryRefresh,
  applyYearStats,
  mergeCoverageMatchUpdate,
  removeRegistryReportFromEntry,
  updateRegistryReportInEntry,
  waitForRegistryRefresh,
} from "../lib/coverage-year-detail-state";

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
  const [refreshingEntryId, setRefreshingEntryId] = useState<string | null>(
    null,
  );
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
      queryOverride?: {
        filter?: CoverageEntryFilter;
        q?: string;
        includeRegistry?: boolean;
      },
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
          includeRegistry: queryOverride?.includeRegistry ?? true,
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
    refreshingEntryId,
    isRematching,
    error,
    refreshRegistry,
    refreshEntryRegistry: async (entryId: string) => {
      if (!listId || year === null) return null;
      setRefreshingEntryId(entryId);
      setError(null);
      try {
        const updated = await refreshCoverageEntryRegistry(
          listId,
          year,
          entryId,
        );
        setDetail((previous) =>
          previous
            ? applyEntryRegistryRefresh(previous, updated, entryId, filter)
            : updated,
        );
        onYearStatsUpdated?.({
          totalNames: updated.totalNames,
          matchedCount: updated.matchedCount,
          ambiguousCount: updated.ambiguousCount,
          coveragePercent: updated.coveragePercent,
          hasAnyReportCount: updated.hasAnyReportCount,
          prodReadyCount: updated.prodReadyCount,
          noReportCount: updated.noReportCount,
        });
        if (
          filter === "registryInProd" ||
          filter === "registryOnly" ||
          filter === "registryMissing"
        ) {
          void loadPage(page);
        }
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        throw err;
      } finally {
        setRefreshingEntryId(null);
      }
    },
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
    applyLinkedEntryReports: (updated: CoverageYearDetail, entryId: string) => {
      setDetail((previous) =>
        previous
          ? applyEntryRegistryRefresh(previous, updated, entryId, filter)
          : updated,
      );
      onYearStatsUpdated?.({
        totalNames: updated.totalNames,
        matchedCount: updated.matchedCount,
        ambiguousCount: updated.ambiguousCount,
        coveragePercent: updated.coveragePercent,
        hasAnyReportCount: updated.hasAnyReportCount,
        prodReadyCount: updated.prodReadyCount,
        noReportCount: updated.noReportCount,
      });
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
      setDetail((previous) =>
        mergeCoverageMatchUpdate(previous, updated, filter),
      );
      onYearStatsUpdated?.({
        totalNames: updated.totalNames,
        matchedCount: updated.matchedCount,
        ambiguousCount: updated.ambiguousCount,
        coveragePercent: updated.coveragePercent,
        hasAnyReportCount: updated.hasAnyReportCount,
        prodReadyCount: updated.prodReadyCount,
        noReportCount: updated.noReportCount,
      });
      // Soft refresh for page totals / filter membership. Skip registry
      // enrichment so this does not re-load full prod company metadata after
      // every match; existing pills are preserved via merge/union.
      void loadPage(page, { includeRegistry: false });
      return updated;
    },
  };
}

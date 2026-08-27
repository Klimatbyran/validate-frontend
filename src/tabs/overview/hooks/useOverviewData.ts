import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { buildTagLabelBySlug } from "@/tabs/editor/lib/editor-tag-and-payload-utils";
import { useTagOptions } from "@/tabs/upload/hooks/useTagOptions";
import {
  fetchOverviewSummary,
  fetchProdToStageOverview,
  OVERVIEW_PAGE_SIZE,
  type ProdToStageBuildDiagnostics,
} from "../lib/overview-api";
import {
  defaultProdToStageFilters,
  overviewYearRange,
  type OverviewSummaryResponse,
  type OverviewWarning,
  type OverviewViewMode,
  type ProdToStageFilters,
  type ProdToStageRow,
} from "../lib/overview-types";

const OVERVIEW_VIEW_QUERY = "view";

function overviewViewFromSearchParams(
  searchParams: URLSearchParams,
): OverviewViewMode {
  const view = searchParams.get(OVERVIEW_VIEW_QUERY);
  if (view === "prod-to-stage") return "prodToStage";
  if (view === "coverage") return "coverage";
  return "summary";
}

function viewModeToQuery(mode: OverviewViewMode): string | null {
  if (mode === "prodToStage") return "prod-to-stage";
  if (mode === "coverage") return "coverage";
  return null;
}

const EMPTY_DIAGNOSTICS: ProdToStageBuildDiagnostics = {
  prodShells: 0,
  skippedUnlinked: 0,
  skippedNoFullyVerifiedOnProd: 0,
  skippedStageHasEmissions: 0,
  includedWithoutReportUrl: 0,
  included: 0,
};

export function useOverviewData() {
  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode = overviewViewFromSearchParams(searchParams);

  const [summary, setSummary] = useState<OverviewSummaryResponse | null>(null);
  const [prodToStageRows, setProdToStageRows] = useState<ProdToStageRow[]>([]);
  const [prodToStageDiagnostics, setProdToStageDiagnostics] =
    useState<ProdToStageBuildDiagnostics>(EMPTY_DIAGNOSTICS);
  const [stageCompanyCount, setStageCompanyCount] = useState(0);
  const [prodCompanyCount, setProdCompanyCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showAll, setShowAll] = useState(false);

  const { tagOptions } = useTagOptions();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<OverviewWarning[]>([]);
  const [localEnv, setLocalEnv] = useState<"stage" | "prod" | null>(null);
  const [prodToStageFilters, setProdToStageFilters] = useState(
    defaultProdToStageFilters(),
  );

  const setViewMode = useCallback(
    (mode: OverviewViewMode) => {
      setProdToStageFilters(defaultProdToStageFilters());
      setPage(1);
      setShowAll(false);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const query = viewModeToQuery(mode);
          if (query) next.set(OVERVIEW_VIEW_QUERY, query);
          else next.delete(OVERVIEW_VIEW_QUERY);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const loadData = useCallback(
    async (isManualRefresh = false) => {
      if (viewMode === "coverage") {
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (isManualRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      setError(null);
      setWarnings([]);
      setLocalEnv(null);

      try {
        if (viewMode === "summary") {
          const response = await fetchOverviewSummary();
          setSummary(response);
          setProdToStageRows([]);
          setTotalRows(0);
          setTotalPages(1);
          setLocalEnv(response.localEnv);
          setWarnings([]);
          return;
        }

        const requestPage = showAll ? 1 : page;
        const pageSize = showAll ? 200 : OVERVIEW_PAGE_SIZE;
        const response = await fetchProdToStageOverview(
          prodToStageFilters,
          requestPage,
          pageSize,
        );
        setProdToStageRows(response.rows);
        setSummary(null);
        setProdToStageDiagnostics(response.diagnostics);
        setStageCompanyCount(response.stageCompanyCount);
        setProdCompanyCount(response.prodCompanyCount);
        setTotalRows(response.total);
        setTotalPages(
          showAll ? 1 : Math.max(1, Math.ceil(response.total / pageSize)),
        );
        setWarnings(response.warnings ?? []);
        setLocalEnv(response.localEnv ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setSummary(null);
        setProdToStageRows([]);
        setWarnings([]);
        setLocalEnv(null);
        setTotalRows(0);
        setTotalPages(1);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [viewMode, prodToStageFilters, page, showAll],
  );

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  useEffect(() => {
    setPage(1);
    setShowAll(false);
  }, [viewMode, prodToStageFilters]);

  const distinctReportYears = useMemo(() => overviewYearRange(), []);
  const prodToStageDistinctYears = distinctReportYears;

  const tagLabelBySlug = useMemo(
    () => buildTagLabelBySlug(tagOptions),
    [tagOptions],
  );

  const patchProdToStageFilters = useCallback(
    (patch: Partial<ProdToStageFilters>) => {
      setProdToStageFilters((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  const clearFilters = useCallback(() => {
    setProdToStageFilters(defaultProdToStageFilters());
  }, []);

  const filtersAreActive =
    Boolean(prodToStageFilters.searchQuery.trim()) ||
    prodToStageFilters.reportYears.length > 0 ||
    prodToStageFilters.tagSlugs.length > 0 ||
    prodToStageFilters.runnableOnly;

  const paginationFrom =
    totalRows === 0 ? 0 : showAll ? 1 : (page - 1) * OVERVIEW_PAGE_SIZE + 1;
  const paginationTo = showAll
    ? totalRows
    : Math.min(page * OVERVIEW_PAGE_SIZE, totalRows);

  return {
    viewMode,
    setViewMode,
    summary,
    prodToStageRows,
    warnings,
    localEnv,
    prodToStageDiagnostics,
    stageCompanyCount,
    prodCompanyCount,
    prodToStageFilters,
    patchProdToStageFilters,
    clearFilters,
    distinctReportYears,
    prodToStageDistinctYears,
    tagOptions,
    tagLabelBySlug,
    isLoading,
    isRefreshing,
    error,
    refresh: () => loadData(true),
    filtersAreActive,
    pagination: {
      page,
      totalPages,
      totalRows,
      from: paginationFrom,
      to: paginationTo,
      showAll,
      setPage,
      setShowAll,
      canPaginate: totalRows > OVERVIEW_PAGE_SIZE,
    },
  };
}

export type OverviewData = ReturnType<typeof useOverviewData>;

export type {
  OverviewSummaryResponse,
  OverviewViewMode,
  ProdToStageFilters,
  ProdToStageRow,
  OverviewWarning,
};

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchAllArchiveRuns } from "@/lib/archive-runs-api";
import {
  ApiAuthError,
  crossEnvProdPipelineUrlUsesStageOverride,
  fetchStageAndProdPipelineCompanies,
} from "@/lib/pipeline-companies-cross-env";
import type { Company } from "@/tabs/errors/types";
import type { ArchiveRunSummary } from "@/tabs/jobbstatus/lib/archive-types";
import { fetchRegistryList } from "@/tabs/registry/lib/registry-api";
import type { RegistryEntry } from "@/tabs/registry/lib/registry-types";
import { buildTagLabelBySlug } from "@/tabs/editor/lib/editor-tag-and-payload-utils";
import { useTagOptions } from "@/tabs/upload/hooks/useTagOptions";
import {
  buildCompanyYearRows,
  buildRegistryReportRows,
  computeOverviewStats,
  rowMatchesOverviewFilters,
} from "../lib/build-overview-rows";
import {
  buildProdToStageRows,
  diagnoseProdToStageBuild,
  prodToStageRowMatchesFilters,
  type ProdToStageBuildDiagnostics,
  type ProdToStageRow,
} from "../lib/build-prod-to-stage-rows";
import {
  defaultOverviewFilters,
  defaultProdToStageFilters,
  overviewYearRange,
  type OverviewFilters,
  type OverviewRow,
  type OverviewStats,
  type OverviewViewMode,
  type ProdToStageFilters,
} from "../lib/overview-types";
import { overviewFiltersAreActive } from "../lib/overview-row-gaps";

const OVERVIEW_VIEW_QUERY = "view";

function overviewViewFromSearchParams(
  searchParams: URLSearchParams,
): OverviewViewMode {
  const view = searchParams.get(OVERVIEW_VIEW_QUERY);
  if (view === "registry") return "registryReports";
  if (view === "prod-to-stage") return "prodToStage";
  return "companyYears";
}

function viewModeToQuery(mode: OverviewViewMode): string | null {
  if (mode === "registryReports") return "registry";
  if (mode === "prodToStage") return "prod-to-stage";
  return null;
}

export function useOverviewData() {
  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode = overviewViewFromSearchParams(searchParams);

  const [registry, setRegistry] = useState<RegistryEntry[]>([]);
  const [archiveRuns, setArchiveRuns] = useState<ArchiveRunSummary[]>([]);
  const [stageCompanies, setStageCompanies] = useState<Company[]>([]);
  const [prodCompanies, setProdCompanies] = useState<Company[]>([]);
  const { tagOptions } = useTagOptions();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthError, setIsAuthError] = useState(false);
  const [filters, setFilters] = useState<OverviewFilters>(
    defaultOverviewFilters(),
  );
  const [prodToStageFilters, setProdToStageFilters] = useState(
    defaultProdToStageFilters(),
  );

  const setViewMode = useCallback(
    (mode: OverviewViewMode) => {
      setFilters(defaultOverviewFilters());
      setProdToStageFilters(defaultProdToStageFilters());
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

  const buildInput = useMemo(
    () => ({
      registry,
      archiveRuns,
      stageCompanies,
      prodCompanies,
    }),
    [registry, archiveRuns, stageCompanies, prodCompanies],
  );

  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    setError(null);
    setIsAuthError(false);

    try {
      const [registryData, archive, pipelineCompanies] = await Promise.all([
        fetchRegistryList(),
        fetchAllArchiveRuns(),
        fetchStageAndProdPipelineCompanies(),
      ]);
      const { stageCompanies: stage, prodCompanies: prod } = pipelineCompanies;

      setRegistry(Array.isArray(registryData) ? registryData : []);
      setArchiveRuns(archive);
      setStageCompanies(stage);
      setProdCompanies(prod);
    } catch (err) {
      if (err instanceof ApiAuthError) {
        setIsAuthError(true);
        setRegistry([]);
        setArchiveRuns([]);
        setStageCompanies([]);
        setProdCompanies([]);
      } else {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  const companyYearRows = useMemo(
    () => buildCompanyYearRows(buildInput),
    [buildInput],
  );
  const registryReportRows = useMemo(
    () => buildRegistryReportRows(buildInput),
    [buildInput],
  );
  const prodToStageRows = useMemo(
    () =>
      buildProdToStageRows({
        stageCompanies,
        prodCompanies,
      }),
    [stageCompanies, prodCompanies],
  );

  const prodToStageDiagnostics = useMemo(
    (): ProdToStageBuildDiagnostics =>
      diagnoseProdToStageBuild({
        stageCompanies,
        prodCompanies,
      }),
    [stageCompanies, prodCompanies],
  );

  const prodPipelineUsesStageOverride = crossEnvProdPipelineUrlUsesStageOverride();

  const allRows: OverviewRow[] =
    viewMode === "companyYears"
      ? companyYearRows
      : viewMode === "registryReports"
        ? registryReportRows
        : [];

  const filteredRows = useMemo(
    () => allRows.filter((row) => rowMatchesOverviewFilters(row, filters)),
    [allRows, filters],
  );

  const filteredProdToStageRows = useMemo(
    () =>
      prodToStageRows.filter((row) =>
        prodToStageRowMatchesFilters(row, prodToStageFilters),
      ),
    [prodToStageRows, prodToStageFilters],
  );

  const stats = useMemo((): OverviewStats => {
    if (viewMode === "prodToStage") {
      return {
        totalRows: filteredProdToStageRows.length,
        pipelineCompleted: 0,
        pipelineFailed: 0,
      };
    }
    return computeOverviewStats(filteredRows, viewMode);
  }, [viewMode, filteredRows, filteredProdToStageRows]);

  const distinctReportYears = useMemo(() => {
    if (viewMode === "companyYears") return overviewYearRange();
    const source =
      viewMode === "registryReports" ? registryReportRows : prodToStageRows;
    const years = new Set(
      source
        .map((row) => ("reportYear" in row ? row.reportYear : null))
        .filter((year): year is string => Boolean(year)),
    );
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [viewMode, registryReportRows, prodToStageRows]);

  const prodToStageDistinctYears = useMemo(() => {
    const years = new Set(
      prodToStageRows
        .map((row) => row.reportYear)
        .filter((year): year is string => Boolean(year)),
    );
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [prodToStageRows]);

  const tagLabelBySlug = useMemo(
    () => buildTagLabelBySlug(tagOptions),
    [tagOptions],
  );

  const patchFilters = useCallback((patch: Partial<OverviewFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const patchProdToStageFilters = useCallback(
    (patch: Partial<ProdToStageFilters>) => {
      setProdToStageFilters((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  const clearFilters = useCallback(() => {
    setFilters(defaultOverviewFilters());
    setProdToStageFilters(defaultProdToStageFilters());
  }, []);

  const filtersAreActive =
    viewMode === "prodToStage"
      ? Boolean(prodToStageFilters.searchQuery.trim()) ||
        prodToStageFilters.reportYears.length > 0 ||
        prodToStageFilters.tagSlugs.length > 0 ||
        prodToStageFilters.runnableOnly
      : overviewFiltersAreActive(filters);

  return {
    viewMode,
    setViewMode,
    rows: filteredRows,
    allRows,
    prodToStageRows: filteredProdToStageRows,
    allProdToStageRows: prodToStageRows,
    prodToStageDiagnostics,
    prodPipelineUsesStageOverride,
    stageCompanyCount: stageCompanies.length,
    prodCompanyCount: prodCompanies.length,
    stats,
    filters,
    prodToStageFilters,
    patchFilters,
    patchProdToStageFilters,
    clearFilters,
    distinctReportYears,
    prodToStageDistinctYears,
    tagOptions,
    tagLabelBySlug,
    isLoading,
    isRefreshing,
    error,
    isAuthError,
    refresh: () => loadData(true),
    filtersAreActive,
  };
}

export type OverviewData = ReturnType<typeof useOverviewData>;

export type {
  OverviewRow,
  OverviewStats,
  OverviewFilters,
  OverviewViewMode,
  ProdToStageBuildDiagnostics,
  ProdToStageFilters,
  ProdToStageRow,
};

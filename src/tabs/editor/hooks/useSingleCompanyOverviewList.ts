import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EDITOR_COMPANY_INDEX_PAGE_SIZE,
  EDITOR_COMPANY_SEARCH_MIN_LENGTH,
  listCompaniesIndex,
} from "../lib/companies-api";
import { fetchTagOptions } from "../lib/tag-options-api";
import type { GarboCompanyListItem, TagOption } from "../lib/types";
import { NO_TAGS_FILTER_OPTION } from "../lib/types";
import { buildTagLabelBySlug } from "../lib/editor-tag-and-payload-utils";
import {
  type CompanySortId,
  type FilterMissingDataOption,
  type FilterUnverifiedOption,
  reportRowPassesOverviewFilters,
  computeOverviewFilterPeriodStats,
  sortCompanyReportRows,
} from "../lib/single-company-overview-list";
import {
  collectDataYearsFromCompanies,
  collectReportYearsFromCompanies,
  expandCompaniesToReportRows,
} from "../lib/company-report-rows";

export type EditorListMode = "idle" | "search" | "browse";

export function useSingleCompanyOverviewList() {
  const [companyList, setCompanyList] = useState<GarboCompanyListItem[]>([]);
  const [tagOptions, setTagOptions] = useState<TagOption[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [listMode, setListMode] = useState<EditorListMode>("idle");
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(EDITOR_COMPANY_INDEX_PAGE_SIZE);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [excludeFilterTags, setExcludeFilterTags] = useState<string[]>([]);
  const [filterDataYears, setFilterDataYearsRaw] = useState<string[]>([]);
  const setFilterDataYears = useCallback((years: string[]) => {
    setFilterDataYearsRaw(years);
    if (!years.length) setFilterApplyUnverifiedToSelectedYears(false);
  }, []);
  const [filterReportYears, setFilterReportYears] = useState<string[]>([]);
  const [filterSector, setFilterSector] = useState("");
  const [filterUnverified, setFilterUnverifiedRaw] =
    useState<FilterUnverifiedOption>("");
  const [
    filterApplyUnverifiedToSelectedYears,
    setFilterApplyUnverifiedToSelectedYears,
  ] = useState(false);
  const setFilterUnverified = useCallback((v: FilterUnverifiedOption) => {
    setFilterUnverifiedRaw(v);
    if (!v) setFilterApplyUnverifiedToSelectedYears(false);
  }, []);
  const [filterMissingData, setFilterMissingData] =
    useState<FilterMissingDataOption>("");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [companySort, setCompanySort] = useState<CompanySortId>("name-asc");

  const requestRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearchQuery(searchQuery.trim()),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;
    fetchTagOptions()
      .then((tags) => {
        if (!cancelled) setTagOptions(tags);
      })
      .catch(() => {
        if (!cancelled) setTagOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const serverTags = useMemo(
    () => filterTags.filter((tag) => tag !== NO_TAGS_FILTER_OPTION),
    [filterTags],
  );

  const fetchIndex = useCallback(
    async (input: {
      mode: Exclude<EditorListMode, "idle">;
      q?: string;
      pageNumber: number;
    }) => {
      const requestId = ++requestRef.current;
      setLoadingList(true);
      setListError(null);
      setListMode(input.mode);
      try {
        const offset = (input.pageNumber - 1) * pageSize;
        const result = await listCompaniesIndex({
          q: input.mode === "search" ? input.q : undefined,
          offset,
          limit: pageSize,
          tags: serverTags.length ? serverTags : undefined,
        });
        if (requestId !== requestRef.current) return;
        setCompanyList(result.companies);
        setTotalCount(result.total);
        setPage(input.pageNumber);
      } catch (e) {
        if (requestId !== requestRef.current) return;
        setListError(e instanceof Error ? e.message : String(e));
        setCompanyList([]);
        setTotalCount(0);
      } finally {
        if (requestId === requestRef.current) setLoadingList(false);
      }
    },
    [pageSize, serverTags],
  );

  useEffect(() => {
    if (debouncedSearchQuery.length >= EDITOR_COMPANY_SEARCH_MIN_LENGTH) {
      void fetchIndex({
        mode: "search",
        q: debouncedSearchQuery,
        pageNumber: 1,
      });
      return;
    }

    setListMode((mode) => {
      if (mode !== "search") return mode;
      setCompanyList([]);
      setTotalCount(0);
      setPage(1);
      setListError(null);
      return "idle";
    });
  }, [debouncedSearchQuery, fetchIndex]);

  useEffect(() => {
    if (listMode === "browse") {
      void fetchIndex({ mode: "browse", pageNumber: 1 });
      return;
    }
    if (
      listMode === "search" &&
      debouncedSearchQuery.length >= EDITOR_COMPANY_SEARCH_MIN_LENGTH
    ) {
      void fetchIndex({
        mode: "search",
        q: debouncedSearchQuery,
        pageNumber: 1,
      });
    }
    // Tag include-filter is server-side; refetch the active mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverTags]);

  const browseAll = useCallback(() => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    void fetchIndex({ mode: "browse", pageNumber: 1 });
  }, [fetchIndex]);

  const setBrowsePage = useCallback(
    (pageNumber: number) => {
      if (listMode !== "browse") return;
      void fetchIndex({ mode: "browse", pageNumber });
    },
    [fetchIndex, listMode],
  );

  const refreshCompanyList = useCallback(() => {
    if (listMode === "search") {
      return fetchIndex({
        mode: "search",
        q: debouncedSearchQuery,
        pageNumber: page,
      });
    }
    if (listMode === "browse") {
      return fetchIndex({ mode: "browse", pageNumber: page });
    }
    return Promise.resolve();
  }, [debouncedSearchQuery, fetchIndex, listMode, page]);

  const dataYears = useMemo(
    () => collectDataYearsFromCompanies(companyList),
    [companyList],
  );

  const reportYears = useMemo(
    () => collectReportYearsFromCompanies(companyList),
    [companyList],
  );

  const sectors = useMemo(() => {
    const set = new Set<string>();
    companyList.forEach((c) => {
      const code = c.industry?.subIndustryCode;
      if (code) set.add(code);
    });
    return Array.from(set).sort();
  }, [companyList]);

  const allReportRows = useMemo(
    () => expandCompaniesToReportRows(companyList),
    [companyList],
  );

  const filterInput = useMemo(
    () => ({
      // Server already applied name search; keep client search empty so we
      // don't double-filter the current page.
      searchQuery: "",
      filterTags,
      excludeFilterTags,
      filterDataYears,
      filterReportYears,
      filterSector,
      filterUnverified,
      filterApplyUnverifiedToSelectedYears,
      filterMissingData,
    }),
    [
      filterTags,
      excludeFilterTags,
      filterDataYears,
      filterReportYears,
      filterSector,
      filterUnverified,
      filterApplyUnverifiedToSelectedYears,
      filterMissingData,
    ],
  );

  const filteredReportRows = useMemo(
    () =>
      allReportRows.filter((row) =>
        reportRowPassesOverviewFilters(row, filterInput),
      ),
    [allReportRows, filterInput],
  );

  const sortedReportRows = useMemo(
    () => sortCompanyReportRows(filteredReportRows, companySort),
    [filteredReportRows, companySort],
  );

  const filterPeriodStats = useMemo(
    () => computeOverviewFilterPeriodStats(filteredReportRows),
    [filteredReportRows],
  );

  const tagLabelBySlug = useMemo(
    () => buildTagLabelBySlug(tagOptions),
    [tagOptions],
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    companyList,
    setCompanyList,
    tagOptions,
    loadingList,
    listError,
    listMode,
    totalCount,
    page,
    pageSize,
    totalPages,
    browseAll,
    setBrowsePage,
    refreshCompanyList,
    searchQuery,
    setSearchQuery,
    filterTags,
    setFilterTags,
    excludeFilterTags,
    setExcludeFilterTags,
    filterDataYears,
    setFilterDataYears,
    filterReportYears,
    setFilterReportYears,
    filterSector,
    setFilterSector,
    filterUnverified,
    setFilterUnverified,
    filterApplyUnverifiedToSelectedYears,
    setFilterApplyUnverifiedToSelectedYears,
    filterMissingData,
    setFilterMissingData,
    filtersOpen,
    setFiltersOpen,
    companySort,
    setCompanySort,
    dataYears,
    reportYears,
    sectors,
    allReportRows,
    filteredReportRows,
    sortedReportRows,
    filterPeriodStats,
    tagLabelBySlug,
  };
}

export type SingleCompanyOverviewList = ReturnType<
  typeof useSingleCompanyOverviewList
>;

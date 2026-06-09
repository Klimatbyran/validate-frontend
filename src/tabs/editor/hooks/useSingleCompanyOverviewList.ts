import { useCallback, useEffect, useMemo, useState } from "react";
import { listCompanies } from "../lib/companies-api";
import { fetchTagOptions } from "../lib/tag-options-api";
import type { GarboCompanyListItem, TagOption } from "../lib/types";
import { buildTagLabelBySlug } from "../lib/editor-tag-and-payload-utils";
import {
  type CompanySortId,
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

export function useSingleCompanyOverviewList() {
  const [companyList, setCompanyList] = useState<GarboCompanyListItem[]>([]);
  const [tagOptions, setTagOptions] = useState<TagOption[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
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
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [companySort, setCompanySort] = useState<CompanySortId>("name-asc");

  useEffect(() => {
    let cancelled = false;
    setLoadingList(true);
    setListError(null);
    Promise.all([listCompanies(), fetchTagOptions()])
      .then(([list, tags]) => {
        if (!cancelled) {
          setCompanyList(list);
          setTagOptions(tags);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setListError(e instanceof Error ? e.message : String(e));
          setCompanyList([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshCompanyList = useCallback(() => {
    return listCompanies().then(setCompanyList);
  }, []);

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
      searchQuery,
      filterTags,
      excludeFilterTags,
      filterDataYears,
      filterReportYears,
      filterSector,
      filterUnverified,
      filterApplyUnverifiedToSelectedYears,
    }),
    [
      searchQuery,
      filterTags,
      excludeFilterTags,
      filterDataYears,
      filterReportYears,
      filterSector,
      filterUnverified,
      filterApplyUnverifiedToSelectedYears,
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

  return {
    companyList,
    setCompanyList,
    tagOptions,
    loadingList,
    listError,
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

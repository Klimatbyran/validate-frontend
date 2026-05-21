import { useCallback, useEffect, useMemo, useState } from "react";
import { listCompanies } from "../lib/companies-api";
import { fetchTagOptions } from "../lib/tag-options-api";
import type { GarboCompanyListItem, TagOption } from "../lib/types";
import { getCompanyVerificationOverview } from "../lib/verification";
import { buildTagLabelBySlug } from "../lib/editor-tag-and-payload-utils";
import { getPeriodYear } from "../lib/reporting-period-ui";
import {
  type CompanySortId,
  type FilterUnverifiedOption,
  companyPassesOverviewFilters,
  computeOverviewFilterPeriodStats,
  sortGarboCompanyListRows,
} from "../lib/single-company-overview-list";

export function useSingleCompanyOverviewList() {
  const [companyList, setCompanyList] = useState<GarboCompanyListItem[]>([]);
  const [tagOptions, setTagOptions] = useState<TagOption[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [excludeFilterTags, setExcludeFilterTags] = useState<string[]>([]);
  const [filterYears, setFilterYearsRaw] = useState<string[]>([]);
  const setFilterYears = useCallback((years: string[]) => {
    setFilterYearsRaw(years);
    if (!years.length) setFilterApplyUnverifiedToSelectedYears(false);
  }, []);
  const [filterSector, setFilterSector] = useState("");
  const [filterUnverified, setFilterUnverifiedRaw] =
    useState<FilterUnverifiedOption>("");
  const [filterApplyUnverifiedToSelectedYears, setFilterApplyUnverifiedToSelectedYears] =
    useState(false);
  const setFilterUnverified = useCallback(
    (v: FilterUnverifiedOption) => {
      setFilterUnverifiedRaw(v);
      if (!v) setFilterApplyUnverifiedToSelectedYears(false);
    },
    [],
  );
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

  const years = useMemo(() => {
    const set = new Set<string>();
    companyList.forEach((c) => {
      c.reportingPeriods?.forEach((p) => {
        const y = getPeriodYear(p);
        if (y) set.add(y);
      });
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [companyList]);

  const sectors = useMemo(() => {
    const set = new Set<string>();
    companyList.forEach((c) => {
      const code = c.industry?.subIndustryCode;
      if (code) set.add(code);
    });
    return Array.from(set).sort();
  }, [companyList]);

  const companyOverviewById = useMemo(() => {
    const map = new Map<
      string,
      ReturnType<typeof getCompanyVerificationOverview>
    >();
    companyList.forEach((c) => {
      map.set(c.wikidataId, getCompanyVerificationOverview(c));
    });
    return map;
  }, [companyList]);

  const filterInput = useMemo(
    () => ({
      searchQuery,
      filterTags,
      excludeFilterTags,
      filterYears,
      filterSector,
      filterUnverified,
      filterApplyUnverifiedToSelectedYears,
      companyOverviewById,
    }),
    [
      searchQuery,
      filterTags,
      excludeFilterTags,
      filterYears,
      filterSector,
      filterUnverified,
      filterApplyUnverifiedToSelectedYears,
      companyOverviewById,
    ],
  );

  const filteredCompanies = useMemo(
    () => companyList.filter((c) => companyPassesOverviewFilters(c, filterInput)),
    [companyList, filterInput],
  );

  const sortedCompanies = useMemo(
    () => sortGarboCompanyListRows(filteredCompanies, companySort),
    [filteredCompanies, companySort],
  );

  const filterPeriodStats = useMemo(
    () => computeOverviewFilterPeriodStats(filteredCompanies, companyOverviewById),
    [filteredCompanies, companyOverviewById],
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
    filterYears,
    setFilterYears,
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
    years,
    sectors,
    companyOverviewById,
    filteredCompanies,
    sortedCompanies,
    filterPeriodStats,
    tagLabelBySlug,
  };
}

export type SingleCompanyOverviewList = ReturnType<
  typeof useSingleCompanyOverviewList
>;

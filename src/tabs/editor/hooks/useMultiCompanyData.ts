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
import type { EditorListMode } from "./useSingleCompanyOverviewList";

export function useMultiCompanyData() {
  const [companies, setCompanies] = useState<GarboCompanyListItem[]>([]);
  const [tagOptions, setTagOptions] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listMode, setListMode] = useState<EditorListMode>("idle");
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(EDITOR_COMPANY_INDEX_PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
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
    () => selectedTags.filter((tag) => tag !== NO_TAGS_FILTER_OPTION),
    [selectedTags],
  );

  const fetchIndex = useCallback(
    async (input: {
      mode: Exclude<EditorListMode, "idle">;
      q?: string;
      pageNumber: number;
    }) => {
      const requestId = ++requestRef.current;
      setLoading(true);
      setError(null);
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
        setCompanies(result.companies);
        setTotalCount(result.total);
        setPage(input.pageNumber);
      } catch (e) {
        if (requestId !== requestRef.current) return;
        setError(e instanceof Error ? e.message : String(e));
        setCompanies([]);
        setTotalCount(0);
      } finally {
        if (requestId === requestRef.current) setLoading(false);
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
      setCompanies([]);
      setTotalCount(0);
      setPage(1);
      setError(null);
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

  const reload = useCallback(async () => {
    if (listMode === "search") {
      await fetchIndex({
        mode: "search",
        q: debouncedSearchQuery,
        pageNumber: page,
      });
      return;
    }
    if (listMode === "browse") {
      await fetchIndex({ mode: "browse", pageNumber: page });
    }
  }, [debouncedSearchQuery, fetchIndex, listMode, page]);

  const years = useMemo(() => {
    const uniqueYears = new Set<string>();
    companies.forEach((company) => {
      company.reportingPeriods?.forEach((reportingPeriod) => {
        const year =
          reportingPeriod.startDate?.slice(0, 4) ??
          reportingPeriod.endDate?.slice(0, 4);
        if (year) uniqueYears.add(year);
      });
    });
    return Array.from(uniqueYears).sort((yearA, yearB) =>
      yearB.localeCompare(yearA),
    );
  }, [companies]);

  const tagLabelBySlug = useMemo(
    () => buildTagLabelBySlug(tagOptions),
    [tagOptions],
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    companies,
    setCompanies,
    tagOptions,
    years,
    tagLabelBySlug,
    loading,
    error,
    reload,
    listMode,
    totalCount,
    page,
    pageSize,
    totalPages,
    browseAll,
    setBrowsePage,
    searchQuery,
    setSearchQuery,
    selectedTags,
    setSelectedTags,
  };
}

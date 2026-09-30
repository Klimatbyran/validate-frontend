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
  const [selectedYear, setSelectedYear] = useState("");
  const [facetYears, setFacetYears] = useState<string[]>([]);
  const requestRef = useRef(0);
  const facetsLoadedRef = useRef(false);

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
  const includeNoTags = selectedTags.includes(NO_TAGS_FILTER_OPTION);
  const hasActiveServerFilters =
    serverTags.length > 0 || includeNoTags || Boolean(selectedYear);

  const buildIndexQuery = useCallback(
    (input: {
      mode: Exclude<EditorListMode, "idle">;
      q?: string;
      pageNumber: number;
      includeFacets?: boolean;
    }) => ({
      q: input.mode === "search" ? input.q : undefined,
      offset: (input.pageNumber - 1) * pageSize,
      limit: pageSize,
      includeFacets: input.includeFacets,
      tags: serverTags.length ? serverTags : undefined,
      includeNoTags: includeNoTags || undefined,
      dataYears: selectedYear ? [selectedYear] : undefined,
    }),
    [includeNoTags, pageSize, selectedYear, serverTags],
  );

  const fetchIndex = useCallback(
    async (input: {
      mode: Exclude<EditorListMode, "idle">;
      q?: string;
      pageNumber: number;
      includeFacets?: boolean;
    }) => {
      const requestId = ++requestRef.current;
      setLoading(true);
      setError(null);
      setListMode(input.mode);
      try {
        const result = await listCompaniesIndex(buildIndexQuery(input));
        if (requestId !== requestRef.current) return;
        setCompanies(result.companies);
        setTotalCount(result.total);
        setPage(input.pageNumber);
        if (result.facets) {
          setFacetYears(result.facets.dataYears);
          facetsLoadedRef.current = true;
        }
      } catch (e) {
        if (requestId !== requestRef.current) return;
        setError(e instanceof Error ? e.message : String(e));
        setCompanies([]);
        setTotalCount(0);
      } finally {
        if (requestId === requestRef.current) setLoading(false);
      }
    },
    [buildIndexQuery],
  );

  useEffect(() => {
    if (facetsLoadedRef.current) return;
    let cancelled = false;
    listCompaniesIndex({ offset: 0, limit: 1, includeFacets: true })
      .then((result) => {
        if (cancelled || !result.facets) return;
        setFacetYears(result.facets.dataYears);
        facetsLoadedRef.current = true;
      })
      .catch(() => {
        /* optional */
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      if (hasActiveServerFilters) {
        void fetchIndex({ mode: "browse", pageNumber: 1 });
        return "browse";
      }
      setCompanies([]);
      setTotalCount(0);
      setPage(1);
      setError(null);
      return "idle";
    });
  }, [debouncedSearchQuery, fetchIndex, hasActiveServerFilters]);

  useEffect(() => {
    if (listMode === "idle") {
      if (hasActiveServerFilters) {
        void fetchIndex({ mode: "browse", pageNumber: 1 });
      }
      return;
    }
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
  }, [serverTags, includeNoTags, selectedYear]);

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

  const tagLabelBySlug = useMemo(
    () => buildTagLabelBySlug(tagOptions),
    [tagOptions],
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    companies,
    setCompanies,
    tagOptions,
    years: facetYears,
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
    selectedYear,
    setSelectedYear,
  };
}

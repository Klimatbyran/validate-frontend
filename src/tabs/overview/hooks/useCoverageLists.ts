import { useCallback, useEffect, useState } from "react";
import {
  addCoverageListYear,
  createCoverageList,
  deleteCoverageList,
  deleteCoverageListYear,
  fetchCoverageLists,
  fetchCoverageYearDetail,
  renameCoverageList,
  replaceCoverageYearNames,
  setCoverageEntryMatch,
} from "../lib/coverage-api";
import type {
  CoverageEntry,
  CoverageListSummary,
  CoverageYearDetail,
  CoverageMatchSaveAction,
} from "../lib/coverage-types";

function entryMatchChanged(
  previous: CoverageEntry,
  updated: CoverageEntry,
): boolean {
  return (
    previous.status !== updated.status ||
    previous.matchMethod !== updated.matchMethod ||
    previous.matchedCompany?.wikidataId !== updated.matchedCompany?.wikidataId
  );
}

function mergeCoverageMatchUpdate(
  previous: CoverageYearDetail | null,
  updated: CoverageYearDetail,
): CoverageYearDetail {
  if (!previous) return updated;

  const previousById = new Map(
    previous.entries.map((entry) => [entry.id, entry] as const),
  );

  return {
    ...updated,
    hasAnyReportCount: previous.hasAnyReportCount,
    prodReadyCount: previous.prodReadyCount,
    noReportCount: previous.noReportCount,
    entries: updated.entries.map((entry) => {
      const prior = previousById.get(entry.id);
      if (!prior || entryMatchChanged(prior, entry)) {
        return entry;
      }
      return {
        ...entry,
        registryReports: prior.registryReports ?? [],
      };
    }),
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!listId || year === null) {
        setDetail(null);
        return;
      }
      if (!options?.silent) {
        setIsLoading(true);
      }
      setError(null);
      try {
        setDetail(await fetchCoverageYearDetail(listId, year));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        if (!options?.silent) {
          setDetail(null);
        }
      } finally {
        if (!options?.silent) {
          setIsLoading(false);
        }
      }
    },
    [listId, year],
  );

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  return {
    detail,
    isLoading,
    error,
    refresh: () => loadDetail(),
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
      void loadDetail({ silent: true });
      return updated;
    },
  };
}

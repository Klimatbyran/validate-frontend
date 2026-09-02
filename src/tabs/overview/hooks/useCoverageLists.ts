import { useCallback, useEffect, useState } from "react";
import {
  addCoverageListYear,
  createCoverageList,
  deleteCoverageList,
  deleteCoverageListYear,
  fetchCoverageLists,
  renameCoverageList,
  replaceCoverageYearNames,
  updateCoverageYearEdition,
} from "../lib/coverage-api";
import type {
  CoverageListSummary,
  CoverageYearSummary,
} from "../lib/coverage-types";
import { patchListYearSummary } from "../lib/coverage-year-detail-state";

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
      setLists((previous) =>
        patchListYearSummary(previous, listId, year, stats),
      );
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

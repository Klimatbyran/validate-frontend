import { useCallback, useEffect, useState } from "react";
import {
  addCoverageListYear,
  createCoverageList,
  createCoverageListGroup,
  deleteCoverageList,
  deleteCoverageListGroup,
  deleteCoverageListYear,
  fetchCoverageListGroups,
  fetchCoverageLists,
  updateCoverageList,
  replaceCoverageYearNames,
  updateCoverageListGroup,
  updateCoverageYearEdition,
} from "../lib/coverage-api";
import type {
  CoverageListGroup,
  CoverageListSummary,
  CoverageYearSummary,
} from "../lib/coverage-types";
import { patchListYearSummary } from "../lib/coverage-year-detail-state";

export function useCoverageLists() {
  const [lists, setLists] = useState<CoverageListSummary[]>([]);
  const [groups, setGroups] = useState<CoverageListGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLists = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      const [listsResponse, groupsResponse] = await Promise.all([
        fetchCoverageLists(),
        fetchCoverageListGroups(),
      ]);
      setLists(listsResponse.lists);
      setGroups(groupsResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLists([]);
      setGroups([]);
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
    groups,
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
      groupId?: string | null;
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
    updateList: async (
      listId: string,
      input: { name?: string; groupId?: string | null },
    ) => {
      const updated = await updateCoverageList(listId, input);
      await loadLists(true);
      return updated;
    },
    renameList: async (listId: string, name: string) => {
      const updated = await updateCoverageList(listId, { name });
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
    createGroup: async (input: { slug: string; label: string }) => {
      const created = await createCoverageListGroup(input);
      await loadLists(true);
      return created;
    },
    updateGroup: async (
      groupId: string,
      input: { slug?: string; label?: string },
    ) => {
      const updated = await updateCoverageListGroup(groupId, input);
      await loadLists(true);
      return updated;
    },
    deleteGroup: async (groupId: string) => {
      await deleteCoverageListGroup(groupId);
      await loadLists(true);
    },
  };
}

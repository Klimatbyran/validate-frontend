import { COVERAGE_PAGE_SIZE, fetchCoverageYearDetail } from "./coverage-api";
import type {
  CoverageEntry,
  CoverageEntryFilter,
  CoverageListSummary,
  CoverageYearDetail,
  CoverageYearSummary,
  RegistryReportPill,
} from "./coverage-types";
import type { SaveReportSuccess } from "@/tabs/crawler/lib/crawler-types";

const REGISTRY_REFRESH_POLL_MS = 2000;
const REGISTRY_REFRESH_MAX_POLLS = 120;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function waitForRegistryRefresh(
  listId: string,
  year: number,
): Promise<CoverageYearDetail> {
  for (let attempt = 0; attempt < REGISTRY_REFRESH_MAX_POLLS; attempt += 1) {
    await sleep(REGISTRY_REFRESH_POLL_MS);
    const page = await fetchCoverageYearDetail(listId, year, {
      offset: 0,
      limit: COVERAGE_PAGE_SIZE,
      filter: "all",
      includeRegistry: true,
    });
    if (!page.registryRefreshInProgress) {
      return page;
    }
  }
  throw new Error("Registry refresh timed out");
}

export function applyYearStats(
  previous: CoverageYearDetail | null,
  stats: Pick<
    CoverageYearDetail,
    | "hasAnyReportCount"
    | "prodReadyCount"
    | "noReportCount"
    | "registryRefreshedAt"
    | "registryRefreshInProgress"
  >,
): CoverageYearDetail | null {
  if (!previous) return previous;
  return { ...previous, ...stats };
}

function entryMatchChanged(
  previous: CoverageEntry,
  updated: CoverageEntry,
): boolean {
  return (
    previous.status !== updated.status ||
    previous.matchMethod !== updated.matchMethod ||
    previous.matchedCompany?.id !== updated.matchedCompany?.id ||
    previous.matchedCompany?.wikidataId !== updated.matchedCompany?.wikidataId
  );
}

export function mergeCoverageMatchUpdate(
  previous: CoverageYearDetail | null,
  updated: CoverageYearDetail,
  activeFilter: CoverageEntryFilter = "all",
): CoverageYearDetail {
  if (!previous) return updated;

  const yearFields = {
    totalNames: updated.totalNames,
    matchedCount: updated.matchedCount,
    ambiguousCount: updated.ambiguousCount,
    coveragePercent: updated.coveragePercent,
    hasAnyReportCount: updated.hasAnyReportCount,
    prodReadyCount: updated.prodReadyCount,
    noReportCount: updated.noReportCount,
    registryRefreshedAt: updated.registryRefreshedAt,
  };

  const isPartialEntryUpdate =
    updated.entries.length > 0 &&
    updated.entries.length < previous.entries.length;

  if (isPartialEntryUpdate) {
    const patchById = new Map(
      updated.entries.map((entry) => [entry.id, entry] as const),
    );
    let removedForFilter = 0;
    const entries = previous.entries.flatMap((entry) => {
      const patch = patchById.get(entry.id);
      if (!patch) return [entry];
      const next = {
        ...patch,
        registryReports:
          patch.registryReports.length > 0
            ? patch.registryReports
            : entry.registryReports,
      };
      if (
        activeFilter === "matched" ||
        activeFilter === "missing" ||
        activeFilter === "ambiguous"
      ) {
        if (next.status !== activeFilter) {
          removedForFilter += 1;
          return [];
        }
      }
      return [next];
    });

    const previousFilteredCount =
      previous.filteredCount ?? previous.entries.length;

    return {
      ...previous,
      ...yearFields,
      entries,
      filteredCount: Math.max(0, previousFilteredCount - removedForFilter),
    };
  }

  const previousById = new Map(
    previous.entries.map((entry) => [entry.id, entry] as const),
  );

  let anyMatchChanged = false;
  const entries = updated.entries.map((entry) => {
    const prior = previousById.get(entry.id);
    if (!prior || entryMatchChanged(prior, entry)) {
      anyMatchChanged = true;
      return entry;
    }
    return {
      ...entry,
      registryReports: prior.registryReports ?? [],
    };
  });

  if (anyMatchChanged) {
    return {
      ...updated,
      ...yearFields,
      filteredCount: previous.filteredCount,
      offset: previous.offset,
      limit: previous.limit,
      hasMore: previous.hasMore,
      entries: previous.entries.map(
        (entry) =>
          updated.entries.find((patch) => patch.id === entry.id) ?? entry,
      ),
    };
  }

  return {
    ...updated,
    ...yearFields,
    hasAnyReportCount: previous.hasAnyReportCount,
    prodReadyCount: previous.prodReadyCount,
    noReportCount: previous.noReportCount,
    entries,
  };
}

export function savedReportToPill(
  saved: SaveReportSuccess,
): RegistryReportPill {
  return {
    reportId: saved.id,
    reportYear: saved.reportYear,
    companyName: saved.companyName,
    wikidataId: saved.wikidataId ?? null,
    url: saved.url,
    sourceUrl: saved.url,
    matchMethod: saved.wikidataId ? "wikidata" : "name",
    prodReady: false,
    runStatus: "not_run",
    reportTypeId: saved.reportTypeId ?? null,
    reportTypeSlug: saved.reportTypeSlug ?? null,
    reportTypeLabel: saved.reportTypeLabel ?? null,
  };
}

export function removeRegistryReportFromEntry(
  detail: CoverageYearDetail,
  entryId: string,
  reportId: string,
): CoverageYearDetail {
  const entryIndex = detail.entries.findIndex((entry) => entry.id === entryId);
  if (entryIndex === -1) return detail;

  const entry = detail.entries[entryIndex];
  const existingReports = entry.registryReports ?? [];
  const removed = existingReports.find(
    (report) => report.reportId === reportId,
  );
  if (!removed) return detail;

  const nextReports = existingReports.filter(
    (report) => report.reportId !== reportId,
  );
  const entries = [...detail.entries];
  entries[entryIndex] = {
    ...entry,
    registryReports: nextReports,
  };

  return {
    ...detail,
    entries,
    hasAnyReportCount:
      nextReports.length === 0
        ? Math.max(0, detail.hasAnyReportCount - 1)
        : detail.hasAnyReportCount,
    noReportCount:
      nextReports.length === 0
        ? detail.noReportCount + 1
        : detail.noReportCount,
    prodReadyCount: removed.prodReady
      ? Math.max(0, detail.prodReadyCount - 1)
      : detail.prodReadyCount,
  };
}

export function updateRegistryReportInEntry(
  detail: CoverageYearDetail,
  entryId: string,
  reportId: string,
  updated: RegistryReportPill,
): CoverageYearDetail {
  const entryIndex = detail.entries.findIndex((entry) => entry.id === entryId);
  if (entryIndex === -1) return detail;

  const entry = detail.entries[entryIndex];
  const existingReports = entry.registryReports ?? [];
  const reportIndex = existingReports.findIndex(
    (report) => report.reportId === reportId,
  );
  if (reportIndex === -1) return detail;

  const previous = existingReports[reportIndex]!;
  const nextReports = [...existingReports];
  nextReports[reportIndex] = updated;

  const entries = [...detail.entries];
  entries[entryIndex] = {
    ...entry,
    registryReports: nextReports,
  };

  return {
    ...detail,
    entries,
    prodReadyCount:
      previous.prodReady && !updated.prodReady
        ? Math.max(0, detail.prodReadyCount - 1)
        : detail.prodReadyCount,
  };
}

export function addRegistryReportToEntry(
  detail: CoverageYearDetail,
  entryId: string,
  saved: SaveReportSuccess,
): CoverageYearDetail {
  const entryIndex = detail.entries.findIndex((entry) => entry.id === entryId);
  if (entryIndex === -1) return detail;

  const entry = detail.entries[entryIndex];
  const existingReports = entry.registryReports ?? [];
  if (
    existingReports.some(
      (report) => report.reportId === saved.id || report.url === saved.url,
    )
  ) {
    return detail;
  }

  const hadReports = existingReports.length > 0;
  const nextReports = [...existingReports, savedReportToPill(saved)];
  const entries = [...detail.entries];
  entries[entryIndex] = {
    ...entry,
    registryReports: nextReports,
  };

  return {
    ...detail,
    entries,
    hasAnyReportCount: hadReports
      ? detail.hasAnyReportCount
      : detail.hasAnyReportCount + 1,
    noReportCount: hadReports
      ? detail.noReportCount
      : Math.max(0, detail.noReportCount - 1),
  };
}

export function applyEntryRegistryRefresh(
  previous: CoverageYearDetail,
  updated: CoverageYearDetail,
  entryId: string,
  activeFilter: CoverageEntryFilter = "all",
): CoverageYearDetail {
  const refreshed = updated.entries.find((entry) => entry.id === entryId);
  if (!refreshed) {
    return {
      ...previous,
      hasAnyReportCount: updated.hasAnyReportCount,
      prodReadyCount: updated.prodReadyCount,
      noReportCount: updated.noReportCount,
      registryRefreshedAt: updated.registryRefreshedAt,
    };
  }

  let removedForFilter = 0;
  const entries = previous.entries.flatMap((entry) => {
    if (entry.id !== entryId) return [entry];
    const next = {
      ...entry,
      ...refreshed,
      registryReports: refreshed.registryReports ?? [],
    };
    if (
      activeFilter === "registryInProd" ||
      activeFilter === "registryOnly" ||
      activeFilter === "registryMissing"
    ) {
      const hasReports = (next.registryReports?.length ?? 0) > 0;
      const hasProdReady = (next.registryReports ?? []).some(
        (report) => report.prodReady,
      );
      const stays =
        activeFilter === "registryInProd"
          ? hasProdReady
          : activeFilter === "registryOnly"
            ? hasReports && !hasProdReady
            : !hasReports;
      if (!stays) {
        removedForFilter += 1;
        return [];
      }
    }
    return [next];
  });

  const previousFilteredCount =
    previous.filteredCount ?? previous.entries.length;

  return {
    ...previous,
    hasAnyReportCount: updated.hasAnyReportCount,
    prodReadyCount: updated.prodReadyCount,
    noReportCount: updated.noReportCount,
    registryRefreshedAt: updated.registryRefreshedAt,
    entries,
    filteredCount: Math.max(0, previousFilteredCount - removedForFilter),
  };
}

export function patchListYearSummary(
  lists: CoverageListSummary[],
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
): CoverageListSummary[] {
  return lists.map((list) => {
    if (list.id !== listId) return list;
    return {
      ...list,
      years: list.years.map((yearRow) =>
        yearRow.year === year ? { ...yearRow, ...stats } : yearRow,
      ),
    };
  });
}

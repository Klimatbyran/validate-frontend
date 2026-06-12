import type { ReportingPeriod } from "@/tabs/errors/types";
import type { OverviewFilters, OverviewRow } from "./overview-types";

export function companyReportIdFromPeriods(
  periods: ReportingPeriod[],
): string | null {
  for (const period of periods) {
    const id = period.companyReportId ?? period.companyReport?.id ?? null;
    if (id) return id;
  }
  return null;
}

export function rowMissingRegistryReport(row: OverviewRow): boolean {
  return row.statuses.report?.kind === "missing" || row.registryEntry == null;
}

export function rowMissingCompanyReport(row: OverviewRow): boolean {
  if (row.companyReportId) return false;
  return row.statuses.companyReport?.kind !== "ok";
}

export function rowNotRunInPipeline(row: OverviewRow): boolean {
  const kind = row.statuses.pipeline?.kind;
  return kind === "missing" || kind == null;
}

export function rowMatchesGapFilters(
  row: OverviewRow,
  filters: Pick<
    OverviewFilters,
    | "missingRegistryOnly"
    | "missingCompanyReportOnly"
    | "notRunInPipelineOnly"
  >,
): boolean {
  if (filters.missingRegistryOnly && !rowMissingRegistryReport(row)) {
    return false;
  }
  if (filters.missingCompanyReportOnly && !rowMissingCompanyReport(row)) {
    return false;
  }
  if (filters.notRunInPipelineOnly && !rowNotRunInPipeline(row)) {
    return false;
  }
  return true;
}

export function overviewFiltersAreActive(filters: OverviewFilters): boolean {
  return (
    Boolean(filters.searchQuery.trim()) ||
    filters.reportYears.length > 0 ||
    filters.tagSlugs.length > 0 ||
    filters.statusFilters.length > 0 ||
    filters.missingRegistryOnly ||
    filters.missingCompanyReportOnly ||
    filters.notRunInPipelineOnly
  );
}

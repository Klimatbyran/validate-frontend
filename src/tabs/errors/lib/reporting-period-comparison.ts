import {
  getPeriodShellKey,
  UNLINKED_REPORT_SHELL_KEY,
} from "@/tabs/editor/lib/company-report-shells";
import { getPeriodDataYear } from "@/tabs/editor/lib/reporting-period-ui";
import type { ReportingPeriod } from "../types";
import { getPeriodReportYearFromApi } from "./emissions";

export type ReportingPeriodComparisonSlot = {
  shellKey: string;
  companyReportId: string | null;
  reportYear: number | null;
  stagePeriod: ReportingPeriod | null;
  prodPeriod: ReportingPeriod | null;
};

function periodMatchesDataYear(period: ReportingPeriod, dataYear: number): boolean {
  const dataYearKey = getPeriodDataYear(period);
  if (!dataYearKey) return false;
  const parsed = Number(dataYearKey);
  return Number.isFinite(parsed) && parsed === dataYear;
}

function periodMatchesReportYearFilter(
  period: ReportingPeriod,
  reportYear: number | null,
): boolean {
  if (reportYear == null) return true;
  return getPeriodReportYearFromApi(period) === reportYear;
}

/** All reporting periods matching data year and optional PDF report year. */
export function pickReportingPeriodsForFilters(
  reportingPeriods: ReportingPeriod[] | undefined,
  dataYear: number,
  reportYear?: number | null,
): ReportingPeriod[] {
  if (!reportingPeriods?.length) return [];
  const reportYearFilter = reportYear ?? null;
  return reportingPeriods.filter(
    (period) =>
      periodMatchesDataYear(period, dataYear) &&
      periodMatchesReportYearFilter(period, reportYearFilter),
  );
}

/** One period per CompanyReport shell, unioned across stage and prod. */
export function buildReportingPeriodComparisonSlots(
  stagePeriods: ReportingPeriod[] | undefined,
  prodPeriods: ReportingPeriod[] | undefined,
  dataYear: number,
  reportYear: number | null,
): ReportingPeriodComparisonSlot[] {
  const stageMatched = pickReportingPeriodsForFilters(
    stagePeriods,
    dataYear,
    reportYear,
  );
  const prodMatched = pickReportingPeriodsForFilters(
    prodPeriods,
    dataYear,
    reportYear,
  );

  const byShell = new Map<
    string,
    { stage?: ReportingPeriod; prod?: ReportingPeriod }
  >();

  for (const period of stageMatched) {
    const shellKey = getPeriodShellKey(period);
    const entry = byShell.get(shellKey) ?? {};
    entry.stage = period;
    byShell.set(shellKey, entry);
  }

  for (const period of prodMatched) {
    const shellKey = getPeriodShellKey(period);
    const entry = byShell.get(shellKey) ?? {};
    entry.prod = period;
    byShell.set(shellKey, entry);
  }

  return Array.from(byShell.entries())
    .map(([shellKey, { stage, prod }]) => {
      const anchor = stage ?? prod;
      return {
        shellKey,
        companyReportId:
          shellKey === UNLINKED_REPORT_SHELL_KEY ? null : shellKey,
        reportYear: anchor ? getPeriodReportYearFromApi(anchor) : null,
        stagePeriod: stage ?? null,
        prodPeriod: prod ?? null,
      };
    })
    .sort((a, b) => {
      const yearA = a.reportYear ?? 0;
      const yearB = b.reportYear ?? 0;
      if (yearA !== yearB) return yearB - yearA;
      return (a.companyReportId ?? "").localeCompare(b.companyReportId ?? "");
    });
}

export function findReportingPeriodForShell(
  reportingPeriods: ReportingPeriod[] | undefined,
  dataYear: number,
  reportYear: number | null,
  shellKey: string,
): ReportingPeriod | null {
  return (
    pickReportingPeriodsForFilters(reportingPeriods, dataYear, reportYear).find(
      (period) => getPeriodShellKey(period) === shellKey,
    ) ?? null
  );
}

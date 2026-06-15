import {
  groupPeriodsByReportShell,
  UNLINKED_REPORT_SHELL_KEY,
  type CompanyReportShellGroup,
} from "./company-report-shells";
import { getPeriodDataYear } from "./reporting-period-ui";
import type {
  GarboCompanyDetail,
  GarboRegistryReportSummary,
  GarboReportingPeriodSummary,
} from "./types";

export type CompanyReportOverviewRow = {
  shellKey: string;
  companyReportId: string;
  reportYear: string | null;
  registryReportId: string | null;
  registryReport: GarboRegistryReportSummary | null;
  periodDataYears: string[];
  periodCount: number;
  sampleSourceUrl: string | null;
  sampleS3Url: string | null;
  sampleReportUrl: string | null;
};

function firstPeriodMeta(periods: GarboReportingPeriodSummary[]) {
  const period = periods[0];
  if (!period) {
    return {
      sampleSourceUrl: null,
      sampleS3Url: null,
      sampleReportUrl: null,
      companyReport: null,
    };
  }
  return {
    sampleSourceUrl: period.sourceUrl ?? period.reportSourceUrl ?? null,
    sampleS3Url: period.s3Url ?? period.reportS3Url ?? null,
    sampleReportUrl: period.reportURL ?? null,
    companyReport: period.companyReport ?? null,
  };
}

function overviewRowFromShell(
  shell: CompanyReportShellGroup,
): CompanyReportOverviewRow {
  const meta = firstPeriodMeta(shell.periods);
  const companyReport = meta.companyReport;
  const registryReport = companyReport?.report ?? null;

  const periodDataYears = Array.from(
    new Set(
      shell.periods
        .map((period) => getPeriodDataYear(period))
        .filter((year): year is string => Boolean(year)),
    ),
  ).sort((a, b) => b.localeCompare(a));

  return {
    shellKey: shell.shellKey,
    companyReportId: shell.companyReportId,
    reportYear: shell.reportYear,
    registryReportId:
      companyReport?.registryReportId?.trim() ||
      registryReport?.id?.trim() ||
      null,
    registryReport,
    periodDataYears,
    periodCount: shell.periods.length,
    sampleSourceUrl: meta.sampleSourceUrl,
    sampleS3Url: meta.sampleS3Url,
    sampleReportUrl: meta.sampleReportUrl,
  };
}

export function buildCompanyReportOverview(
  company: GarboCompanyDetail,
): CompanyReportOverviewRow[] {
  const periods = company.reportingPeriods ?? [];
  return groupPeriodsByReportShell(periods).map(overviewRowFromShell);
}

export function isUnlinkedCompanyReportRow(
  row: CompanyReportOverviewRow,
): boolean {
  return row.shellKey === UNLINKED_REPORT_SHELL_KEY;
}

export function registryYearMismatch(row: CompanyReportOverviewRow): boolean {
  const companyYear = row.reportYear?.trim();
  const registryYear = row.registryReport?.reportYear?.trim();
  if (!companyYear || !registryYear) return false;
  return companyYear !== registryYear;
}

const REPORT_CATALOG_YEAR_PATTERN = /^\d{4}$/;
const REPORT_CATALOG_YEAR_MIN = 1990;
const REPORT_CATALOG_YEAR_MAX = 2100;

export function isValidReportCatalogYear(year: string): boolean {
  if (!REPORT_CATALOG_YEAR_PATTERN.test(year)) return false;
  const n = Number(year);
  return n >= REPORT_CATALOG_YEAR_MIN && n <= REPORT_CATALOG_YEAR_MAX;
}

export function pickReportLink(row: CompanyReportOverviewRow): string | null {
  const registry = row.registryReport;
  return (
    registry?.url?.trim() ||
    registry?.sourceUrl?.trim() ||
    row.sampleReportUrl?.trim() ||
    row.sampleSourceUrl?.trim() ||
    null
  );
}

export function pickS3Link(row: CompanyReportOverviewRow): string | null {
  return row.registryReport?.s3Url?.trim() || row.sampleS3Url?.trim() || null;
}

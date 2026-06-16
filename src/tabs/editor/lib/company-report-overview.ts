import { UNLINKED_REPORT_SHELL_KEY } from "./company-report-shells";
import { getPeriodDataYear } from "./reporting-period-ui";
import type {
  GarboCompanyReportSummary,
  GarboReportingPeriodSummary,
} from "./types";
import { lookupPersistedCompanyReportYear } from "./reporting-period-ui";

export type CompanyReportOverviewRow = {
  shellKey: string;
  companyReportId: string;
  companyReportYear: string | null;
  registryReportId: string | null;
  registryReport: GarboRegistryReportSummary | null;
  periodDataYears: string[];
  periodCount: number;
  periodIds: string[];
  sampleSourceUrl: string | null;
  sampleS3Url: string | null;
  sampleReportUrl: string | null;
  isUnlinked: boolean;
};

const REPORT_CATALOG_YEAR_PATTERN = /^\d{4}$/;
const REPORT_CATALOG_YEAR_MIN = 1990;

export function getReportCatalogYearMax(): number {
  return new Date().getFullYear();
}

export function isValidReportCatalogYear(year: string): boolean {
  if (!REPORT_CATALOG_YEAR_PATTERN.test(year)) return false;
  const n = Number(year);
  return n >= REPORT_CATALOG_YEAR_MIN && n <= getReportCatalogYearMax();
}

function periodShellId(period: GarboReportingPeriodSummary): string | null {
  return (
    period.companyReportId?.trim() || period.companyReport?.id?.trim() || null
  );
}

function collectPeriodDataYears(
  periods: GarboReportingPeriodSummary[],
): string[] {
  return Array.from(
    new Set(
      periods
        .map((period) => getPeriodDataYear(period))
        .filter((year): year is string => Boolean(year)),
    ),
  ).sort((a, b) => b.localeCompare(a));
}

function firstPeriodMeta(periods: GarboReportingPeriodSummary[]) {
  const period = periods[0];
  if (!period) {
    return {
      sampleSourceUrl: null,
      sampleS3Url: null,
      sampleReportUrl: null,
    };
  }
  return {
    sampleSourceUrl: period.sourceUrl ?? period.reportSourceUrl ?? null,
    sampleS3Url: period.s3Url ?? period.reportS3Url ?? null,
    sampleReportUrl: period.reportURL ?? null,
  };
}

function buildShellYearById(
  companyReports: GarboCompanyReportSummary[],
  reportingPeriods: GarboReportingPeriodSummary[],
): Map<string, string> {
  const years = new Map<string, string>();
  for (const shell of companyReports) {
    const id = shell.id?.trim();
    const year = shell.reportYear?.trim();
    if (id && year) years.set(id, year);
  }
  for (const period of reportingPeriods) {
    const id =
      period.companyReportId?.trim() ?? period.companyReport?.id?.trim();
    if (!id || years.has(id)) continue;
    const year = period.companyReport?.reportYear?.trim();
    if (year) years.set(id, year);
  }
  return years;
}

function rowFromCompanyReport(
  companyReport: GarboCompanyReportSummary,
  periods: GarboReportingPeriodSummary[],
  shellYearById: Map<string, string>,
): CompanyReportOverviewRow {
  const registryReport = companyReport.report ?? null;
  const meta = firstPeriodMeta(periods);
  const shellId = companyReport.id!.trim();

  return {
    shellKey: shellId,
    companyReportId: shellId,
    companyReportYear:
      companyReport.reportYear?.trim() ||
      shellYearById.get(shellId) ||
      lookupPersistedCompanyReportYear(shellId, [companyReport], periods) ||
      null,
    registryReportId:
      companyReport.registryReportId?.trim() ||
      registryReport?.id?.trim() ||
      null,
    registryReport,
    periodDataYears: collectPeriodDataYears(periods),
    periodCount: periods.length,
    periodIds: periods
      .map((period) => period.id?.trim())
      .filter((id): id is string => Boolean(id)),
    sampleSourceUrl: meta.sampleSourceUrl,
    sampleS3Url: meta.sampleS3Url,
    sampleReportUrl: meta.sampleReportUrl,
    isUnlinked: false,
  };
}

function rowFromOrphanPeriods(
  shellId: string,
  periods: GarboReportingPeriodSummary[],
  shellYearById: Map<string, string>,
): CompanyReportOverviewRow {
  const embedded = periods[0]?.companyReport;
  const registryReport = embedded?.report ?? null;
  const meta = firstPeriodMeta(periods);

  return {
    shellKey: shellId,
    companyReportId: shellId,
    companyReportYear:
      shellYearById.get(shellId) ||
      lookupPersistedCompanyReportYear(shellId, [], periods) ||
      embedded?.reportYear?.trim() ||
      null,
    registryReportId:
      embedded?.registryReportId?.trim() || registryReport?.id?.trim() || null,
    registryReport,
    periodDataYears: collectPeriodDataYears(periods),
    periodCount: periods.length,
    periodIds: periods
      .map((period) => period.id?.trim())
      .filter((id): id is string => Boolean(id)),
    sampleSourceUrl: meta.sampleSourceUrl,
    sampleS3Url: meta.sampleS3Url,
    sampleReportUrl: meta.sampleReportUrl,
    isUnlinked: false,
  };
}

function unlinkedRow(
  periods: GarboReportingPeriodSummary[],
): CompanyReportOverviewRow {
  const meta = firstPeriodMeta(periods);

  return {
    shellKey: UNLINKED_REPORT_SHELL_KEY,
    companyReportId: "",
    companyReportYear: null,
    registryReportId: null,
    registryReport: null,
    periodDataYears: collectPeriodDataYears(periods),
    periodCount: periods.length,
    periodIds: periods
      .map((period) => period.id?.trim())
      .filter((id): id is string => Boolean(id)),
    sampleSourceUrl: meta.sampleSourceUrl,
    sampleS3Url: meta.sampleS3Url,
    sampleReportUrl: meta.sampleReportUrl,
    isUnlinked: true,
  };
}

export function buildCompanyReportOverview(
  companyReports: GarboCompanyReportSummary[],
  reportingPeriods: GarboReportingPeriodSummary[],
): CompanyReportOverviewRow[] {
  const periodsByShell = new Map<string, GarboReportingPeriodSummary[]>();
  const unlinkedPeriods: GarboReportingPeriodSummary[] = [];

  for (const period of reportingPeriods) {
    const shellId = periodShellId(period);
    if (!shellId) {
      unlinkedPeriods.push(period);
      continue;
    }
    const bucket = periodsByShell.get(shellId) ?? [];
    bucket.push(period);
    periodsByShell.set(shellId, bucket);
  }

  const rows: CompanyReportOverviewRow[] = [];

  const shellYearById = buildShellYearById(companyReports, reportingPeriods);

  for (const companyReport of companyReports) {
    const id = companyReport.id?.trim();
    if (!id) continue;
    const periods = periodsByShell.get(id) ?? [];
    periodsByShell.delete(id);
    rows.push(rowFromCompanyReport(companyReport, periods, shellYearById));
  }

  for (const [shellId, periods] of periodsByShell) {
    rows.push(rowFromOrphanPeriods(shellId, periods, shellYearById));
  }

  if (unlinkedPeriods.length > 0) {
    rows.push(unlinkedRow(unlinkedPeriods));
  }

  return rows.sort((a, b) => {
    if (a.isUnlinked !== b.isUnlinked) return a.isUnlinked ? 1 : -1;
    const yearA = a.companyReportYear ?? "";
    const yearB = b.companyReportYear ?? "";
    if (yearA !== yearB) return yearB.localeCompare(yearA);
    return a.companyReportId.localeCompare(b.companyReportId);
  });
}

export function isUnlinkedCompanyReportRow(
  row: CompanyReportOverviewRow,
): boolean {
  return row.isUnlinked;
}

/** True when shell `reportYear` and linked registry `reportYear` differ. */
export function registryYearMismatch(row: CompanyReportOverviewRow): boolean {
  const shellYear = row.companyReportYear?.trim();
  const registryYear = row.registryReport?.reportYear?.trim();
  if (!shellYear || !registryYear) return false;
  return shellYear !== registryYear;
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

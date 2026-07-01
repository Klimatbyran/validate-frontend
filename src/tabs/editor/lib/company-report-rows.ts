import type {
  GarboCompanyListItem,
  GarboReportingPeriodSummary,
} from "./types";
import {
  getPeriodDataYear,
  getPersistedCompanyReportYearFromPeriod,
} from "./reporting-period-ui";
import {
  getPeriodShellKey,
  UNLINKED_REPORT_SHELL_KEY,
} from "./company-report-shells";
import {
  getCompanyVerificationOverview,
  type CompanyVerificationOverview,
} from "./verification";

export type CompanyReportRow = {
  rowKey: string;
  company: GarboCompanyListItem;
  companyReportId: string;
  reportYear: string | null;
  periods: GarboReportingPeriodSummary[];
  overview: CompanyVerificationOverview;
};

export function expandCompaniesToReportRows(
  companies: GarboCompanyListItem[],
): CompanyReportRow[] {
  const rows: CompanyReportRow[] = [];

  for (const company of companies) {
    const periods = company.reportingPeriods ?? [];
    const byReport = new Map<string, GarboReportingPeriodSummary[]>();

    for (const period of periods) {
      const reportKey = getPeriodShellKey(period);
      const bucket = byReport.get(reportKey) ?? [];
      bucket.push(period);
      byReport.set(reportKey, bucket);
    }

    if (byReport.size === 0) {
      rows.push({
        rowKey: `${company.id}:${UNLINKED_REPORT_SHELL_KEY}`,
        company,
        companyReportId: "",
        reportYear: null,
        periods: [],
        overview: getCompanyVerificationOverview({
          ...company,
          reportingPeriods: [],
        }),
      });
      continue;
    }

    for (const [reportKey, reportPeriods] of byReport) {
      const reportYear =
        reportPeriods
          .map((p) => getPersistedCompanyReportYearFromPeriod(p))
          .find((y) => y != null) ?? null;

      rows.push({
        rowKey: `${company.id}:${reportKey}`,
        company,
        companyReportId:
          reportKey === UNLINKED_REPORT_SHELL_KEY ? "" : reportKey,
        reportYear,
        periods: reportPeriods,
        overview: getCompanyVerificationOverview({
          ...company,
          reportingPeriods: reportPeriods,
        }),
      });
    }
  }

  return rows;
}

export function reportRowHasDataYears(
  row: CompanyReportRow,
  dataYears: string[],
): boolean {
  if (!dataYears.length) return true;
  return dataYears.every((year) =>
    row.periods.some((p) => getPeriodDataYear(p) === year),
  );
}

export function reportRowMatchesReportYearFilter(
  row: CompanyReportRow,
  reportYears: string[],
): boolean {
  if (!reportYears.length) return true;
  if (!row.reportYear) return false;
  return reportYears.includes(row.reportYear);
}

export function collectDataYearsFromCompanies(
  companies: GarboCompanyListItem[],
): string[] {
  const years = new Set<string>();
  for (const company of companies) {
    for (const period of company.reportingPeriods ?? []) {
      const y = getPeriodDataYear(period);
      if (y) years.add(y);
    }
  }
  return Array.from(years).sort((a, b) => b.localeCompare(a));
}

export function collectReportYearsFromCompanies(
  companies: GarboCompanyListItem[],
): string[] {
  const years = new Set<string>();
  for (const company of companies) {
    for (const period of company.reportingPeriods ?? []) {
      const y = getPersistedCompanyReportYearFromPeriod(period);
      if (y) years.add(y);
    }
  }
  return Array.from(years).sort((a, b) => b.localeCompare(a));
}

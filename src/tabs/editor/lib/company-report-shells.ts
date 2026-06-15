import type { GarboReportingPeriodSummary } from "./types";
import { getPersistedCompanyReportYearFromPeriod } from "./reporting-period-ui";

export const UNLINKED_REPORT_SHELL_KEY = "__unlinked__";

export type CompanyReportShellGroup = {
  shellKey: string;
  companyReportId: string;
  reportYear: string | null;
  periods: GarboReportingPeriodSummary[];
};

export function getPeriodShellKey(period: GarboReportingPeriodSummary): string {
  const id =
    period.companyReportId?.trim() || period.companyReport?.id?.trim() || "";
  return id || UNLINKED_REPORT_SHELL_KEY;
}

export function groupPeriodsByReportShell(
  periods: GarboReportingPeriodSummary[],
): CompanyReportShellGroup[] {
  const byShell = new Map<string, GarboReportingPeriodSummary[]>();

  for (const period of periods) {
    const shellKey = getPeriodShellKey(period);
    const bucket = byShell.get(shellKey) ?? [];
    bucket.push(period);
    byShell.set(shellKey, bucket);
  }

  const groups: CompanyReportShellGroup[] = [];

  for (const [shellKey, shellPeriods] of byShell) {
    const reportYear =
      shellPeriods
        .map((p) => getPersistedCompanyReportYearFromPeriod(p))
        .find((y) => y != null) ?? null;

    groups.push({
      shellKey,
      companyReportId: shellKey === UNLINKED_REPORT_SHELL_KEY ? "" : shellKey,
      reportYear,
      periods: shellPeriods,
    });
  }

  return groups.sort((a, b) => {
    const yearA = a.reportYear ?? "";
    const yearB = b.reportYear ?? "";
    if (yearA !== yearB) return yearB.localeCompare(yearA);
    return a.companyReportId.localeCompare(b.companyReportId);
  });
}

export function formatReportShellOptionLabel(
  shell: CompanyReportShellGroup,
  labels: {
    reportYear: string;
    noReportYear: string;
    unlinkedShell: string;
    companyReportId: string;
  },
): string {
  if (shell.shellKey === UNLINKED_REPORT_SHELL_KEY) {
    return labels.unlinkedShell;
  }

  const yearPart = shell.reportYear
    ? `${labels.reportYear} ${shell.reportYear}`
    : labels.noReportYear;

  return `${yearPart} · ${shell.companyReportId}`;
}

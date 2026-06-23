import type { GarboReportingPeriodSummary } from "./types";
import { getPersistedCompanyReportYearFromPeriod } from "./reporting-period-ui";

export const UNLINKED_REPORT_SHELL_KEY = "__unlinked__";

/** Add-period flow: create a new CompanyReport instead of attaching to an existing shell. */
export const NEW_REPORT_SHELL_KEY = "__new__";

export function resolveCompanyReportId(
  period: GarboReportingPeriodSummary,
): string | undefined {
  const id =
    period.companyReportId?.trim() || period.companyReport?.id?.trim() || "";
  return id || undefined;
}

export function attachCompanyReportIdToPeriodPatch<T extends object>(
  period: GarboReportingPeriodSummary,
  patch: T,
): T & { companyReportId?: string } {
  const companyReportId = resolveCompanyReportId(period);
  return companyReportId ? { ...patch, companyReportId } : patch;
}

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

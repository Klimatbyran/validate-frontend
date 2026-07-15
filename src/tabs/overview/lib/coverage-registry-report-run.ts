import type { RunReportListItem } from "@/lib/run-reports-types";
import type {
  CoverageEntry,
  RegistryReportPill,
} from "@/tabs/overview/lib/coverage-types";

function parseRegistryReportYear(
  reportYear: string | null | undefined,
): number | null {
  const year = Number.parseInt((reportYear ?? "").trim(), 10);
  return Number.isFinite(year) ? year : null;
}

export function registryReportYears(reports: RegistryReportPill[]): number[] {
  const years = new Set<number>();
  for (const report of reports) {
    const year = parseRegistryReportYear(report.reportYear);
    if (year != null) {
      years.add(year);
    }
  }
  return [...years].sort((a, b) => b - a);
}

export function pickRegistryReportForYear(
  reports: RegistryReportPill[],
  year: number,
): RegistryReportPill | null {
  const matches = reports.filter(
    (report) => parseRegistryReportYear(report.reportYear) === year,
  );
  if (matches.length === 0) return null;
  return matches.find((report) => report.prodReady) ?? matches[0] ?? null;
}

export function toRunReportListItem(
  entry: CoverageEntry,
  report: RegistryReportPill,
): RunReportListItem {
  return {
    id: report.reportId,
    url: report.url,
    companyName: report.companyName ?? entry.matchedCompany?.name ?? entry.name,
    wikidataId: report.wikidataId ?? entry.matchedCompany?.wikidataId ?? null,
    reportYear: report.reportYear,
  };
}

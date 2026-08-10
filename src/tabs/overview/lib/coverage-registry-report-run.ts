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

function isStorageUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === "storage.googleapis.com" ||
      host.endsWith(".storage.googleapis.com")
    );
  } catch {
    return false;
  }
}

/** Prefer the original web PDF link over a cached storage URL for pipeline runs. */
export function registryReportPipelineUrl(report: RegistryReportPill): string {
  const source = report.sourceUrl?.trim();
  const url = report.url.trim();

  if (source && /^https?:\/\//i.test(source) && !isStorageUrl(source)) {
    return source;
  }
  if (url && !isStorageUrl(url)) {
    return url;
  }
  return source || url;
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
    url: registryReportPipelineUrl(report),
    companyId: entry.matchedCompany?.id ?? null,
    companyName: report.companyName ?? entry.matchedCompany?.name ?? entry.name,
    wikidataId: report.wikidataId ?? entry.matchedCompany?.wikidataId ?? null,
    reportYear: report.reportYear,
  };
}

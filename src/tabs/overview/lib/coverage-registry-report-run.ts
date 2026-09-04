import type { RunReportListItem } from "@/lib/run-reports-types";
import type {
  CoverageEntry,
  RegistryReportPill,
} from "@/tabs/overview/lib/coverage-types";

const REPORT_TYPE_ORDER = [
  "sustainability-report",
  "annual-report",
  "integrated-report",
  "esg-report",
  "climate-report",
  "csr-report",
  "corporate-responsibility-report",
  "corporate-governance-report",
  "tcfd",
  "modern-slavery-statement",
  "other",
];

function parseRegistryReportYear(
  reportYear: string | null | undefined,
): number | null {
  const year = Number.parseInt((reportYear ?? "").trim(), 10);
  return Number.isFinite(year) ? year : null;
}

/** URL passed to the pipeline when running from coverage (matches Registry tab: use `url`). */
export function registryReportPipelineUrl(report: RegistryReportPill): string {
  return report.url.trim() || report.sourceUrl?.trim() || report.url;
}

export function registryReportTypeLabel(
  report: RegistryReportPill,
  unknownLabel = "Unknown type",
): string {
  const label = report.reportTypeLabel?.trim();
  if (label) return label;
  const slug = report.reportTypeSlug?.trim();
  if (slug) {
    return slug
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
  return unknownLabel;
}

export function registryReportFilename(report: RegistryReportPill): string {
  const href = report.sourceUrl?.trim() || report.url;
  try {
    const name = decodeURIComponent(
      new URL(href).pathname.split("/").pop() ?? "",
    );
    return name.replace(/[#?].*$/, "") || "";
  } catch {
    return "";
  }
}

/** Type label, plus filename when the year group has more than one report of that type. */
export function registryReportMenuLabel(
  report: RegistryReportPill,
  yearReports: RegistryReportPill[],
  unknownLabel = "Unknown type",
): string {
  const typeLabel = registryReportTypeLabel(report, unknownLabel);
  const slug = report.reportTypeSlug?.trim() ?? "";
  const sameTypeCount = yearReports.filter(
    (item) => (item.reportTypeSlug?.trim() ?? "") === slug,
  ).length;
  if (sameTypeCount <= 1) return typeLabel;
  const filename = registryReportFilename(report);
  return filename ? `${typeLabel} · ${filename}` : typeLabel;
}

function typeSortIndex(report: RegistryReportPill): number {
  const slug = report.reportTypeSlug?.trim() ?? "";
  const index = REPORT_TYPE_ORDER.indexOf(slug);
  return index === -1 ? REPORT_TYPE_ORDER.length : index;
}

export function sortRegistryReportsByType(
  reports: RegistryReportPill[],
): RegistryReportPill[] {
  return [...reports].sort((a, b) => {
    const typeDiff = typeSortIndex(a) - typeSortIndex(b);
    if (typeDiff !== 0) return typeDiff;
    return a.reportId.localeCompare(b.reportId);
  });
}

export type RegistryReportYearGroup = {
  year: number | null;
  reports: RegistryReportPill[];
  prodReady: boolean;
  hasAmbiguous: boolean;
};

export function groupRegistryReportsByYear(
  reports: RegistryReportPill[],
): RegistryReportYearGroup[] {
  const byYear = new Map<number, RegistryReportPill[]>();
  const unknown: RegistryReportPill[] = [];

  for (const report of reports) {
    const year = parseRegistryReportYear(report.reportYear);
    if (year == null) {
      unknown.push(report);
      continue;
    }
    const bucket = byYear.get(year);
    if (bucket) bucket.push(report);
    else byYear.set(year, [report]);
  }

  const groups: RegistryReportYearGroup[] = [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, yearReports]) => ({
      year,
      reports: sortRegistryReportsByType(yearReports),
      prodReady: yearReports.some((report) => report.prodReady),
      hasAmbiguous: yearReports.some(
        (report) => report.linkStatus === "ambiguous",
      ),
    }));

  if (unknown.length > 0) {
    groups.push({
      year: null,
      reports: sortRegistryReportsByType(unknown),
      prodReady: unknown.some((report) => report.prodReady),
      hasAmbiguous: unknown.some((report) => report.linkStatus === "ambiguous"),
    });
  }

  return groups;
}

export function registryReportYears(reports: RegistryReportPill[]): number[] {
  return groupRegistryReportsByYear(reports)
    .map((group) => group.year)
    .filter((year): year is number => year != null);
}

export function reportsForRegistryYear(
  reports: RegistryReportPill[],
  year: number,
): RegistryReportPill[] {
  const group = groupRegistryReportsByYear(reports).find(
    (item) => item.year === year,
  );
  return group?.reports ?? [];
}

/**
 * Keep locally saved pills when a coverage reload returns a stale, smaller set.
 * Incoming rows win on overlapping ids (fresh prodReady / type labels).
 * A smaller incoming list is treated as stale: it cannot drop local reports
 * or introduce ids that were not already shown.
 */
export function unionRegistryReportPills(
  previous: RegistryReportPill[] | undefined,
  incoming: RegistryReportPill[],
): RegistryReportPill[] {
  if (!previous?.length) return incoming;
  if (incoming.length === 0) return previous;

  if (incoming.length < previous.length) {
    const byId = new Map(
      previous.map((report) => [report.reportId, report] as const),
    );
    for (const report of incoming) {
      if (byId.has(report.reportId)) byId.set(report.reportId, report);
    }
    return [...byId.values()];
  }

  const byId = new Map(
    previous.map((report) => [report.reportId, report] as const),
  );
  for (const report of incoming) {
    byId.set(report.reportId, report);
  }
  return [...byId.values()];
}

export function pickRegistryReportForYear(
  reports: RegistryReportPill[],
  year: number,
): RegistryReportPill | null {
  const matches = reportsForRegistryYear(reports, year);
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

/** Company payload for the crawler Search pipeline (`searchCompanyReports`). */
export function coverageEntryCrawlCompany(entry: CoverageEntry): {
  name: string;
  wikidataId?: string;
} {
  const wikidataId = entry.matchedCompany?.wikidataId?.trim();
  return {
    name: entry.matchedCompany?.name ?? entry.name,
    ...(wikidataId ? { wikidataId } : {}),
  };
}

export function coverageEntryForSavedReport(
  entries: CoverageEntry[],
  saved: { companyName: string; wikidataId?: string | null },
): CoverageEntry | undefined {
  const wiki = saved.wikidataId?.trim();
  if (wiki) {
    const byWiki = entries.find(
      (entry) => entry.matchedCompany?.wikidataId?.trim() === wiki,
    );
    if (byWiki) return byWiki;
  }

  const name = saved.companyName.trim().toLowerCase();
  if (!name) return undefined;

  return entries.find((entry) => {
    const listName = entry.name.trim().toLowerCase();
    const matchName = entry.matchedCompany?.name.trim().toLowerCase();
    return listName === name || matchName === name;
  });
}

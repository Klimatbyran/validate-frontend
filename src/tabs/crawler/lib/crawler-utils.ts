import type {
  CompanyReport,
  LockedReport,
  Report,
  SaveReportsListResponse,
  SelectedReport,
  crawlerSearchQuery,
} from "./crawler-types";
import { saveToRegistry, updateCompanyReports } from "./crawler-api";
import { mapWithConcurrency } from "./map-with-concurrency";

/** Parallel crawl cap — tune via VITE_AUTO_SEARCH_CRAWL_CONCURRENCY (default 6). */
export const AUTO_SEARCH_CRAWL_CONCURRENCY = Math.max(
  1,
  Math.min(12, Number(import.meta.env.VITE_AUTO_SEARCH_CRAWL_CONCURRENCY ?? 6)),
);
const CRAWL_CONCURRENCY = AUTO_SEARCH_CRAWL_CONCURRENCY;

/** Seeded report type used when the classifier does not match a known catalog type. */
export const FALLBACK_REPORT_TYPE_SLUG = "other";
export const FALLBACK_REPORT_TYPE_LABEL = "Other";

export function fallbackReportTypeSlug(slug?: string | null): string {
  return slug?.trim() || FALLBACK_REPORT_TYPE_SLUG;
}

/** Auto-save: keep a known slug; unlabeled hits become `other`; label-only hits omit slug. */
export function reportTypeSlugForAutoSave(
  hit?: Pick<Report, "reportTypeSlug" | "reportType"> | null,
): string | undefined {
  const slug = hit?.reportTypeSlug?.trim();
  if (slug) return slug;
  if (hit?.reportType?.trim()) return undefined;
  return FALLBACK_REPORT_TYPE_SLUG;
}

/**
 * Manual pick/paste: keep a classifier slug when present, otherwise omit
 * the type instead of stamping `other`.
 */
export function reportTypeSlugForManualSave(
  hit?: Pick<Report, "reportTypeSlug" | "reportType"> | null,
): string | undefined {
  return hit?.reportTypeSlug?.trim() || undefined;
}

export function withFallbackReportType(hit: Report): Report {
  if (hit.fetchFailed) return hit;
  const slug = hit.reportTypeSlug?.trim();
  const label = hit.reportType?.trim();
  if (slug && label) return hit;
  if (slug) return { ...hit, reportTypeSlug: slug, reportType: label || slug };
  if (label) return { ...hit, reportType: label };
  return {
    ...hit,
    reportTypeSlug: FALLBACK_REPORT_TYPE_SLUG,
    reportType: FALLBACK_REPORT_TYPE_LABEL,
  };
}

export function yearForSelectedReport(
  url: string,
  hit?: Pick<Report, "reportYear" | "title"> | null,
  fallbackYear?: string,
): string {
  const fromHit = hit?.reportYear?.trim();
  if (fromHit && /^\d{4}$/.test(fromHit)) return fromHit;
  const inferred = inferReportYearFromUrl(url, hit?.title);
  if (/^\d{4}$/.test(inferred)) return inferred;
  const fallback = fallbackYear?.trim() ?? "";
  return /^\d{4}$/.test(fallback) ? fallback : "";
}

export function selectedReportFromHit(input: {
  companyName: string;
  url: string;
  hit?: Report;
  wikidataId?: string;
  fallbackYear?: string;
}): SelectedReport | null {
  const reportYear = yearForSelectedReport(
    input.url,
    input.hit,
    input.fallbackYear,
  );
  if (!/^\d{4}$/.test(reportYear)) return null;
  return {
    companyName: input.companyName,
    reportYear,
    url: input.url,
    wikidataId: input.wikidataId,
    reportTypeSlug: reportTypeSlugForManualSave(input.hit),
    s3Url: input.hit?.s3Url ?? undefined,
    s3Key: input.hit?.s3Key ?? undefined,
    s3Bucket: input.hit?.s3Bucket ?? undefined,
    sha256: input.hit?.sha256 ?? undefined,
  };
}

export type AutoSearchCompanyInput = {
  name: string;
  reportYear?: string;
  country?: string;
  wikidataId?: string;
  companyUrl?: string;
};

const REPORT_CATALOG_YEAR_MIN = 1990;

/** Best-effort year from PDF URL or title (e.g. for registry save after manual pick). */
export function inferReportYearFromUrl(
  url: string,
  title?: string | null,
): string {
  const haystack = `${title ?? ""} ${url}`;
  const maxYear = new Date().getFullYear() + 1;
  const years = [...haystack.matchAll(/\b((?:19|20)\d{2})\b/g)]
    .map((m) => m[1])
    .filter((year) => {
      const n = Number(year);
      return n >= REPORT_CATALOG_YEAR_MIN && n <= maxYear;
    });
  if (years.length === 0) return "";
  return years.sort().at(-1) ?? "";
}

export type CrawlProgress = {
  /** During crawl: number finished (not queue position). During analyze: company index. */
  companyIndex: number;
  companyTotal: number;
  companyName: string;
  /** Active parallel crawl workers (crawl phase only). */
  parallel?: number;
};

interface SearchCompanyReportsParams {
  companies: AutoSearchCompanyInput[];
  country?: string;
  onProgress?: (progress: CrawlProgress) => void;
  /** When set, labeled hits are written to the registry after the crawl. */
  onLabeledSaved?: (response: SaveReportsListResponse) => void;
}

const AUTO_SAVE_YEAR_LOOKBACK = 4;

function isRecentEnoughToAutoSave(
  year: string,
  requestedYear?: string,
): boolean {
  if (requestedYear && /^\d{4}$/.test(requestedYear)) {
    return year === requestedYear;
  }
  const n = Number(year);
  const now = new Date().getFullYear();
  return n >= now - AUTO_SAVE_YEAR_LOOKBACK && n <= now + 1;
}

const SUPPORTING_AUTO_SAVE =
  /\b(?:cdp|questionnaire|survey[\s_-]?response|gri[\s_-]*(?:content[\s_-]*)?index|sasb[\s_-]*index|tcfd[\s_-]*index|content[\s_-]*index|assurance[\s_-]?statement|independent[\s_-]?assurance|limited[\s_-]?assurance|iso[\s_-]?14001|conflict[\s_-]?minerals|data[\s_-]?tables?|calculation[\s_-]?methodology|performance[\s_-]?metrics|basis[\s_-]?of[\s_-]?reporting|supplier[\s_-]?code|form[\s_-]*10[\s_-]*k|form[\s_-]*20[\s_-]*f|annual[\s_-]*report[\s_-]*on[\s_-]*form[\s_-]*10[\s_-]*k)\b/i;

function haystackForAutoSave(url: string, title?: string | null): string {
  return `${title ?? ""} ${url}`.toLowerCase().replace(/[_\-./+]/g, " ");
}

function isSupportingAutoSaveDocument(
  url: string,
  title?: string | null,
): boolean {
  const haystack = haystackForAutoSave(url, title);
  if (SUPPORTING_AUTO_SAVE.test(haystack)) return true;
  if (
    /\bpolic(?:y|ies)\b/.test(haystack) &&
    !/\b(?:sustainability|annual|citizenship|responsibility)[\s_-]*report\b/.test(
      haystack,
    )
  ) {
    return true;
  }
  return false;
}

function looksLikeOtherLegalEntity(
  url: string,
  companyName: string,
  title?: string | null,
): boolean {
  const haystack = haystackForAutoSave(url, title);
  const company = companyName.toLowerCase();
  if (/\bishares\b/.test(haystack) && !company.includes("ishares")) {
    return true;
  }
  if (
    /\bindia\b/.test(haystack) &&
    !company.includes("india") &&
    /\b(?:limited|ltd)\b/.test(haystack)
  ) {
    return true;
  }
  return false;
}

export function labeledHitsToSelectedReports(
  companyReports: CompanyReport[],
): SelectedReport[] {
  const selected: SelectedReport[] = [];
  const seenUrl = new Set<string>();

  const hits: Array<{
    company: CompanyReport;
    hit: CompanyReport["results"][number];
    url: string;
    reportYear: string;
    reportTypeSlug?: string;
  }> = [];

  for (const company of companyReports) {
    for (const hit of company.results) {
      const url = hit.url?.trim();
      if (hit.fetchFailed || !url) continue;
      if (isSupportingAutoSaveDocument(url, hit.title)) continue;
      if (looksLikeOtherLegalEntity(url, company.companyName, hit.title)) {
        continue;
      }
      const reportYear = yearForSelectedReport(url, hit);
      if (!/^\d{4}$/.test(reportYear)) continue;
      if (!isRecentEnoughToAutoSave(reportYear, company.reportYear)) continue;
      hits.push({
        company,
        hit,
        url,
        reportYear,
        reportTypeSlug: reportTypeSlugForAutoSave(hit),
      });
    }
  }

  hits.sort((a, b) => {
    const aTyped = a.reportTypeSlug === FALLBACK_REPORT_TYPE_SLUG ? 1 : 0;
    const bTyped = b.reportTypeSlug === FALLBACK_REPORT_TYPE_SLUG ? 1 : 0;
    if (aTyped !== bTyped) return aTyped - bTyped;
    return b.reportYear.localeCompare(a.reportYear);
  });

  for (const item of hits) {
    const urlKey = item.url.toLowerCase();
    if (seenUrl.has(urlKey)) continue;
    seenUrl.add(urlKey);
    selected.push({
      companyName: item.company.companyName,
      reportYear: item.reportYear,
      url: item.url,
      wikidataId: item.company.wikidataId,
      reportTypeSlug: item.reportTypeSlug,
      s3Url: item.hit.s3Url ?? undefined,
      s3Key: item.hit.s3Key ?? undefined,
      s3Bucket: item.hit.s3Bucket ?? undefined,
      sha256: item.hit.sha256 ?? undefined,
    });
  }

  return selected;
}

export async function saveLabeledSearchResults(
  companyReports: CompanyReport[],
): Promise<SaveReportsListResponse | null> {
  const toSave = labeledHitsToSelectedReports(companyReports);
  if (toSave.length === 0) return null;
  return saveToRegistry(toSave);
}

function normalizeCompanyReport(
  item: CompanyReport | undefined,
  fallback: crawlerSearchQuery,
): CompanyReport {
  return {
    companyName: item?.companyName || fallback.name || "Unknown",
    // Only the year this crawl requested. Do not copy a classified hit year
    // from the API row — that would collapse the recency auto-save window.
    reportYear: fallback.reportYear,
    results: (item?.results ?? []).map(withFallbackReportType),
    discoverySource: item?.discoverySource,
    listingPageUrl: item?.listingPageUrl,
    wikidataId: item?.wikidataId || fallback.wikidataId,
  };
}

async function crawlSingleCompany(
  query: crawlerSearchQuery,
): Promise<CompanyReport> {
  try {
    const data = await updateCompanyReports(query);
    const row = Array.isArray(data) ? data[0] : data;
    return normalizeCompanyReport(row as CompanyReport | undefined, query);
  } catch (error) {
    console.error(`Crawl failed for ${query.name}:`, error);
    return {
      ...normalizeCompanyReport(undefined, query),
      crawlError:
        error instanceof Error ? error.message : "Crawl request failed",
    };
  }
}

/**
 * Fetches company reports for given companies and year.
 * Auto-saves labeled hits only when `onLabeledSaved` is provided so LLM
 * auto-search can crawl without writing every candidate to the registry.
 */
export const searchCompanyReports = async ({
  companies,
  country,
  onProgress,
  onLabeledSaved,
}: SearchCompanyReportsParams): Promise<CompanyReport[]> => {
  if (!companies?.length) {
    return [];
  }

  const trimmedCountry = (country ?? "").trim();

  const searchQueries: crawlerSearchQuery[] = companies.map((company) => {
    const companyCountry =
      (company.country ?? "").trim() || trimmedCountry || undefined;
    const reportYear = company.reportYear?.trim();
    return {
      name: company.name,
      ...(reportYear ? { reportYear } : {}),
      ...(companyCountry ? { country: companyCountry } : {}),
      wikidataId: company.wikidataId,
      companyUrl: company.companyUrl,
    };
  });

  let completed = 0;
  onProgress?.({
    companyIndex: 0,
    companyTotal: searchQueries.length,
    companyName: "",
    parallel: CRAWL_CONCURRENCY,
  });

  const reports = await mapWithConcurrency(
    searchQueries,
    CRAWL_CONCURRENCY,
    async (query) => {
      const result = await crawlSingleCompany(query);
      completed += 1;
      onProgress?.({
        companyIndex: completed,
        companyTotal: searchQueries.length,
        companyName: query.name,
        parallel: CRAWL_CONCURRENCY,
      });
      return result;
    },
  );

  if (onLabeledSaved) {
    try {
      const saved = await saveLabeledSearchResults(reports);
      onLabeledSaved(saved ?? { message: "", successes: [], failed: [] });
    } catch (error) {
      console.error("Auto-save labeled search results failed:", error);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      try {
        const saved = await saveLabeledSearchResults(reports);
        onLabeledSaved(saved ?? { message: "", successes: [], failed: [] });
      } catch (retryError) {
        console.error(
          "Auto-save labeled search results retry failed:",
          retryError,
        );
        const message =
          retryError instanceof Error
            ? retryError.message
            : "Failed to save to registry";
        onLabeledSaved({
          message,
          successes: [],
          failed: labeledHitsToSelectedReports(reports).map((report) => ({
            error: "unknown" as const,
            companyName: report.companyName,
            reportYear: report.reportYear,
            message,
          })),
        });
      }
    }
  }

  return reports;
};

/** @deprecated Prefer searchCompanyReports with full company objects. */
export const searchCompanyReportsByNames = async ({
  companyNames,
  reportYear,
  country,
  onProgress,
  onLabeledSaved,
}: {
  companyNames: string[];
  reportYear?: string;
  country?: string;
  onProgress?: (progress: CrawlProgress) => void;
  onLabeledSaved?: (response: SaveReportsListResponse) => void;
}): Promise<CompanyReport[]> =>
  searchCompanyReports({
    companies: companyNames.map((name) => ({
      name,
      ...(reportYear?.trim() ? { reportYear: reportYear.trim() } : {}),
      country,
    })),
    onProgress,
    onLabeledSaved,
  });

/**
 * Writes crawled reports to CSV file and triggers download.
 */
export const writeCrawledReportsToCsv = (
  companyReports: LockedReport[],
): void => {
  const escapeCsvValue = (value: string) => {
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  };
  const header = ["companyName", "reportYear", "url"]
    .map(escapeCsvValue)
    .join(";");
  const rows = companyReports.map((report) =>
    [
      escapeCsvValue(report.companyName),
      escapeCsvValue(report.reportYear),
      escapeCsvValue(report.url),
    ].join(";"),
  );
  const csvContent = `\ufeff${[header, ...rows].join("\r\n")}`;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `company_reports_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

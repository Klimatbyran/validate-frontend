import type {
  CompanyReport,
  LockedReport,
  Report,
  crawlerSearchQuery,
} from "./crawler-types";
import { updateCompanyReports } from "./crawler-api";
import { reportsUrl } from "./crawler-api";
import { mapWithConcurrency } from "./map-with-concurrency";

/** Parallel crawl cap — tune via VITE_AUTO_SEARCH_CRAWL_CONCURRENCY (default 6). */
export const AUTO_SEARCH_CRAWL_CONCURRENCY = Math.max(
  1,
  Math.min(
    12,
    Number(import.meta.env.VITE_AUTO_SEARCH_CRAWL_CONCURRENCY ?? 6),
  ),
);
const CRAWL_CONCURRENCY = AUTO_SEARCH_CRAWL_CONCURRENCY;

export interface ReportWithPreview extends Report {
  previewUrl: string;
}

export type AutoSearchCompanyInput = {
  name: string;
  reportYear: string;
  country?: string;
  wikidataId?: string;
  companyUrl?: string;
};

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
}

function normalizeCompanyReport(
  item: CompanyReport | undefined,
  fallback: crawlerSearchQuery,
): CompanyReport {
  return {
    companyName: item?.companyName || fallback.name || "Unknown",
    reportYear: item?.reportYear || fallback.reportYear || "Unknown",
    results: item?.results ?? [],
    discoverySource: item?.discoverySource,
    listingPageUrl: item?.listingPageUrl,
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
    return normalizeCompanyReport(undefined, query);
  }
}

export const generateReportPreviews = (
  results: Report[],
): ReportWithPreview[] => {
  return results.map((result) => {
    const previewUrl = result.url ? generateReportPreview(result.url) : "";
    return { ...result, previewUrl };
  });
};

/**
 * Fetches company reports for given companies and year.
 * Returns an array of CompanyReport objects.
 */
export const searchCompanyReports = async ({
  companies,
  country,
  onProgress,
}: SearchCompanyReportsParams): Promise<CompanyReport[]> => {
  if (!companies.length) {
    return [];
  }

  const defaultCountry = (country ?? "").trim() || undefined;

  const searchQueries: crawlerSearchQuery[] = companies.map((company) => ({
    name: company.name,
    reportYear: company.reportYear,
    country: (company.country ?? defaultCountry ?? "").trim() || undefined,
    wikidataId: company.wikidataId,
    companyUrl: company.companyUrl,
  }));

  let completed = 0;
  onProgress?.({
    companyIndex: 0,
    companyTotal: searchQueries.length,
    companyName: "",
    parallel: CRAWL_CONCURRENCY,
  });

  return mapWithConcurrency(
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
};

/** @deprecated Prefer searchCompanyReports with full company objects. */
export const searchCompanyReportsByNames = async ({
  companyNames,
  reportYear,
  country,
  onProgress,
}: {
  companyNames: string[];
  reportYear: string;
  country?: string;
  onProgress?: (progress: CrawlProgress) => void;
}): Promise<CompanyReport[]> =>
  searchCompanyReports({
    companies: companyNames.map((name) => ({ name, reportYear, country })),
    onProgress,
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

/**
 * Returns the direct preview image URL for a report.
 */
export const generateReportPreview = (reportUrl: string): string => {
  if (!reportUrl) return "";

  const url =
    reportsUrl("/internal-companies/reports/preview?pdfUrl=") +
    encodeURIComponent(reportUrl);
  return url;
};

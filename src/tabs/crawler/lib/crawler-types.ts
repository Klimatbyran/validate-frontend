export type Report = {
  url: string | null;
  title?: string | null;
  description?: string | null;
  reportYear?: string | null;
  reportType?: string | null;
  reportTypeSlug?: string | null;
  fetchFailed?: boolean;
  s3Url?: string | null;
  s3Key?: string | null;
  s3Bucket?: string | null;
  sha256?: string | null;
  source?: "company_site" | "web_search" | "firecrawl_search";
};

export interface CompanyReport {
  companyName: string;
  reportYear?: string;
  results: Report[];
  wikidataId?: string;
  discoverySource?:
    | "company_site"
    | "web_search"
    | "filing_feed"
    | "firecrawl_search";
  listingPageUrl?: string;
  /** Set when the search-reports request itself failed (proxy/API down). */
  crawlError?: string;
}

export const SEARCH_REPORT_JOB_TIMEOUT_MESSAGE =
  "Crawl timed out after 45 minutes";

export const CRAWL_UNREACHABLE_MESSAGE = "Could not reach the reports API";

export function sanitizeCrawlErrorMessage(error: string): string {
  let cleaned = "";
  for (const character of error) {
    const code = character.charCodeAt(0);
    cleaned += code < 32 || code === 127 ? " " : character;
  }
  return cleaned.replace(/\s+/g, " ").trim().slice(0, 180);
}

export type SelectedReport = {
  companyName: string;
  reportYear: string;
  url: string;
  wikidataId?: string;
  reportTypeSlug?: string;
  s3Url?: string;
  s3Key?: string;
  s3Bucket?: string;
  sha256?: string;
};

export type crawlerSearchQuery = {
  name: string;
  reportYear?: string;
  country?: string;
  wikidataId?: string;
  companyUrl?: string;
};

export type SaveReportSuccess = {
  id: string;
  companyName: string;
  wikidataId?: string | null;
  reportYear: string;
  url: string;
  reportTypeId?: string | null;
  reportTypeSlug?: string | null;
  reportTypeLabel?: string | null;
};

export type SaveReportError = {
  error: "duplicate" | "unknown";
  companyName: string;
  reportYear: string;
  message: string;
};

export type SaveReportsListResponse = {
  message: string;
  successes: SaveReportSuccess[];
  failed: SaveReportError[];
};

export type Report = {
  url: string | null;
  title?: string | null;
  description?: string | null;
  source?: "company_site" | "web_search" | "firecrawl_search";
};

export type LockedReport = {
  companyName: string;
  reportYear: string;
  url: string;
};
export interface ReportingPeriod {
  startDate: string;
  endDate: string;
  reportUrl: string;
  id: string;
}

export interface CompanyReport {
  companyName: string;
  reportYear: string;
  results: Report[];
  wikidataId?: string;
  discoverySource?: "company_site" | "web_search" | "filing_feed" | "firecrawl_search";
  listingPageUrl?: string;
}

export interface CompanyDetails {
  id: string;
  name: string;
  wikidataId?: string;
  url?: string | null;
  tags?: string[];
  reportingPeriods: ReportingPeriod[];
}

export type SelectedReport = {
  companyName: string;
  reportYear: string;
  url: string;
  wikidataId?: string;
};

export type CrawlerViewMode = "manual" | "database";

export type crawlerSearchQuery = {
  name: string;
  reportYear: string;
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

export type AutoSearchPhase =
  | "idle"
  | "crawling"
  | "analyzing"
  | "saving"
  | "done"
  | "error";

export type AutoSearchProgress = {
  companyIndex: number;
  companyTotal: number;
  companyName: string;
  candidateIndex: number;
  candidateTotal: number;
};

export type LlmSelectionCandidate = {
  url: string;
  title?: string;
  description?: string;
  text?: string;
};

export type LlmSelectionResult = {
  url: string | null;
  confidence: number;
  detectedYear?: string | null;
  reasoning: string;
};

export type AutoSearchCandidateDetail = {
  url: string;
  pagesRead: number;
  isLlmChoice: boolean;
  isWinner: boolean;
  prefilterSkipped?: boolean;
};

export type PrefilterReportResult = {
  analyzeIndices: number[];
  reasoning: string;
};

export type AutoSearchCompanyDetail = {
  companyName: string;
  outcome:
    | "selected"
    | "added"
    | "low_confidence"
    | "no_results"
    | "analyze_failed"
    | "llm_failed"
    | "failed"
    | "already_in_registry";
  discoverySource?: "company_site" | "web_search" | "filing_feed" | "firecrawl_search";
  listingPageUrl?: string;
  candidates: AutoSearchCandidateDetail[];
  prefilter?: PrefilterReportResult;
  llm?: LlmSelectionResult;
};

export type AutoSearchStats = {
  companiesRequested: number;
  companiesWithResults: number;
  candidatesFetched: number;
  candidatesAnalyzed: number;
  added: SaveReportSuccess[];
  skippedNoResults: { companyName: string }[];
  skippedAnalyzeFailed: { companyName: string }[];
  skippedLlmFailed: { companyName: string }[];
  skippedLowConfidence: {
    companyName: string;
    confidence: number;
    suggestedUrl?: string;
  }[];
  skippedAlreadyInRegistry: { companyName: string }[];
  failed: SaveReportError[];
  companyDetails: AutoSearchCompanyDetail[];
};

export type PdfTextResponse = {
  text: string;
  pagesRead: number;
  textLength: number;
};

export type Report = {
  url: string | null;
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
}

export interface CompanyDetails {
  name: string;
  wikidataId?: string;
  reportingPeriods: ReportingPeriod[];
}

export type SelectedReport = {
  companyName: string;
  reportYear: string;
  url: string;
};

export type CrawlerViewMode = "manual" | "database";

export type crawlerSearchQuery = {
  name: string;
  reportYear: string;
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

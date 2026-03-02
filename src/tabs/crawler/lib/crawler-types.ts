export type Report = {
  url: string | null;
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

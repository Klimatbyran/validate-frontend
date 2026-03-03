export type Report = {
  url: string | null;
};

export type LockedReport = {
  companyName: string;
  reportYear: string;
  url: string;
};

export interface CompanyReport {
  companyName: string;
  reportYear: string;
  results: Report[];
}

export interface CompanyDetails {
  name: string;
  wikidataId?: string;
}

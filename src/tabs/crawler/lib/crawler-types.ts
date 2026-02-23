export type Report = {
  url: string | null;
};

export interface CompanyReport {
  companyName: string;
  reportYear: string;
  results: Report[];
}

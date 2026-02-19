export type Report = {
  position?: number;
  url: string;
};

export interface CompanyReport {
  companyName: string;
  reportYear: string;
  results: Report[];
}

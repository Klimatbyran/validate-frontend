export type Report = {
  description: string;
  position: number;
  title: string;
  url: string;
};

export interface CompanyReport {
  companyName: string;
  reportYear: string;
  results: Report[];
}

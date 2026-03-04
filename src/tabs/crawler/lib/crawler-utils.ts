import { updateCompanyReports } from "./crawler-api";
import type { CompanyReport } from "./crawler-types";

interface SearchCompanyReportsParams {
  companyNames: string[];
  reportYear: string;
}

export const searchCompanyReports = async ({
  companyNames,
  reportYear,
}: SearchCompanyReportsParams): Promise<CompanyReport[]> => {
  if (!companyNames.length || !reportYear) {
    return [];
  }

  const searchQueries = companyNames.map((name) => ({
    name,
    reportYear,
  }));

  const data = await Promise.all(
    searchQueries.map((query) => updateCompanyReports(query)),
  );

  return data.flatMap((response) =>
    response.results.map((item: CompanyReport) => ({
      companyName: item.companyName || "Unknown",
      reportYear: item.reportYear || "Unknown",
      results: item.results ?? [],
    })),
  );
};

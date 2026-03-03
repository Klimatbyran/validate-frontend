import { fetchCompanyReports } from "./crawler-api";
import type { CompanyReport, LockedReport } from "./crawler-types";

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
    searchQueries.map((query) => fetchCompanyReports(query)),
  );

  return data.flatMap((response) =>
    response.results.map((item: CompanyReport) => ({
      companyName: item.companyName || "Unknown",
      reportYear: item.reportYear || "Unknown",
      results: item.results ?? [],
    })),
  );
};

export const writeCrawledReportsToCsv = (companyReports: LockedReport[]) => {
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

import { fetchCompanyReports } from "./crawler-api";
import type { CompanyReport, LockedReport } from "./crawler-types";
import * as XLSX from "xlsx";

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
  const rows = companyReports.map((report) => ({
    companyName: report.companyName,
    reportYear: report.reportYear,
    url: report.url,
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: ["companyName", "reportYear", "url"],
  });
  const csvBody = XLSX.utils.sheet_to_csv(worksheet, {
    FS: ";",
    RS: "\r\n",
  });
  const csvContent = `\ufeff${csvBody}`;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `company_reports_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

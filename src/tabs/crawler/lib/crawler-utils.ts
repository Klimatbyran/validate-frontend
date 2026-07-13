import type {
  CompanyReport,
  LockedReport,
  crawlerSearchQuery,
} from "./crawler-types";
import { updateCompanyReports } from "./crawler-api";
import { reportsUrl } from "./crawler-api";

export interface ReportWithPreview extends Report {
  previewUrl: string;
}

interface SearchCompanyReportsParams {
  companyNames: string[];
  reportYear: string;
  country?: string;
}

export const generateReportPreviews = (
  results: Report[],
): ReportWithPreview[] => {
  return results.map((result) => {
    const previewUrl = result.url ? generateReportPreview(result.url) : "";
    return { ...result, previewUrl };
  });
};

/**
 * Fetches company reports for given names and year.
 * Returns an array of CompanyReport objects.
 */
export const searchCompanyReports = async ({
  companyNames,
  reportYear,
  country,
}: SearchCompanyReportsParams): Promise<CompanyReport[]> => {
  if (!companyNames.length || !reportYear) {
    return [];
  }

  const trimmedCountry = (country ?? "").trim();
  const searchQueries: crawlerSearchQuery[] = companyNames.map((name) => ({
    name,
    reportYear,
    ...(trimmedCountry ? { country: trimmedCountry } : {}),
  }));

  const data: CompanyReport[][] = await Promise.all(
    searchQueries.map((query) => updateCompanyReports(query)),
  );

  return data.flat().map((item) => ({
    companyName: item.companyName || "Unknown",
    reportYear: item.reportYear || "Unknown",
    results: item.results ?? [],
  }));
};

/**
 * Writes crawled reports to CSV file and triggers download.
 */
export const writeCrawledReportsToCsv = (
  companyReports: LockedReport[],
): void => {
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

/**
 * Returns the direct preview image URL for a report.
 */
export const generateReportPreview = (reportUrl: string): string => {
  if (!reportUrl) return "";

  const url =
    reportsUrl("/internal-companies/reports/preview?pdfUrl=") +
    encodeURIComponent(reportUrl);
  return url;
};

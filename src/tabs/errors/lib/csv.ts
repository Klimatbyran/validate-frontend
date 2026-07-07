import { getCompanyUrlSegment } from "@/lib/company-routing";
import { downloadCsv } from "@/lib/utils";
import type { CompanyRow, DataPointMetric } from "../types";

/** Trigger CSV download for overview metrics. */
export function exportOverviewCsv(
  metrics: DataPointMetric[],
  selectedYear: number,
): void {
  const headers = [
    "Data Point",
    "Identical",
    "Rounding",
    "Small Error",
    "Hallucination",
    "Missing",
    "Report Not on Stage",
    "Report Not on Prod",
    "Unit Error",
    "Category Error",
    "Error",
    "Both Empty",
    "With Data",
    "Tolerant Rate %",
  ];
  const rows: string[][] = [headers];

  for (const dp of metrics) {
    rows.push([
      `"${dp.label}"`,
      String(dp.breakdown.identical),
      String(dp.breakdown.rounding),
      String(dp.breakdown.smallError),
      String(dp.breakdown.hallucination),
      String(dp.breakdown.missing),
      String(dp.breakdown.reportAbsent),
      String(dp.breakdown.reportExtra),
      String(dp.breakdown.unitError),
      String(dp.breakdown.categoryError),
      String(dp.breakdown.error),
      String(dp.breakdown.bothNull),
      String(dp.withAnyData),
      dp.tolerantRate.toFixed(1),
    ]);
  }

  downloadCsv(rows, `overview-${selectedYear}.csv`);
}

/** Trigger CSV download for comparison rows. */
export function exportComparisonToCsv(
  rows: CompanyRow[],
  dataPointId: string,
  year: number,
): void {
  const headers = [
    "Company",
    "Identifier",
    "Report Year",
    "CompanyReportId",
    "Stage",
    "Prod",
    "Diff",
    "Status",
    "In Stage",
    "In Prod",
  ];
  const csvRows: string[][] = [headers];

  for (const row of rows) {
    csvRows.push([
      `"${row.name.replace(/"/g, '""')}"`,
      getCompanyUrlSegment(row),
      row.reportYear != null ? String(row.reportYear) : "",
      row.companyReportId ?? "",
      String(row.stageValue ?? ""),
      String(row.prodValue ?? ""),
      String(row.diff ?? ""),
      row.discrepancy,
      row.inStage ? "yes" : "no",
      row.inProd ? "yes" : "no",
    ]);
  }

  downloadCsv(csvRows, `${dataPointId}-comparison-${year}.csv`);
}

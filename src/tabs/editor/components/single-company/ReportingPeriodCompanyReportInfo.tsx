import type { GarboReportingPeriodSummary } from "../../lib/types";
import {
  getPeriodDataYear,
  shortenCompanyReportId,
} from "../../lib/reporting-period-ui";

export function ReportingPeriodCompanyReportInfo({
  period,
  pdfYearLabel,
  companyReportIdLabel,
  duplicateDataYearHint,
  compact = false,
}: {
  period: GarboReportingPeriodSummary;
  pdfYearLabel: string;
  companyReportIdLabel: string;
  duplicateDataYearHint?: string;
  compact?: boolean;
}) {
  const pdfYear = period.companyReport?.reportYear?.trim();
  const companyReportId =
    period.companyReportId?.trim() || period.companyReport?.id?.trim();
  const dataYear = getPeriodDataYear(period);

  if (!pdfYear && !companyReportId) return null;

  if (compact) {
    const parts: string[] = [];
    if (pdfYear) parts.push(`${pdfYearLabel} ${pdfYear}`);
    if (companyReportId) {
      parts.push(shortenCompanyReportId(companyReportId));
    }
    return (
      <div className="text-[10px] text-gray-02 mt-0.5 leading-tight font-mono">
        {parts.join(" · ")}
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-02">
      {pdfYear ? (
        <span>
          <span className="font-medium text-gray-01">{pdfYearLabel}:</span>{" "}
          {pdfYear}
        </span>
      ) : null}
      {companyReportId ? (
        <span className="font-mono" title={companyReportId}>
          <span className="font-medium text-gray-01 font-sans">
            {companyReportIdLabel}:
          </span>{" "}
          {shortenCompanyReportId(companyReportId)}
        </span>
      ) : null}
      {duplicateDataYearHint && dataYear ? (
        <span className="text-orange-03/90">{duplicateDataYearHint}</span>
      ) : null}
    </div>
  );
}

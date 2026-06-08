import type { GarboReportingPeriodSummary } from "../../lib/types";
import {
  getPeriodDataYear,
  getPeriodReportYear,
  shortenCompanyReportId,
} from "../../lib/reporting-period-ui";

export function ReportingPeriodCompanyReportInfo({
  period,
  reportYearLabel,
  companyReportIdLabel,
  noReportYearLabel,
  duplicateDataYearHint,
  compact = false,
}: {
  period: GarboReportingPeriodSummary;
  reportYearLabel: string;
  companyReportIdLabel: string;
  noReportYearLabel: string;
  duplicateDataYearHint?: string;
  compact?: boolean;
}) {
  const reportYear = getPeriodReportYear(period);
  const companyReportId =
    period.companyReportId?.trim() || period.companyReport?.id?.trim();
  const dataYear = getPeriodDataYear(period);

  if (!reportYear && !companyReportId && !duplicateDataYearHint) return null;

  const companyReportIdTitle = companyReportId
    ? `CompanyReport: ${companyReportId}`
    : undefined;

  if (compact) {
    if (reportYear) {
      return (
        <div
          className="text-[10px] text-gray-02 mt-0.5 leading-tight"
          title={companyReportIdTitle}
        >
          {reportYearLabel} {reportYear}
        </div>
      );
    }
    if (companyReportId) {
      return (
        <div
          className="text-[10px] text-gray-02 mt-0.5 leading-tight"
          title={companyReportIdTitle}
        >
          {companyReportIdLabel}{" "}
          {shortenCompanyReportId(companyReportId)} · {noReportYearLabel}
        </div>
      );
    }
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-02">
      {reportYear ? (
        <span title={companyReportIdTitle}>
          <span className="font-medium text-gray-01">{reportYearLabel}:</span>{" "}
          {reportYear}
        </span>
      ) : companyReportId ? (
        <span title={companyReportIdTitle}>
          <span className="font-medium text-gray-01">
            {companyReportIdLabel}:
          </span>{" "}
          {shortenCompanyReportId(companyReportId)}
          <span className="text-orange-03/90"> · {noReportYearLabel}</span>
        </span>
      ) : null}
      {duplicateDataYearHint && dataYear ? (
        <span className="text-orange-03/90">{duplicateDataYearHint}</span>
      ) : null}
    </div>
  );
}

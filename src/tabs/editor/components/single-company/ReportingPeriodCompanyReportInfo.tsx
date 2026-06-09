import type { GarboReportingPeriodSummary } from "../../lib/types";
import {
  editorSecondaryIdTextClass,
  getPeriodDataYear,
  getPeriodReportYear,
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

  if (compact) {
    return (
      <div className="mt-0.5 leading-tight min-w-0">
        {reportYear ? (
          <div className="text-[10px] text-gray-02">
            {reportYearLabel} {reportYear}
          </div>
        ) : null}
        {companyReportId ? (
          <div className={editorSecondaryIdTextClass}>{companyReportId}</div>
        ) : reportYear ? null : (
          <div className="text-[10px] text-gray-02">
            {companyReportIdLabel} · {noReportYearLabel}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-1 min-w-0">
      {reportYear ? (
        <div className="text-[11px] text-gray-02">
          <span className="font-medium text-gray-01">{reportYearLabel}:</span>{" "}
          {reportYear}
        </div>
      ) : null}
      {companyReportId ? (
        <div className={editorSecondaryIdTextClass}>{companyReportId}</div>
      ) : !reportYear ? (
        <div className="text-[11px] text-gray-02">
          <span className="font-medium text-gray-01">
            {companyReportIdLabel}:
          </span>{" "}
          <span className="text-orange-03/90">{noReportYearLabel}</span>
        </div>
      ) : null}
      {duplicateDataYearHint && dataYear ? (
        <span className="text-[11px] text-orange-03/90">{duplicateDataYearHint}</span>
      ) : null}
    </div>
  );
}

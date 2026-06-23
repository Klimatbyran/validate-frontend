import { useI18n } from "@/contexts/I18nContext";
import type { GarboReportingPeriodSummary } from "../../lib/types";
import {
  editorSecondaryIdTextClass,
  resolveCompanyReportYearFromPeriod,
} from "../../lib/reporting-period-ui";

export function ReportingPeriodCompanyReportInfo({
  period,
}: {
  period: GarboReportingPeriodSummary;
}) {
  const { t } = useI18n();
  const { year: companyReportYear, source } =
    resolveCompanyReportYearFromPeriod(period);
  const companyReportId =
    period.companyReportId?.trim() || period.companyReport?.id?.trim();

  if (!companyReportYear && !companyReportId) return null;

  const yearLabel =
    source === "urlEstimate"
      ? t("yearLabels.companyReportYearFromUrl")
      : t("yearLabels.companyReportYearShort");
  const companyReportIdLabel = t(
    "editor.singleCompanyView.companyReportIdShort",
  );
  const noCompanyReportYearLabel = t("yearLabels.noCompanyReportYear");

  return (
    <div className="mt-0.5 leading-tight min-w-0">
      {companyReportYear ? (
        <div className="text-[10px] text-gray-02">
          {yearLabel} {companyReportYear}
        </div>
      ) : null}
      {companyReportId ? (
        <div className={editorSecondaryIdTextClass}>{companyReportId}</div>
      ) : companyReportYear ? null : (
        <div className="text-[10px] text-gray-02">
          {companyReportIdLabel} · {noCompanyReportYearLabel}
        </div>
      )}
    </div>
  );
}

import { useI18n } from "@/contexts/I18nContext";
import type { GarboReportingPeriodSummary } from "../../lib/types";
import {
  editorSecondaryIdTextClass,
  getPeriodReportYear,
} from "../../lib/reporting-period-ui";

export function ReportingPeriodCompanyReportInfo({
  period,
}: {
  period: GarboReportingPeriodSummary;
}) {
  const { t } = useI18n();
  const reportYear = getPeriodReportYear(period);
  const companyReportId =
    period.companyReportId?.trim() || period.companyReport?.id?.trim();

  if (!reportYear && !companyReportId) return null;

  const reportYearLabel = t("editor.singleCompanyView.pdfCatalogYearShort");
  const companyReportIdLabel = t(
    "editor.singleCompanyView.companyReportIdShort",
  );
  const noReportYearLabel = t("editor.singleCompanyView.noReportYear");

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

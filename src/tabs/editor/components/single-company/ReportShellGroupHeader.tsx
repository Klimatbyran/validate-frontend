import { useI18n } from "@/contexts/I18nContext";
import type { CompanyReportShellGroup } from "../../lib/company-report-shells";
import { UNLINKED_REPORT_SHELL_KEY } from "../../lib/company-report-shells";
import { editorSecondaryIdTextClass } from "../../lib/reporting-period-ui";

export function ReportShellGroupHeader({
  shell,
  periodCount,
}: {
  shell: CompanyReportShellGroup;
  periodCount: number;
}) {
  const { t } = useI18n();

  if (shell.shellKey === UNLINKED_REPORT_SHELL_KEY) {
    return (
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-01">
          {t("editor.periodEditor.unlinkedReportShell")}
        </div>
        <div className="text-xs text-gray-02 mt-1">
          {t("editor.periodEditor.reportShellPeriodCount", {
            count: periodCount,
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-gray-01">
          {shell.reportYear
            ? `${t("yearLabels.companyReportYear")}: ${shell.reportYear}`
            : t("editor.singleCompanyView.noReportYear")}
        </span>
        <span className="text-xs text-gray-02">
          {t("editor.periodEditor.reportShellPeriodCount", {
            count: periodCount,
          })}
        </span>
      </div>
      <div className={`mt-1.5 ${editorSecondaryIdTextClass}`}>
        {shell.companyReportId}
      </div>
    </div>
  );
}

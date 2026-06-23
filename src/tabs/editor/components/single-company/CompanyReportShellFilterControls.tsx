import { useI18n } from "@/contexts/I18nContext";
import { MultiSelectDropdown } from "@/ui/multi-select-dropdown";
import { editorDenseMultiSelectTriggerClass } from "../../lib/reporting-period-ui";
import {
  formatReportShellOptionLabel,
  type CompanyReportShellGroup,
} from "../../lib/company-report-shells";

export function CompanyReportShellFilterControls({
  shells,
  showAllReports,
  onShowAllReportsChange,
  selectedShellKeys,
  onSelectedShellKeysChange,
}: {
  shells: CompanyReportShellGroup[];
  showAllReports: boolean;
  onShowAllReportsChange: (showAll: boolean) => void;
  selectedShellKeys: string[];
  onSelectedShellKeysChange: (keys: string[]) => void;
}) {
  const { t } = useI18n();

  if (shells.length === 0) return null;

  const shellKeys = shells.map((shell) => shell.shellKey);
  const shellByKey = new Map(shells.map((shell) => [shell.shellKey, shell]));

  return (
    <>
      <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-01">
        <input
          type="checkbox"
          checked={showAllReports}
          onChange={(e) => onShowAllReportsChange(e.target.checked)}
          className="rounded border-gray-03"
        />
        {t("editor.periodEditor.showAllReports")}
      </label>
      <MultiSelectDropdown
        options={shellKeys}
        selectedIds={showAllReports ? [] : selectedShellKeys}
        onChange={(ids) => {
          onSelectedShellKeysChange(ids);
          if (ids.length > 0) onShowAllReportsChange(false);
        }}
        triggerLabel={t("editor.periodEditor.reportsTrigger")}
        emptyLabel={t("editor.periodEditor.allReports")}
        getOptionLabel={(shellKey) => {
          const shell = shellByKey.get(shellKey);
          if (!shell) return shellKey;
          return formatReportShellOptionLabel(shell, {
            reportYear: t("yearLabels.companyReportYear"),
            noReportYear: t("editor.singleCompanyView.noReportYear"),
            unlinkedShell: t("editor.periodEditor.unlinkedReportShell"),
            companyReportId: t("editor.singleCompanyView.companyReportId"),
          });
        }}
        triggerClassName={editorDenseMultiSelectTriggerClass}
        panelMinWidth={360}
      />
    </>
  );
}
